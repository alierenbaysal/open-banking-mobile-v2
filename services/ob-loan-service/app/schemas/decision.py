"""Decision schema (response)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.money import Money


class Decision(BaseModel):
    decision_id: UUID
    application_id: UUID
    decision: Literal["approved", "declined", "conditional"]
    approved_amount: Money | None = None
    interest_rate: float | None = None
    tenor_months: int | None = None
    monthly_installment: Money | None = None
    total_repayable: Money | None = None
    total_interest: Money | None = None
    decline_reasons: list[str] | None = None
    conditions: list[str] | None = None
    income_monthly: Money | None = None
    existing_debt_monthly: Money | None = None
    dbr_before: float | None = None
    dbr_after: float | None = None
    credit_score: int | None = None
    score_band: str | None = None
    decided_at: datetime
    valid_until: datetime
    engine_version: str
