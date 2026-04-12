"""Event creation, polling, and delivery tracking logic."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

from app.core.database import acquire
from app.models.event import (
    AcknowledgeEventsRequest,
    EventListResponse,
    EventResponse,
    EventStatus,
    PublishEventRequest,
)
from app.models.subscription import VALID_EVENT_TYPES
from app.services.subscription_service import SubscriptionError

logger = logging.getLogger(__name__)

# Maximum events returned per poll request
POLL_PAGE_SIZE = 100


def _row_to_response(row: dict) -> EventResponse:
    """Convert an asyncpg Record (dict) to an EventResponse."""
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    return EventResponse(
        event_id=row["event_id"],
        tpp_id=row["tpp_id"],
        event_type=row["event_type"],
        subject=row["subject"],
        resource_id=row["resource_id"],
        resource_type=row["resource_type"],
        payload=payload,
        status=row["status"],
        delivery_attempts=row["delivery_attempts"],
        last_attempt_at=row["last_attempt_at"],
        delivered_at=row["delivered_at"],
        created_at=row["created_at"],
    )


async def publish_event(req: PublishEventRequest) -> EventResponse:
    """Create a new event for a TPP.

    Validates the event type and inserts into the events table.
    The webhook dispatcher will pick it up for delivery.
    """
    if req.event_type not in VALID_EVENT_TYPES:
        raise SubscriptionError(
            f"Invalid event type: {req.event_type}. "
            f"Valid types: {', '.join(sorted(VALID_EVENT_TYPES))}"
        )

    sql = """
        INSERT INTO events (tpp_id, event_type, subject, resource_id, resource_type, payload)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING event_id, tpp_id, event_type, subject, resource_id, resource_type,
                  payload, status, delivery_attempts, last_attempt_at, delivered_at, created_at
    """
    async with acquire() as conn:
        row = await conn.fetchrow(
            sql,
            req.tpp_id,
            req.event_type,
            req.subject,
            req.resource_id,
            req.resource_type,
            json.dumps(req.payload),
        )
    logger.info(
        "Published event %s type=%s for tpp_id=%s",
        row["event_id"],
        req.event_type,
        req.tpp_id,
    )
    return _row_to_response(dict(row))


async def poll_events(tpp_id: str) -> EventListResponse:
    """Return pending events for a TPP, oldest first.

    Returns up to POLL_PAGE_SIZE events. The `more_available` flag indicates
    whether there are additional events beyond this page.
    """
    sql = """
        SELECT event_id, tpp_id, event_type, subject, resource_id, resource_type,
               payload, status, delivery_attempts, last_attempt_at, delivered_at, created_at
        FROM events
        WHERE tpp_id = $1 AND status = $2
        ORDER BY created_at ASC
        LIMIT $3
    """
    async with acquire() as conn:
        rows = await conn.fetch(sql, tpp_id, EventStatus.PENDING.value, POLL_PAGE_SIZE + 1)

    more_available = len(rows) > POLL_PAGE_SIZE
    events = [_row_to_response(dict(r)) for r in rows[:POLL_PAGE_SIZE]]
    return EventListResponse(sets=events, more_available=more_available)


async def acknowledge_events(tpp_id: str, req: AcknowledgeEventsRequest) -> int:
    """Mark events as delivered (acknowledged) after a TPP polls and confirms.

    If event_ids is empty, acknowledges all pending events for the TPP.
    Returns the number of events acknowledged.
    """
    now = datetime.now(timezone.utc)

    if req.event_ids:
        sql = """
            UPDATE events
            SET status = $1, delivered_at = $2
            WHERE tpp_id = $3 AND event_id = ANY($4) AND status = $5
        """
        async with acquire() as conn:
            result = await conn.execute(
                sql,
                EventStatus.DELIVERED.value,
                now,
                tpp_id,
                req.event_ids,
                EventStatus.PENDING.value,
            )
    else:
        sql = """
            UPDATE events
            SET status = $1, delivered_at = $2
            WHERE tpp_id = $3 AND status = $4
        """
        async with acquire() as conn:
            result = await conn.execute(
                sql,
                EventStatus.DELIVERED.value,
                now,
                tpp_id,
                EventStatus.PENDING.value,
            )

    # asyncpg returns "UPDATE N"
    count = int(result.split()[-1])
    logger.info("Acknowledged %d events for tpp_id=%s", count, tpp_id)
    return count


async def get_pending_events(limit: int = 50) -> list[dict]:
    """Fetch pending events that need webhook delivery.

    Returns raw dicts with subscription callback_url joined in.
    Used by the webhook dispatcher.
    """
    sql = """
        SELECT e.event_id, e.tpp_id, e.event_type, e.subject,
               e.resource_id, e.resource_type, e.payload,
               e.delivery_attempts, e.created_at,
               s.callback_url, s.subscription_id
        FROM events e
        JOIN event_subscriptions s
            ON s.tpp_id = e.tpp_id
           AND e.event_type = ANY(s.event_types)
           AND s.status = 'Active'
        WHERE e.status = 'pending'
          AND e.delivery_attempts < $1
        ORDER BY e.created_at ASC
        LIMIT $2
    """
    from app.config import settings

    async with acquire() as conn:
        rows = await conn.fetch(sql, settings.webhook_max_retries, limit)
    return [dict(r) for r in rows]


async def mark_delivery_attempt(
    event_id: UUID,
    success: bool,
    max_retries: int,
) -> None:
    """Record a delivery attempt. On success mark delivered; on final failure mark failed."""
    now = datetime.now(timezone.utc)

    if success:
        sql = """
            UPDATE events
            SET status = $1, delivered_at = $2, last_attempt_at = $2,
                delivery_attempts = delivery_attempts + 1
            WHERE event_id = $3
        """
        async with acquire() as conn:
            await conn.execute(sql, EventStatus.DELIVERED.value, now, event_id)
        logger.info("Event %s delivered successfully", event_id)
    else:
        # Increment attempt count; if at max, mark failed
        sql = """
            UPDATE events
            SET delivery_attempts = delivery_attempts + 1,
                last_attempt_at = $1,
                status = CASE
                    WHEN delivery_attempts + 1 >= $2 THEN $3
                    ELSE status
                END
            WHERE event_id = $4
        """
        async with acquire() as conn:
            await conn.execute(
                sql,
                now,
                max_retries,
                EventStatus.FAILED.value,
                event_id,
            )
        logger.warning("Event %s delivery failed (will retry if under max)", event_id)
