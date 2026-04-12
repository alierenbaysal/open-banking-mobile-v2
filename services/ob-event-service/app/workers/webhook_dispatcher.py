"""Background webhook dispatcher.

Polls for pending events that have matching active subscriptions and
delivers them via HTTP POST to the TPP's callback_url.

Retry schedule (exponential backoff):
  Attempt 1: immediate
  Attempt 2: 1s delay
  Attempt 3: 5s delay
  Attempt 4: 30s delay
  Attempt 5: 5min delay
  After 5 failures: marked as failed

The dispatcher runs as an asyncio background task within the FastAPI process.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from uuid import UUID

import httpx

from app.config import settings
from app.services.event_service import get_pending_events, mark_delivery_attempt

logger = logging.getLogger(__name__)

# Backoff schedule in seconds, indexed by attempt number (0-based)
RETRY_BACKOFF = [0, 1, 5, 30, 300]

_running = False
_task: asyncio.Task | None = None


def _build_set_payload(event: dict) -> dict:
    """Build a Security Event Token (SET) payload for webhook delivery.

    This is a simplified JSON representation. In production this would
    be a signed JWS (JWT) per the OBIE spec.
    """
    payload = event["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)

    return {
        "iss": "https://ob.bankdhofar.com",
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "jti": str(event["event_id"]),
        "aud": event["tpp_id"],
        "sub": f"https://ob.bankdhofar.com/api/v4.0/{event.get('resource_type', 'resource')}/{event.get('resource_id', '')}",
        "txn": str(event["event_id"]),
        "toe": int(event["created_at"].timestamp()) if event.get("created_at") else None,
        "events": {
            event["event_type"]: {
                "subject": {
                    "subject_type": event.get("resource_type", ""),
                    "http://openbanking.org.uk/rid": event.get("resource_id", ""),
                    "http://openbanking.org.uk/rty": event.get("resource_type", ""),
                    "http://openbanking.org.uk/rlk": [
                        {
                            "version": "4.0",
                            "link": f"https://ob.bankdhofar.com/api/v4.0/{event.get('resource_type', 'resource')}/{event.get('resource_id', '')}",
                        }
                    ],
                },
                **payload,
            }
        },
    }


async def _deliver_event(client: httpx.AsyncClient, event: dict) -> bool:
    """Attempt to deliver a single event to the TPP callback URL.

    Returns True on success (2xx response), False otherwise.
    """
    callback_url = event["callback_url"]
    event_id: UUID = event["event_id"]
    set_payload = _build_set_payload(event)

    try:
        response = await client.post(
            callback_url,
            json=set_payload,
            headers={
                "Content-Type": "application/json",
                "X-Event-Id": str(event_id),
                "X-Event-Type": event["event_type"],
            },
            timeout=settings.webhook_timeout,
        )
        if 200 <= response.status_code < 300:
            logger.info(
                "Webhook delivered event=%s to %s (status=%d)",
                event_id,
                callback_url,
                response.status_code,
            )
            return True

        logger.warning(
            "Webhook delivery failed event=%s to %s (status=%d body=%s)",
            event_id,
            callback_url,
            response.status_code,
            response.text[:200],
        )
        return False
    except httpx.TimeoutException:
        logger.warning(
            "Webhook delivery timed out event=%s to %s (timeout=%ds)",
            event_id,
            callback_url,
            settings.webhook_timeout,
        )
        return False
    except httpx.RequestError as exc:
        logger.warning(
            "Webhook delivery error event=%s to %s: %s",
            event_id,
            callback_url,
            exc,
        )
        return False


async def _dispatch_cycle() -> int:
    """Run one dispatch cycle: fetch pending events and attempt delivery.

    Returns the number of events processed.
    """
    events = await get_pending_events(limit=50)
    if not events:
        return 0

    processed = 0
    async with httpx.AsyncClient() as client:
        for event in events:
            event_id = event["event_id"]
            attempt = event["delivery_attempts"]

            # Apply backoff delay based on attempt number
            if attempt > 0:
                delay = RETRY_BACKOFF[min(attempt, len(RETRY_BACKOFF) - 1)]
                # Check if enough time has passed since last attempt
                last_attempt = event.get("last_attempt_at")
                if last_attempt is not None:
                    elapsed = (datetime.now(timezone.utc) - last_attempt).total_seconds()
                    if elapsed < delay:
                        continue  # Skip — not ready for retry yet

            success = await _deliver_event(client, event)
            await mark_delivery_attempt(
                event_id=event_id,
                success=success,
                max_retries=settings.webhook_max_retries,
            )
            processed += 1

    return processed


async def run_dispatcher() -> None:
    """Main dispatcher loop. Runs until stopped."""
    global _running
    _running = True
    logger.info(
        "Webhook dispatcher started (poll_interval=%ds, max_retries=%d, timeout=%ds)",
        settings.dispatcher_poll_interval,
        settings.webhook_max_retries,
        settings.webhook_timeout,
    )

    while _running:
        try:
            count = await _dispatch_cycle()
            if count > 0:
                logger.info("Dispatch cycle processed %d events", count)
        except Exception:
            logger.exception("Dispatch cycle failed")

        await asyncio.sleep(settings.dispatcher_poll_interval)

    logger.info("Webhook dispatcher stopped")


def start_dispatcher() -> asyncio.Task:
    """Start the dispatcher as a background asyncio task."""
    global _task
    _task = asyncio.create_task(run_dispatcher())
    return _task


async def stop_dispatcher() -> None:
    """Signal the dispatcher to stop and wait for it to finish."""
    global _running, _task
    _running = False
    if _task is not None:
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
        _task = None
    logger.info("Webhook dispatcher task cleaned up")
