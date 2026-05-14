"""Application lifecycle business logic.

Owns the state machine for loan_applications. Calls the decision engine
once a customer has approved consent, and the disbursement service once
a contract is signed.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from app.config import settings
from app.core import audit
from app.core.database import acquire
from app.core.errors import ApplicationNotFound, ApplicationStateConflict, ValidationError
from app.core.logging import get_logger
from app.schemas.application import (
    Application,
    CreateApplicationRequest,
    QrInfo,
    Vehicle,
)
from app.schemas.money import Money

logger = get_logger(__name__)

def _build_qr_payload(application_id: UUID, dealer_id: str) -> str:
    return f"bdonline://loan/apply?a={application_id}&d={dealer_id}"


def _validate_amounts(req: CreateApplicationRequest) -> None:
    price = req.vehicle.price.to_decimal()
    requested = req.requested_amount.to_decimal()
    down = req.down_payment.to_decimal()

    errors: list[dict[str, str]] = []

    if requested + down != price:
        errors.append({
            "field": "requested_amount",
            "message": f"requested_amount + down_payment must equal vehicle price ({price}); "
                       f"got {requested} + {down} = {requested + down}",
        })

    if requested < Decimal(str(settings.min_loan_omr)):
        errors.append({"field": "requested_amount", "message": f"Below minimum loan {settings.min_loan_omr}"})

    if requested > Decimal(str(settings.max_loan_omr)):
        errors.append({"field": "requested_amount", "message": f"Above maximum loan {settings.max_loan_omr}"})

    if errors:
        raise ValidationError("Loan parameters failed validation", errors=errors)


async def create_application(
    *,
    dealer_id: str,
    environment: str,
    req: CreateApplicationRequest,
) -> Application:
    """Insert a new application row and return its full representation."""
    _validate_amounts(req)

    application_id = uuid4()
    qr_payload = _build_qr_payload(application_id, dealer_id)
    qr_expires = datetime.now(timezone.utc) + timedelta(seconds=settings.qr_ttl_seconds)

    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO loan_applications (
                    application_id, dealer_id, dealer_reference, branch_code,
                    salesperson_email,
                    vehicle_vin, vehicle_make, vehicle_model, vehicle_year,
                    vehicle_condition, vehicle_price, vehicle_currency,
                    requested_amount, down_payment, requested_tenor_months,
                    status, qr_payload, qr_expires_at, environment
                ) VALUES (
                    $1, $2, $3, $4,
                    $5,
                    $6, $7, $8, $9,
                    $10, $11, $12,
                    $13, $14, $15,
                    'pending_consent', $16, $17, $18
                )
                """,
                application_id, dealer_id, req.dealer_reference, req.branch_code,
                req.salesperson_email,
                req.vehicle.vin, req.vehicle.make, req.vehicle.model, req.vehicle.year,
                req.vehicle.condition, req.vehicle.price.to_decimal(), req.vehicle.price.currency,
                req.requested_amount.to_decimal(), req.down_payment.to_decimal(), req.requested_tenor_months,
                qr_payload, qr_expires, environment,
            )
            await audit.record(
                application_id=application_id,
                event_type="application.created",
                actor_type="dealer",
                actor_id=dealer_id,
                new_state="pending_consent",
                details={
                    "vehicle": req.vehicle.model_dump(mode="json"),
                    "requested_amount": req.requested_amount.amount,
                    "tenor_months": req.requested_tenor_months,
                    "salesperson": req.salesperson_email,
                },
                conn=conn,
            )

    return await get_application(application_id, dealer_id)


async def get_application(application_id: UUID, dealer_id: str | None = None) -> Application:
    async with acquire() as conn:
        if dealer_id is not None:
            row = await conn.fetchrow(
                "SELECT * FROM loan_applications WHERE application_id = $1 AND dealer_id = $2",
                application_id, dealer_id,
            )
        else:
            row = await conn.fetchrow(
                "SELECT * FROM loan_applications WHERE application_id = $1",
                application_id,
            )

    if row is None:
        raise ApplicationNotFound(f"Application {application_id} not found")

    decision = await _maybe_load_decision(application_id)
    return _row_to_application(row, decision)


