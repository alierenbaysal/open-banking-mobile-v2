"""Audit trail: writes to consent_history for every state-changing event."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

import asyncpg

from app.core.database import acquire

logger = logging.getLogger(__name__)


async def record_event(
    consent_id: UUID,
    event_type: str,
    actor_type: str,
    actor_id: str | None = None,
    previous_status: str | None = None,
    new_status: str | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    conn: asyncpg.Connection | None = None,
) -> int:
    """Insert a consent_history row. Returns the new row id.

    If *conn* is provided the caller owns the transaction; otherwise we
    acquire our own connection.
    """
    sql = """
        INSERT INTO consent_history
            (consent_id, event_type, actor_type, actor_id,
             previous_status, new_status, details, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::inet, $9)
        RETURNING id
    """
    details_json = json.dumps(details) if details else None

    async def _insert(c: asyncpg.Connection) -> int:
        row = await c.fetchrow(
            sql,
            consent_id,
            event_type,
            actor_type,
            actor_id,
            previous_status,
            new_status,
            details_json,
            ip_address,
            user_agent,
        )
        return row["id"]  # type: ignore[index]

    if conn is not None:
        return await _insert(conn)

    async with acquire() as c:
        return await _insert(c)


async def get_history(consent_id: UUID) -> list[dict[str, Any]]:
    """Return all history entries for a consent, newest first."""
    sql = """
        SELECT id, consent_id, event_type, event_time, actor_type, actor_id,
               previous_status, new_status, details, ip_address::text, user_agent
        FROM consent_history
        WHERE consent_id = $1
        ORDER BY event_time DESC
    """
    async with acquire() as conn:
        rows = await conn.fetch(sql, consent_id)
    return [dict(r) for r in rows]
