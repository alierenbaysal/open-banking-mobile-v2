"""Idempotency-Key handling.

Stored in PostgreSQL (not Redis) so the guarantee survives Redis flushes.
The key is scoped per-TPP — two TPPs can use the same key string without
collision.

Algorithm:
  1. On every state-changing request, require Idempotency-Key header.
  2. Hash the request (method, path, body) → request_hash.
  3. SELECT … WHERE (key, tpp_id) — if row exists with same hash, replay
     the stored response. If exists with different hash → 409 conflict.
  4. Otherwise: execute the handler, store (key, hash, response).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

from app.config import settings
from app.core.database import acquire


def hash_request(method: str, path: str, body: bytes) -> str:
    """Stable SHA-256 over the canonical request triple."""
    h = hashlib.sha256()
    h.update(method.upper().encode())
    h.update(b"\n")
    h.update(path.encode())
    h.update(b"\n")
    h.update(body)
    return h.hexdigest()


async def lookup(
    *,
    key: str,
    tpp_id: str,
    request_hash: str,
) -> tuple[int, dict[str, Any]] | None:
    """Return (status, body_dict) if a matching prior response exists.

    Raises ValueError if a row exists with the same key but a *different*
    request_hash — caller must turn that into HTTP 409.
    """
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT request_hash, response_status, response_body
              FROM idempotency_keys
             WHERE idempotency_key = $1 AND tpp_id = $2 AND expires_at > NOW()
            """,
            key, tpp_id,
        )
    if row is None:
        return None
    if row["request_hash"] != request_hash:
        raise ValueError("idempotency_conflict")
    return int(row["response_status"]), row["response_body"] or {}


async def store(
    *,
    key: str,
    tpp_id: str,
    request_hash: str,
    response_status: int,
    response_body: dict[str, Any],
) -> None:
    async with acquire() as conn:
        await conn.execute(
            """
            INSERT INTO idempotency_keys
                (idempotency_key, tpp_id, request_hash, response_status, response_body, expires_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, NOW() + ($6 || ' seconds')::interval)
            ON CONFLICT (idempotency_key, tpp_id) DO NOTHING
            """,
            key, tpp_id, request_hash, response_status,
            json.dumps(response_body), str(settings.idempotency_ttl_seconds),
        )