async def _maybe_load_decision(application_id: UUID) -> dict[str, Any] | None:
    async with acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM loan_decisions WHERE application_id = $1",
            application_id,
        )
    if row is None:
        return None
    return dict(row)


def _as_list(v: Any) -> list[str] | None:
    """JSONB columns come back as str sometimes when the codec isn't applied
    to the connection. Normalise to a list or None."""
    import json as _json
    if v is None:
        return None
    if isinstance(v, list):
        return v or None
    if isinstance(v, str):
        try:
            parsed = _json.loads(v)
            return parsed if isinstance(parsed, list) and parsed else None
        except Exception:
            return None
    return None


def _row_to_application(row: Any, decision: dict[str, Any] | None) -> Application:
    """Translate a DB row to the public Application schema."""
    from app.schemas.application import DecisionSummary
    decision_summary = None
    if decision:
        decision_summary = DecisionSummary(
            decision=decision["decision"],
            approved_amount=Money.from_decimal(decision["approved_amount"]) if decision["approved_amount"] else None,
            interest_rate=float(decision["interest_rate"]) if decision["interest_rate"] is not None else None,
            tenor_months=decision["tenor_months"],
            monthly_installment=Money.from_decimal(decision["monthly_installment"]) if decision["monthly_installment"] else None,
            total_repayable=Money.from_decimal(decision["total_repayable"]) if decision["total_repayable"] else None,
            total_interest=Money.from_decimal(decision["total_interest"]) if decision["total_interest"] else None,
            decline_reasons=_as_list(decision["decline_reasons"]),
            decided_at=decision["decided_at"],
            valid_until=decision["valid_until"],
        )

    return Application(
        application_id=row["application_id"],
        dealer_id=row["dealer_id"],
        dealer_reference=row["dealer_reference"],
        branch_code=row["branch_code"],
        salesperson_email=row["salesperson_email"],
        customer_id=row["customer_id"],
        vehicle=Vehicle(
            vin=row["vehicle_vin"],
            make=row["vehicle_make"],
            model=row["vehicle_model"],
            year=row["vehicle_year"],
            condition=row["vehicle_condition"],
            price=Money.from_decimal(row["vehicle_price"], row["vehicle_currency"]),
        ),
        requested_amount=Money.from_decimal(row["requested_amount"]),
        down_payment=Money.from_decimal(row["down_payment"]),
        requested_tenor_months=row["requested_tenor_months"],
        status=row["status"],
        qr=QrInfo(payload=row["qr_payload"], expires_at=row["qr_expires_at"]),
        decision=decision_summary,
        environment=row["environment"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


async def cancel_application(
    *,
    application_id: UUID,
    dealer_id: str,
    reason: str | None,
) -> Application:
    async with acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT status FROM loan_applications WHERE application_id = $1 AND dealer_id = $2 FOR UPDATE",
                application_id, dealer_id,
            )
            if row is None:
                raise ApplicationNotFound(f"Application {application_id} not found")

            current = row["status"]
            if current in ("disbursed", "cancelled", "expired"):
                raise ApplicationStateConflict(
                    f"Cannot cancel application in state {current!r}"
                )

            await conn.execute(
                """
                UPDATE loan_applications
                   SET status = 'cancelled',
                       cancelled_at = NOW(),
                       cancellation_reason = $1
                 WHERE application_id = $2
                """,
                reason, application_id,
            )
            await audit.record(
                application_id=application_id,
                event_type="application.cancelled",
                actor_type="dealer",
                actor_id=dealer_id,
                previous_state=current,
                new_state="cancelled",
                details={"reason": reason},
                conn=conn,
            )

    return await get_application(application_id, dealer_id)


async def list_applications(
    *,
    dealer_id: str,
    status: str | None,
    limit: int,
) -> list[Application]:
    sql = "SELECT * FROM loan_applications WHERE dealer_id = $1"
    args: list[Any] = [dealer_id]
    if status:
        sql += " AND status = $2"
        args.append(status)
    sql += " ORDER BY created_at DESC LIMIT " + str(int(limit))

    async with acquire() as conn:
        rows = await conn.fetch(sql, *args)

    apps = []
    for row in rows:
        decision = await _maybe_load_decision(row["application_id"])
        apps.append(_row_to_application(row, decision))
    return apps
