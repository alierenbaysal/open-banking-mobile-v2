"""Decision read endpoints (the actual decision compute lives in services/decision_engine.py)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.core.auth import AuthedDealer
from app.core.database import acquire
from app.core.errors import ApplicationNotFound
from app.schemas.decision import Decision
from app.schemas.money import Money

router = APIRouter(prefix="/loan-applications", tags=["Decisions"])


@router.get("/{application_id}/decision", response_model=Decision)
async def get_decision(application_id: UUID, principal: AuthedDealer) -> Decision:
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT d.*, a.dealer_id
              FROM loan_decisions d
              JOIN loan_applications a USING (application_id)
             WHERE d.application_id = $1 AND a.dealer_id = $2
            """,
            application_id, principal.tpp_id,
        )
    if row is None:
        raise ApplicationNotFound(f"No decision yet for application {application_id}")

    return Decision(
        decision_id=row["decision_id"],
        application_id=row["application_id"],
        decision=row["decision"],
        approved_amount=Money.from_decimal(row["approved_amount"]) if row["approved_amount"] else None,
        interest_rate=float(row["interest_rate"]) if row["interest_rate"] is not None else None,
        tenor_months=row["tenor_months"],
        monthly_installment=Money.from_decimal(row["monthly_installment"]) if row["monthly_installment"] else None,
        total_repayable=Money.from_decimal(row["total_repayable"]) if row["total_repayable"] else None,
        total_interest=Money.from_decimal(row["total_interest"]) if row["total_interest"] else None,
        decline_reasons=row["decline_reasons"],
        conditions=row["conditions"],
        income_monthly=Money.from_decimal(row["income_monthly"]) if row["income_monthly"] else None,
        existing_debt_monthly=Money.from_decimal(row["existing_debt_monthly"]) if row["existing_debt_monthly"] else None,
        dbr_before=float(row["dbr_before"]) if row["dbr_before"] is not None else None,
        dbr_after=float(row["dbr_after"]) if row["dbr_after"] is not None else None,
        credit_score=row["credit_score"],
        score_band=row["score_band"],
        decided_at=row["decided_at"],
        valid_until=row["valid_until"],
        engine_version=row["engine_version"],
    )
