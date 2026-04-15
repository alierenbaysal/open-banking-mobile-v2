"""Disbursement read endpoint."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.core.auth import AuthedDealer
from app.core.database import acquire
from app.core.errors import ApplicationNotFound
from app.schemas.disbursement import Disbursement
from app.schemas.money import Money

router = APIRouter(prefix="/loan-applications", tags=["Disbursements"])


@router.get("/{application_id}/disbursement", response_model=Disbursement)
async def get_disbursement(application_id: UUID, principal: AuthedDealer) -> Disbursement:
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT d.*, a.dealer_id
              FROM loan_disbursements d
              JOIN loan_applications a USING (application_id)
             WHERE d.application_id = $1 AND a.dealer_id = $2
            """,
            application_id, principal.tpp_id,
        )
    if row is None:
        raise ApplicationNotFound(f"No disbursement yet for application {application_id}")

    return Disbursement(
        disbursement_id=row["disbursement_id"],
        application_id=row["application_id"],
        contract_id=row["contract_id"],
        amount=Money.from_decimal(row["amount"]),
        dealer_account_id=row["dealer_account_id"],
        status=row["status"],
        transaction_id=row["transaction_id"],
        executed_at=row["executed_at"],
    )
