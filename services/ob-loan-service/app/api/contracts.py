"""Contract read endpoint."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter

from app.core.auth import AuthedDealer
from app.core.database import acquire
from app.core.errors import ApplicationNotFound
from app.schemas.contract import Contract, ContractTerms
from app.schemas.money import Money

router = APIRouter(prefix="/loan-applications", tags=["Contracts"])


@router.get("/{application_id}/contract", response_model=Contract)
async def get_contract(application_id: UUID, principal: AuthedDealer) -> Contract:
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT c.*, a.dealer_id, d.interest_rate, d.tenor_months,
                   d.monthly_installment, d.total_repayable, d.approved_amount
              FROM loan_contracts c
              JOIN loan_applications a USING (application_id)
              JOIN loan_decisions d USING (application_id)
             WHERE c.application_id = $1 AND a.dealer_id = $2
            """,
            application_id, principal.tpp_id,
        )
    if row is None:
        raise ApplicationNotFound(f"No contract yet for application {application_id}")

    first_payment = row["signed_at"].date() + timedelta(days=30)
    return Contract(
        contract_id=row["contract_id"],
        application_id=row["application_id"],
        customer_id=row["customer_id"],
        signed_at=row["signed_at"],
        signature_method=row["signature_method"],
        terms=ContractTerms(
            principal=Money.from_decimal(row["approved_amount"]),
            interest_rate=float(row["interest_rate"]),
            tenor_months=row["tenor_months"],
            monthly_installment=Money.from_decimal(row["monthly_installment"]),
            total_repayable=Money.from_decimal(row["total_repayable"]),
            first_payment_date=first_payment,
        ),
    )
