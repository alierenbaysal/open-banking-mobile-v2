"""Loan-decision engine.

Pure function: given a customer + requested terms, compute approve/decline
+ pricing. All inputs are read from PostgreSQL (no external calls beyond
the Mala'a stub). All policy thresholds come from settings so they're
easy to tune without redeploy.

Decision algorithm (v1.0.0):
  1. Pull income + existing-debt obligations.
  2. Pull bureau score (Mala'a stub).
  3. Apply hard knockouts (income floor, score floor, default flag).
  4. Compute base rate from score band.
  5. Compute proposed monthly installment.
  6. Compute DBR-after-loan; if > cap, reduce principal until it fits
     or hit decline.
  7. Cap at income×multiplier and absolute max-loan policy.
  8. Persist decision row, mark application 'decided' or 'declined'.
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Literal
from uuid import UUID, uuid4

from app.config import settings
from app.core import audit
from app.core.database import acquire
from app.core.logging import get_logger
from app.core.metrics import applications_decided_total, decision_latency_seconds
from app.services import affordability, amortization, credit_bureau

logger = get_logger(__name__)

# Policy
RATE_BY_BAND = {
    "prime":      Decimal("4.500"),
    "near_prime": Decimal("5.500"),
    "sub_prime":  Decimal("8.500"),
}
SCORE_FLOOR = 600  # below this we decline outright


DeclineReason = Literal[
    "insufficient_income", "dbr_exceeded", "credit_score_low",
    "policy_exclusion", "below_min_loan", "above_max_loan",
    "active_default",
]


async def decide(application_id: UUID) -> dict[str, object]:
    """Run the engine for one application. Returns the persisted decision row.

    Idempotent: if a decision already exists, returns it.
    """
    start = time.perf_counter()

    async with acquire() as conn:
        # 1. load application
        app_row = await conn.fetchrow(
            "SELECT * FROM loan_applications WHERE application_id = $1 FOR UPDATE",
            application_id,
        )
        if app_row is None:
            raise ValueError(f"Application {application_id} not found")

        # If already decided, short-circuit.
        existing = await conn.fetchrow(
            "SELECT * FROM loan_decisions WHERE application_id = $1",
            application_id,
        )
        if existing is not None:
            return dict(existing)

        if app_row["customer_id"] is None:
            raise ValueError("Cannot decide before customer_id is bound (consent must be approved first)")

    customer_id = app_row["customer_id"]
    requested = Decimal(str(app_row["requested_amount"]))
    tenor = int(app_row["requested_tenor_months"])
    dealer_id = app_row["dealer_id"]
    environment = app_row["environment"]

    # 2. data fetches (parallel-friendly, but small)
    afford = await affordability.compute(customer_id)
    bureau = await credit_bureau.fetch_score(customer_id)

    decline_reasons: list[DeclineReason] = []

    # 3. hard knockouts
    if afford.monthly_income_omr < Decimal(str(settings.min_monthly_income_omr)):
        decline_reasons.append("insufficient_income")
    if bureau.has_active_defaults:
        decline_reasons.append("active_default")
    if bureau.score < SCORE_FLOOR:
        decline_reasons.append("credit_score_low")
    if requested < Decimal(str(settings.min_loan_omr)):
        decline_reasons.append("below_min_loan")
    if requested > Decimal(str(settings.max_loan_omr)):
        decline_reasons.append("above_max_loan")

    # 4. compute pricing if not knocked out
    rate = RATE_BY_BAND.get(bureau.band, RATE_BY_BAND["sub_prime"])

    # Will be filled if approved
    approved_amount = requested
    monthly = Decimal(0)
    total_rep = Decimal(0)
    total_int = Decimal(0)
    dbr_before = Decimal(0)
    dbr_after = Decimal(0)
    conditions: list[str] = []

    if not decline_reasons:
        # 5. compute initial DBR
        dbr_before = (
            afford.monthly_existing_debt_omr / afford.monthly_income_omr
            if afford.monthly_income_omr > 0 else Decimal(1)
        )

        # 6. iterative shrink: if DBR-with-loan > cap, reduce principal in 5%
        # steps until it fits, or fall back to decline.
        attempt = approved_amount
        for _ in range(20):
            monthly = amortization.monthly_installment(attempt, rate, tenor)
            dbr_after = (afford.monthly_existing_debt_omr + monthly) / afford.monthly_income_omr
            if dbr_after <= Decimal(str(settings.max_dbr)):
                approved_amount = attempt
                break
            attempt = (attempt * Decimal("0.95")).quantize(Decimal("1"))
            if attempt < Decimal(str(settings.min_loan_omr)):
                approved_amount = Decimal(0)
                break
        else:
            approved_amount = Decimal(0)

        if approved_amount == 0:
            decline_reasons.append("dbr_exceeded")
        else:
            # 7. cap at income × multiple
            cap = afford.monthly_income_omr * Decimal(str(settings.income_multiple_max))
            if approved_amount > cap:
                approved_amount = cap.quantize(Decimal("1"))
                monthly = amortization.monthly_installment(approved_amount, rate, tenor)
                dbr_after = (afford.monthly_existing_debt_omr + monthly) / afford.monthly_income_omr

            total_rep = amortization.total_repayable(monthly, tenor)
            total_int = amortization.total_interest(approved_amount, monthly, tenor)
            if approved_amount < requested:
                conditions.append(
                    f"Approved for OMR {approved_amount} (requested OMR {requested})"
                )

    decision_outcome = "declined" if decline_reasons else "approved"
    decision_id = uuid4()
    valid_until = datetime.now(timezone.utc) + timedelta(seconds=settings.decision_validity_seconds)

    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO loan_decisions (
                    decision_id, application_id, decision,
                    approved_amount, interest_rate, tenor_months,
                    monthly_installment, total_repayable, total_interest,
                    income_monthly, existing_debt_monthly,
                    dbr_before, dbr_after, credit_score, score_band,
                    decline_reasons, conditions,
                    valid_until, engine_version
                ) VALUES (
                    $1, $2, $3,
                    $4, $5, $6,
                    $7, $8, $9,
                    $10, $11,
                    $12, $13, $14, $15,
                    $16::jsonb, $17::jsonb,
                    $18, $19
                )
                """,
                decision_id, application_id, decision_outcome,
                approved_amount if decision_outcome == "approved" else None,
                rate if decision_outcome == "approved" else None,
                tenor if decision_outcome == "approved" else None,
                monthly if decision_outcome == "approved" else None,
                total_rep if decision_outcome == "approved" else None,
                total_int if decision_outcome == "approved" else None,
                afford.monthly_income_omr, afford.monthly_existing_debt_omr,
                dbr_before, dbr_after, bureau.score, bureau.band,
                _to_json(decline_reasons), _to_json(conditions),
                valid_until, settings.decision_engine_version,
            )

            new_state = "decided" if decision_outcome == "approved" else "declined"
            await conn.execute(
                "UPDATE loan_applications SET status = $1 WHERE application_id = $2",
                new_state, application_id,
            )
            await audit.record(
                application_id=application_id,
                event_type=f"application.{new_state}",
                actor_type="system",
                actor_id="decision-engine",
                previous_state="pending_decision",
                new_state=new_state,
                details={
                    "decision_id": str(decision_id),
                    "decision": decision_outcome,
                    "approved_amount": str(approved_amount) if decision_outcome == "approved" else None,
                    "rate": str(rate) if decision_outcome == "approved" else None,
                    "monthly": str(monthly) if decision_outcome == "approved" else None,
                    "income": str(afford.monthly_income_omr),
                    "existing_debt": str(afford.monthly_existing_debt_omr),
                    "dbr_after": str(dbr_after),
                    "score": bureau.score,
                    "score_band": bureau.band,
                    "decline_reasons": list(decline_reasons),
                },
                conn=conn,
            )

    elapsed = time.perf_counter() - start
    decision_latency_seconds.labels(decision=decision_outcome).observe(elapsed)
    applications_decided_total.labels(
        dealer_id=dealer_id, environment=environment, decision=decision_outcome,
    ).inc()
    logger.info(
        "decision.computed",
        application_id=str(application_id), customer_id=customer_id,
        decision=decision_outcome, score=bureau.score, dbr_after=str(dbr_after),
        elapsed_ms=round(elapsed * 1000, 2),
    )

    # Reload row for the caller
    async with acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM loan_decisions WHERE decision_id = $1", decision_id)
    return dict(row) if row else {}


def _to_json(value: list[str]) -> str:
    import json
    return json.dumps(value)
