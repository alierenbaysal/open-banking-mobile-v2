"""THEQA verification session persistence and lifecycle.

A verification session is created when a customer starts strong auth, keyed by
a `reference` UUID that travels through the SAML flow as RelayState. The ACS
callback looks the session up, stores the asserted identity, and marks it
verified/failed. The mobile app polls the result by reference.

National identity attributes are sensitive — they are stored server-side and
never placed in the deep link returned to the app.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.core.database import acquire
from app.models.verification import VerificationResult

logger = logging.getLogger(__name__)


async def create_session(customer_id: str, purpose: str, relay_state: str | None) -> UUID:
    reference = uuid4()
    async with acquire() as conn:
        await conn.execute(
            """
            INSERT INTO theqa_verifications
                (reference, customer_id, purpose, relay_state, status)
            VALUES ($1, $2, $3, $4, 'pending')
            """,
            reference, customer_id, purpose, relay_state,
        )
    logger.info("Created THEQA verification session %s for customer %s", reference, customer_id)
    return reference


async def get_session(reference: UUID) -> VerificationResult | None:
    async with acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM theqa_verifications WHERE reference = $1", reference
        )
    if row is None:
        return None
    return _row_to_result(row)


async def complete_session(
    reference: UUID,
    *,
    national_id: str | None,
    name_id: str | None,
    attributes: dict[str, Any],
) -> VerificationResult | None:
    """Mark a session verified and store the asserted identity."""
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE theqa_verifications
               SET status = 'verified',
                   national_id = $2,
                   name_id = $3,
                   attributes = $4::jsonb,
                   completed_at = $5
             WHERE reference = $1 AND status = 'pending'
            RETURNING *
            """,
            reference, national_id, name_id, json.dumps(attributes),
            datetime.now(timezone.utc),
        )
    if row is None:
        logger.warning("complete_session: %s not found or not pending", reference)
        return None
    return _row_to_result(row)


async def fail_session(reference: UUID, error: str) -> VerificationResult | None:
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE theqa_verifications
               SET status = 'failed', error = $2, completed_at = $3
             WHERE reference = $1 AND status = 'pending'
            RETURNING *
            """,
            reference, error[:1000], datetime.now(timezone.utc),
        )
    return _row_to_result(row) if row else None


def _row_to_result(row: Any) -> VerificationResult:
    attrs = row["attributes"]
    if isinstance(attrs, str):
        attrs = json.loads(attrs)
    return VerificationResult(
        reference=row["reference"],
        customer_id=row["customer_id"],
        purpose=row["purpose"],
        status=row["status"],
        national_id=row["national_id"],
        name_id=row["name_id"],
        attributes=attrs,
        error=row["error"],
        created_at=row["created_at"],
        completed_at=row["completed_at"],
    )
