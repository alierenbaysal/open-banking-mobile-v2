"""Background webhook delivery worker.

Polls dealer_webhooks every 2s for `pending` rows where next_retry_at <= NOW().
For each: POSTs payload to dealer's target_url with HMAC-SHA256 signature.

Backoff schedule (s): 1, 5, 25, 125, 600, 3600, 21600, 86400 → dead_letter.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

import httpx

from app.config import settings
from app.core.database import acquire
from app.core.logging import get_logger
from app.core.metrics import webhook_delivery_total, webhook_pending_gauge

logger = get_logger(__name__)

BACKOFF_SECONDS = [1, 5, 25, 125, 600, 3600, 21600, 86400]
POLL_INTERVAL_SECONDS = 2.0


def sign_payload(secret: str, body: bytes) -> str:
    """Return HMAC-SHA256 hex digest in the format Stripe/GitHub use."""
    digest = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


async def webhook_loop() -> None:
    logger.info("webhook.worker.start", poll_interval=POLL_INTERVAL_SECONDS)
    while True:
        try:
            await _drain_one_batch()
            await _update_pending_gauge()
        except asyncio.CancelledError:
            logger.info("webhook.worker.stop")
            return
        except Exception:
            logger.exception("webhook.worker.iteration_error")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


async def _drain_one_batch(batch_size: int = 25) -> None:
    """Pick up to N pending rows due now, deliver each."""
    async with acquire() as conn:
        rows = await conn.fetch(
            """
            UPDATE dealer_webhooks
               SET status = 'pending'
             WHERE webhook_id IN (
                 SELECT webhook_id FROM dealer_webhooks
                  WHERE status = 'pending' AND next_retry_at <= NOW()
                  ORDER BY next_retry_at
                  LIMIT $1
                  FOR UPDATE SKIP LOCKED
             )
         RETURNING webhook_id, dealer_id, event_type, application_id, payload, target_url,
                   delivery_attempts, max_attempts
            """,
            batch_size,
        )
        # Pull dealer secrets (separate query, joined here for clarity)
        if rows:
            dealer_ids = list({r["dealer_id"] for r in rows})
            secrets_rows = await conn.fetch(
                "SELECT tpp_id, webhook_secret FROM tpp_registry WHERE tpp_id = ANY($1::text[])",
                dealer_ids,
            )
            secret_by_dealer = {s["tpp_id"]: s["webhook_secret"] for s in secrets_rows}

    if not rows:
        return

    await asyncio.gather(*[_deliver_one(dict(r), secret_by_dealer.get(r["dealer_id"])) for r in rows])


async def _deliver_one(row: dict[str, Any], secret: str | None) -> None:
    webhook_id: UUID = row["webhook_id"]
    target_url: str = row["target_url"]
    event_type: str = row["event_type"]
    dealer_id: str = row["dealer_id"]
    attempts: int = int(row["delivery_attempts"])
    max_attempts: int = int(row["max_attempts"])

    body_obj = {
        "event_id": str(uuid4()),
        "event_type": event_type,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "application_id": str(row["application_id"]) if row["application_id"] else None,
        "data": row["payload"] if isinstance(row["payload"], dict) else json.loads(row["payload"]),
    }
    body = json.dumps(body_obj, separators=(",", ":")).encode()
    signature = sign_payload(secret, body) if secret else ""

    headers = {
        "Content-Type": "application/json",
        "X-BD-Event-Type": event_type,
        "X-BD-Webhook-Id": str(webhook_id),
        "User-Agent": "BankDhofar-Webhooks/1.0",
    }
    if signature:
        headers["X-BD-Signature"] = signature

    response_code: int | None = None
    err: str | None = None
    delivered = False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(target_url, content=body, headers=headers)
        response_code = resp.status_code
        delivered = 200 <= resp.status_code < 300
        if not delivered:
            err = f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        err = f"{type(e).__name__}: {e}"

    new_attempts = attempts + 1

    async with acquire() as conn:
        if delivered:
            await conn.execute(
                """
                UPDATE dealer_webhooks
                   SET status = 'delivered', delivery_attempts = $1, delivered_at = NOW(),
                       last_attempted_at = NOW(), last_response_code = $2, last_error = NULL
                 WHERE webhook_id = $3
                """,
                new_attempts, response_code, webhook_id,
            )
            webhook_delivery_total.labels(dealer_id=dealer_id, event_type=event_type, outcome="delivered").inc()
            logger.info(
                "webhook.delivered",
                webhook_id=str(webhook_id), dealer_id=dealer_id, event_type=event_type,
                attempts=new_attempts, status=response_code,
            )
        elif new_attempts >= max_attempts:
            await conn.execute(
                """
                UPDATE dealer_webhooks
                   SET status = 'dead_letter', delivery_attempts = $1, last_attempted_at = NOW(),
                       last_response_code = $2, last_error = $3
                 WHERE webhook_id = $4
                """,
                new_attempts, response_code, err, webhook_id,
            )
            webhook_delivery_total.labels(dealer_id=dealer_id, event_type=event_type, outcome="dead_letter").inc()
            logger.error(
                "webhook.dead_letter",
                webhook_id=str(webhook_id), dealer_id=dealer_id, event_type=event_type,
                attempts=new_attempts, error=err,
            )
        else:
            backoff = BACKOFF_SECONDS[min(new_attempts - 1, len(BACKOFF_SECONDS) - 1)]
            next_retry = datetime.now(timezone.utc) + timedelta(seconds=backoff)
            await conn.execute(
                """
                UPDATE dealer_webhooks
                   SET status = 'pending', delivery_attempts = $1, last_attempted_at = NOW(),
                       last_response_code = $2, last_error = $3, next_retry_at = $4
                 WHERE webhook_id = $5
                """,
                new_attempts, response_code, err, next_retry, webhook_id,
            )
            webhook_delivery_total.labels(dealer_id=dealer_id, event_type=event_type, outcome="failed").inc()
            logger.warning(
                "webhook.retry_scheduled",
                webhook_id=str(webhook_id), dealer_id=dealer_id, event_type=event_type,
                attempts=new_attempts, next_retry_seconds=backoff, error=err,
            )


async def _update_pending_gauge() -> None:
    async with acquire() as conn:
        n = await conn.fetchval("SELECT COUNT(*) FROM dealer_webhooks WHERE status = 'pending'")
    webhook_pending_gauge.set(int(n or 0))
