"""Contract schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.money import Money


class ContractTerms(BaseModel):
    principal: Money
    interest_rate: float
    tenor_months: int
    monthly_installment: Money
    total_repayable: Money
    first_payment_date: date


class Contract(BaseModel):
    contract_id: UUID
    application_id: UUID
    customer_id: str
    signed_at: datetime
    signature_method: Literal["otp_biometric", "theqa"]
    terms: ContractTerms
