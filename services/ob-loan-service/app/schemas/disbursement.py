"""Disbursement schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.money import Money


class Disbursement(BaseModel):
    disbursement_id: UUID
    application_id: UUID
    contract_id: UUID
    amount: Money
    dealer_account_id: str
    status: Literal["pending", "sent", "completed", "failed"]
    transaction_id: str | None = None
    executed_at: datetime | None = None
