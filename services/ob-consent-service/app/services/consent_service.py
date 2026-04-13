"""Consent lifecycle business logic.

Every mutation records an audit trail entry in the same transaction.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from app.config import settings
from app.core.database import acquire
from app.core.state_machine import (
    ConsentStatus,
    ConsentType,
    InvalidTransitionError,
    ONE_TIME_CONSENT_TYPES,
    validate_transition,
)
from app.models.consent import (
    AuthorizeConsentRequest,
    ConsentResponse,
    ConsentValidationResponse,
    CreateConsentRequest,
    RejectConsentRequest,
)
from app.services import audit_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_response(row: dict[str, Any]) -> ConsentResponse:
    """Map an asyncpg record (dict) to a ConsentResponse."""
    permissions = row["permissions"]
    if isinstance(permissions, str):
        permissions = json.loads(permissions)

    selected_accounts = row["selected_accounts"]
    if isinstance(selected_accounts, str):
        selected_accounts = json.loads(selected_accounts)

    payment_details = row["payment_details"]
    if isinstance(payment_details, str):
        payment_details = json.loads(payment_details)

    control_parameters = row["control_parameters"]
    if isinstance(control_parameters, str):
        control_parameters = json.loads(control_parameters)

    risk_data = row["risk_data"]
    if isinstance(risk_data, str):
        risk_data = json.loads(risk_data)

    return ConsentResponse(
        consent_id=row["consent_id"],
        consent_type=row["consent_type"],
        tpp_id=row["tpp_id"],
        customer_id=row["customer_id"],
        permissions=permissions,
        selected_accounts=selected_accounts,
        payment_details=payment_details,
        control_parameters=control_parameters,
        status=row["status"],
        status_update_time=row["status_update_time"],
        creation_time=row["creation_time"],
        expiration_time=row["expiration_time"],
        authorization_time=row["authorization_time"],
        revocation_time=row["revocation_time"],
        revocation_reason=row["revocation_reason"],
        risk_data=risk_data,
    )


def _default_expiry(consent_type: ConsentType) -> datetime | None:
    """Return the default expiration for a consent type, or None."""
    if consent_type in (ConsentType.AIS, ConsentType.COF):
        return datetime.now(timezone.utc) + timedelta(days=settings.consent_default_expiry_days)
    return None


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def create_consent(req: CreateConsentRequest) -> ConsentResponse:
    """Create a new consent in AwaitingAuthorisation state."""
    expiration = req.expiration_time or _default_expiry(req.consent_type)

    sql = """
        INSERT INTO consents
            (consent_type, tpp_id, permissions, payment_details,
             control_parameters, expiration_time, risk_data)
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7::jsonb)
        RETURNING *
    """
    async with acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                sql,
                req.consent_type.value,
                req.tpp_id,
                json.dumps(req.permissions),
                json.dumps(req.payment_details) if req.payment_details else None,
                json.dumps(req.control_parameters) if req.control_parameters else None,
                expiration,
                json.dumps(req.risk_data) if req.risk_data else None,
            )
            consent_id = row["consent_id"]
            await audit_service.record_event(
                consent_id=consent_id,
                event_type="CREATED",
                actor_type="TPP",
                actor_id=req.tpp_id,
                new_status=ConsentStatus.AWAITING_AUTHORISATION.value,
                details={"consent_type": req.consent_type.value, "permissions": req.permissions},
                conn=conn,
            )

    logger.info("Consent created: %s type=%s tpp=%s", consent_id, req.consent_type.value, req.tpp_id)
    return _row_to_response(dict(row))


async def get_consent(consent_id: UUID) -> ConsentResponse | None:
    """Retrieve a consent by ID."""
    sql = "SELECT * FROM consents WHERE consent_id = $1"
    async with acquire() as conn:
        row = await conn.fetchrow(sql, consent_id)
    if row is None:
        return None
    return _row_to_response(dict(row))


async def list_consents(
    customer_id: str | None = None,
    tpp_id: str | None = None,
    status_filter: str | None = None,
) -> list[ConsentResponse]:
    """List consents, optionally filtered by customer_id, tpp_id, or status."""
    conditions = []
    params = []
    idx = 1
    if customer_id:
        conditions.append(f"customer_id = ${idx}")
        params.append(customer_id)
        idx += 1
    if tpp_id:
        conditions.append(f"tpp_id = ${idx}")
        params.append(tpp_id)
        idx += 1
    if status_filter:
        conditions.append(f"status = ${idx}")
        params.append(status_filter)
        idx += 1

    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"SELECT * FROM consents{where} ORDER BY creation_time DESC LIMIT 100"
    async with acquire() as conn:
        rows = await conn.fetch(sql, *params)
    return [_row_to_response(dict(r)) for r in rows]


async def authorize_consent(consent_id: UUID, req: AuthorizeConsentRequest) -> ConsentResponse:
    """Customer authorizes a consent.

    Transitions: AwaitingAuthorisation -> Authorised.
    """
    now = datetime.now(timezone.utc)

    async with acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT * FROM consents WHERE consent_id = $1 FOR UPDATE",
                consent_id,
            )
            if row is None:
                raise ValueError(f"Consent {consent_id} not found")

            current_status = ConsentStatus(row["status"])
            validate_transition(current_status, ConsentStatus.AUTHORISED)

            updated = await conn.fetchrow(
                """
                UPDATE consents
                SET status = $1,
                    status_update_time = $2,
                    customer_id = $3,
                    selected_accounts = $4::jsonb,
                    authorization_time = $2
                WHERE consent_id = $5
                RETURNING *
                """,
                ConsentStatus.AUTHORISED.value,
                now,
                req.customer_id,
                json.dumps(req.selected_accounts) if req.selected_accounts else None,
                consent_id,
            )

            await audit_service.record_event(
                consent_id=consent_id,
                event_type="AUTHORISED",
                actor_type="CUSTOMER",
                actor_id=req.customer_id,
                previous_status=current_status.value,
                new_status=ConsentStatus.AUTHORISED.value,
                details={"selected_accounts": req.selected_accounts},
                conn=conn,
            )

    logger.info("Consent authorised: %s by customer %s", consent_id, req.customer_id)
    return _row_to_response(dict(updated))


async def reject_consent(consent_id: UUID, req: RejectConsentRequest) -> ConsentResponse:
    """Customer (or timeout) rejects a consent.

    Transitions: AwaitingAuthorisation -> Rejected.
    """
    now = datetime.now(timezone.utc)

    async with acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT * FROM consents WHERE consent_id = $1 FOR UPDATE",
                consent_id,
            )
            if row is None:
                raise ValueError(f"Consent {consent_id} not found")

            current_status = ConsentStatus(row["status"])
            validate_transition(current_status, ConsentStatus.REJECTED)

            updated = await conn.fetchrow(
                """
                UPDATE consents
                SET status = $1,
                    status_update_time = $2,
                    revocation_reason = $3
                WHERE consent_id = $4
                RETURNING *
                """,
                ConsentStatus.REJECTED.value,
                now,
                req.reason,
                consent_id,
            )

            actor_id = req.customer_id or "SYSTEM"
            actor_type = "CUSTOMER" if req.customer_id else "SYSTEM"
            await audit_service.record_event(
                consent_id=consent_id,
                event_type="REJECTED",
                actor_type=actor_type,
                actor_id=actor_id,
                previous_status=current_status.value,
                new_status=ConsentStatus.REJECTED.value,
                details={"reason": req.reason},
                conn=conn,
            )

    logger.info("Consent rejected: %s reason=%s", consent_id, req.reason)
    return _row_to_response(dict(updated))


async def revoke_consent(consent_id: UUID, actor_type: str = "TPP", actor_id: str | None = None, reason: str | None = None) -> ConsentResponse:
    """Revoke an authorised consent.

    Transitions: Authorised -> Revoked.
    """
    now = datetime.now(timezone.utc)

    async with acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT * FROM consents WHERE consent_id = $1 FOR UPDATE",
                consent_id,
            )
            if row is None:
                raise ValueError(f"Consent {consent_id} not found")

            current_status = ConsentStatus(row["status"])
            validate_transition(current_status, ConsentStatus.REVOKED)

            updated = await conn.fetchrow(
                """
                UPDATE consents
                SET status = $1,
                    status_update_time = $2,
                    revocation_time = $2,
                    revocation_reason = $3
                WHERE consent_id = $4
                RETURNING *
                """,
                ConsentStatus.REVOKED.value,
                now,
                reason,
                consent_id,
            )

            await audit_service.record_event(
                consent_id=consent_id,
                event_type="REVOKED",
                actor_type=actor_type,
                actor_id=actor_id,
                previous_status=current_status.value,
                new_status=ConsentStatus.REVOKED.value,
                details={"reason": reason},
                conn=conn,
            )

    logger.info("Consent revoked: %s by %s/%s", consent_id, actor_type, actor_id)
    return _row_to_response(dict(updated))


async def consume_consent(consent_id: UUID) -> ConsentResponse:
    """Mark a one-time consent as consumed.

    Transitions: Authorised -> Consumed (PIS only).
    """
    now = datetime.now(timezone.utc)

    async with acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT * FROM consents WHERE consent_id = $1 FOR UPDATE",
                consent_id,
            )
            if row is None:
                raise ValueError(f"Consent {consent_id} not found")

            consent_type = ConsentType(row["consent_type"])
            if consent_type not in ONE_TIME_CONSENT_TYPES:
                raise ValueError(f"Consent type {consent_type.value} is not one-time-use")

            current_status = ConsentStatus(row["status"])
            validate_transition(current_status, ConsentStatus.CONSUMED)

            updated = await conn.fetchrow(
                """
                UPDATE consents
                SET status = $1, status_update_time = $2
                WHERE consent_id = $3
                RETURNING *
                """,
                ConsentStatus.CONSUMED.value,
                now,
                consent_id,
            )

            await audit_service.record_event(
                consent_id=consent_id,
                event_type="CONSUMED",
                actor_type="SYSTEM",
                previous_status=current_status.value,
                new_status=ConsentStatus.CONSUMED.value,
                conn=conn,
            )

    logger.info("Consent consumed: %s", consent_id)
    return _row_to_response(dict(updated))


# ---------------------------------------------------------------------------
# Validation (called by ob-api-server on every request)
# ---------------------------------------------------------------------------

async def validate_consent(
    consent_id: UUID,
    required_permission: str | None = None,
    account_id: str | None = None,
) -> ConsentValidationResponse:
    """Validate a consent for an incoming API request.

    Checks: exists, status == Authorised, not expired, permission granted,
    account in selected_accounts.
    """
    consent = await get_consent(consent_id)
    if consent is None:
        return ConsentValidationResponse(
            valid=False,
            consent_id=consent_id,
            consent_type=ConsentType.AIS,  # placeholder
            status=ConsentStatus.REJECTED,
            tpp_id="",
            permissions=[],
            reason="Consent not found",
        )

    # Must be Authorised
    if consent.status != ConsentStatus.AUTHORISED:
        return ConsentValidationResponse(
            valid=False,
            consent_id=consent.consent_id,
            consent_type=consent.consent_type,
            status=consent.status,
            tpp_id=consent.tpp_id,
            customer_id=consent.customer_id,
            permissions=consent.permissions,
            selected_accounts=consent.selected_accounts,
            expiration_time=consent.expiration_time,
            reason=f"Consent status is {consent.status.value}, expected Authorised",
        )

    # Check expiration
    if consent.expiration_time and consent.expiration_time <= datetime.now(timezone.utc):
        # Expire it in the background (best effort)
        try:
            await _expire_single(consent.consent_id)
        except Exception:
            logger.warning("Failed to expire consent %s during validation", consent.consent_id, exc_info=True)

        return ConsentValidationResponse(
            valid=False,
            consent_id=consent.consent_id,
            consent_type=consent.consent_type,
            status=ConsentStatus.EXPIRED,
            tpp_id=consent.tpp_id,
            customer_id=consent.customer_id,
            permissions=consent.permissions,
            selected_accounts=consent.selected_accounts,
            expiration_time=consent.expiration_time,
            reason="Consent has expired",
        )

    # Check permission
    if required_permission and required_permission not in consent.permissions:
        return ConsentValidationResponse(
            valid=False,
            consent_id=consent.consent_id,
            consent_type=consent.consent_type,
            status=consent.status,
            tpp_id=consent.tpp_id,
            customer_id=consent.customer_id,
            permissions=consent.permissions,
            selected_accounts=consent.selected_accounts,
            expiration_time=consent.expiration_time,
            reason=f"Permission '{required_permission}' not granted",
        )

    # Check account access
    if account_id and consent.selected_accounts and account_id not in consent.selected_accounts:
        return ConsentValidationResponse(
            valid=False,
            consent_id=consent.consent_id,
            consent_type=consent.consent_type,
            status=consent.status,
            tpp_id=consent.tpp_id,
            customer_id=consent.customer_id,
            permissions=consent.permissions,
            selected_accounts=consent.selected_accounts,
            expiration_time=consent.expiration_time,
            reason=f"Account '{account_id}' not in selected accounts",
        )

    return ConsentValidationResponse(
        valid=True,
        consent_id=consent.consent_id,
        consent_type=consent.consent_type,
        status=consent.status,
        tpp_id=consent.tpp_id,
        customer_id=consent.customer_id,
        permissions=consent.permissions,
        selected_accounts=consent.selected_accounts,
        expiration_time=consent.expiration_time,
    )


# ---------------------------------------------------------------------------
# Expiration
# ---------------------------------------------------------------------------

async def _expire_single(consent_id: UUID) -> None:
    """Transition a single consent to Expired."""
    now = datetime.now(timezone.utc)
    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE consents
                SET status = $1, status_update_time = $2
                WHERE consent_id = $3 AND status = 'Authorised'
                """,
                ConsentStatus.EXPIRED.value,
                now,
                consent_id,
            )
            await audit_service.record_event(
                consent_id=consent_id,
                event_type="EXPIRED",
                actor_type="SYSTEM",
                previous_status=ConsentStatus.AUTHORISED.value,
                new_status=ConsentStatus.EXPIRED.value,
                conn=conn,
            )


async def expire_stale_consents() -> int:
    """Expire all authorised consents past their expiration_time. Returns count."""
    now = datetime.now(timezone.utc)
    sql = """
        UPDATE consents
        SET status = 'Expired', status_update_time = $1
        WHERE status = 'Authorised'
          AND expiration_time IS NOT NULL
          AND expiration_time <= $1
        RETURNING consent_id
    """
    async with acquire() as conn:
        async with conn.transaction():
            rows = await conn.fetch(sql, now)
            for row in rows:
                await audit_service.record_event(
                    consent_id=row["consent_id"],
                    event_type="EXPIRED",
                    actor_type="SYSTEM",
                    previous_status=ConsentStatus.AUTHORISED.value,
                    new_status=ConsentStatus.EXPIRED.value,
                    conn=conn,
                )
    count = len(rows)
    if count:
        logger.info("Expired %d stale consents", count)
    return count
