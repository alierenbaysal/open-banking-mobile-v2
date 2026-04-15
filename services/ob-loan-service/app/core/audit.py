"""Loan audit-log helper. Every state transition writes a row."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

import asyncpg

from app.core.database import acquire
from app.core.logging import correlation_id_var, get_logger

logger = get_logger(__name__)


async def record(
    *,
    application_id: UUID | None,
    event_type: str,
    actor_type: str,
    actor_id: str | None,
    previous_state: str | None = None,
    new_state: str | None = None,
    details: dict[str, Any] | None = None,
    conn: asyncpg.Connection | None = None,
) -> None:
    """Append an audit row. Pass `conn` to enroll in an outer transaction."""
    payload = {
        "application_id": str(application_id) if application_id else None,
        "event_type": event_type,
        "actor_type": actor_type,
        "actor_id": actor_id,
        "previous_state": previous_state,
        "new_state": new_state,
        "details": details or {},
        "correlation_id": correlation_id_var.get(),
    }

    sql = """
        INSERT INTO loan_audit_log
            (application_id, event_type, actor_type, actor_id,
             previous_state, new_state, details, correlation_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    """
    args = (
        application_id,
        event_type,
        actor_type,
        actor_id,
        previous_state,
        new_state,
        json.dumps(details or {}),
        correlation_id_var.get(),
    )

    if conn is not None:
        await conn.execute(sql, *args)
    else:
        async with acquire() as c:
            await c.execute(sql, *args)

    logger.info("audit", **payload)
