"""Subscription CRUD logic backed by PostgreSQL."""

from __future__ import annotations

import logging
from uuid import UUID

from app.core.database import acquire
from app.models.subscription import (
    CreateSubscriptionRequest,
    SubscriptionResponse,
    UpdateSubscriptionRequest,
    VALID_EVENT_TYPES,
)

logger = logging.getLogger(__name__)


def _row_to_response(row: dict) -> SubscriptionResponse:
    """Convert an asyncpg Record (dict) to a SubscriptionResponse."""
    return SubscriptionResponse(
        subscription_id=row["subscription_id"],
        tpp_id=row["tpp_id"],
        callback_url=row["callback_url"],
        event_types=list(row["event_types"]),
        version=row["version"],
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


class SubscriptionError(Exception):
    """Raised when subscription operations fail."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _validate_event_types(event_types: list[str]) -> None:
    """Raise SubscriptionError if any event type is not recognised."""
    invalid = set(event_types) - VALID_EVENT_TYPES
    if invalid:
        raise SubscriptionError(
            f"Invalid event types: {', '.join(sorted(invalid))}. "
            f"Valid types: {', '.join(sorted(VALID_EVENT_TYPES))}"
        )


async def create_subscription(req: CreateSubscriptionRequest) -> SubscriptionResponse:
    """Insert a new event subscription."""
    _validate_event_types(req.event_types)

    sql = """
        INSERT INTO event_subscriptions (tpp_id, callback_url, event_types, version)
        VALUES ($1, $2, $3, $4)
        RETURNING subscription_id, tpp_id, callback_url, event_types,
                  version, status, created_at, updated_at
    """
    async with acquire() as conn:
        row = await conn.fetchrow(
            sql,
            req.tpp_id,
            req.callback_url,
            req.event_types,
            req.version,
        )
    logger.info("Created subscription %s for tpp_id=%s", row["subscription_id"], req.tpp_id)
    return _row_to_response(dict(row))


async def get_subscription(subscription_id: UUID) -> SubscriptionResponse:
    """Fetch a single subscription by ID."""
    sql = """
        SELECT subscription_id, tpp_id, callback_url, event_types,
               version, status, created_at, updated_at
        FROM event_subscriptions
        WHERE subscription_id = $1
    """
    async with acquire() as conn:
        row = await conn.fetchrow(sql, subscription_id)
    if row is None:
        raise SubscriptionError(f"Subscription {subscription_id} not found", status_code=404)
    return _row_to_response(dict(row))


async def list_subscriptions(tpp_id: str) -> list[SubscriptionResponse]:
    """Return all subscriptions for a given TPP."""
    sql = """
        SELECT subscription_id, tpp_id, callback_url, event_types,
               version, status, created_at, updated_at
        FROM event_subscriptions
        WHERE tpp_id = $1
        ORDER BY created_at DESC
    """
    async with acquire() as conn:
        rows = await conn.fetch(sql, tpp_id)
    return [_row_to_response(dict(r)) for r in rows]


async def update_subscription(
    subscription_id: UUID,
    req: UpdateSubscriptionRequest,
) -> SubscriptionResponse:
    """Partially update an existing subscription."""
    # Verify it exists first
    existing = await get_subscription(subscription_id)

    # Build dynamic SET clause from provided fields
    updates: dict[str, object] = {}
    if req.callback_url is not None:
        updates["callback_url"] = req.callback_url
    if req.event_types is not None:
        _validate_event_types(req.event_types)
        updates["event_types"] = req.event_types
    if req.version is not None:
        updates["version"] = req.version
    if req.status is not None:
        updates["status"] = req.status.value

    if not updates:
        return existing

    set_clauses = []
    params: list[object] = []
    for idx, (col, val) in enumerate(updates.items(), start=1):
        set_clauses.append(f"{col} = ${idx}")
        params.append(val)

    # updated_at always refreshed
    set_clauses.append(f"updated_at = NOW()")

    # subscription_id is the last parameter
    params.append(subscription_id)
    where_idx = len(params)

    sql = f"""
        UPDATE event_subscriptions
        SET {', '.join(set_clauses)}
        WHERE subscription_id = ${where_idx}
        RETURNING subscription_id, tpp_id, callback_url, event_types,
                  version, status, created_at, updated_at
    """
    async with acquire() as conn:
        row = await conn.fetchrow(sql, *params)

    logger.info("Updated subscription %s", subscription_id)
    return _row_to_response(dict(row))


async def delete_subscription(subscription_id: UUID) -> None:
    """Delete a subscription. Raises if not found."""
    sql = "DELETE FROM event_subscriptions WHERE subscription_id = $1 RETURNING subscription_id"
    async with acquire() as conn:
        row = await conn.fetchrow(sql, subscription_id)
    if row is None:
        raise SubscriptionError(f"Subscription {subscription_id} not found", status_code=404)
    logger.info("Deleted subscription %s", subscription_id)


async def get_active_subscriptions_for_event(
    tpp_id: str,
    event_type: str,
) -> list[SubscriptionResponse]:
    """Return active subscriptions for a TPP that include the given event type."""
    sql = """
        SELECT subscription_id, tpp_id, callback_url, event_types,
               version, status, created_at, updated_at
        FROM event_subscriptions
        WHERE tpp_id = $1
          AND status = 'Active'
          AND $2 = ANY(event_types)
    """
    async with acquire() as conn:
        rows = await conn.fetch(sql, tpp_id, event_type)
    return [_row_to_response(dict(r)) for r in rows]
