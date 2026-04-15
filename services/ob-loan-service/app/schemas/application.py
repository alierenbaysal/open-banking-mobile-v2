"""Application schemas (request + response)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.money import Money

ApplicationStatus = Literal[
    "pending_consent", "pending_decision", "decided", "declined",
    "contracted", "disbursed", "expired", "cancelled",
]


class Vehicle(BaseModel):
    vin: str | None = Field(default=None, max_length=50)
    make: str = Field(min_length=1, max_length=50)
    model: str = Field(min_length=1, max_length=100)
    year: int = Field(ge=1990, le=2030)
    condition: Literal["new", "used"] = "new"
    price: Money


class CreateApplicationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dealer_reference: str | None = Field(default=None, max_length=100)
    branch_code: str | None = Field(default=None, max_length=50)
    salesperson_email: EmailStr | None = None
    vehicle: Vehicle
    requested_amount: Money
    down_payment: Money
    requested_tenor_months: int = Field(ge=12, le=84)


class QrInfo(BaseModel):
    payload: str
    expires_at: datetime


class DecisionSummary(BaseModel):
    decision: Literal["approved", "declined", "conditional"]
    approved_amount: Money | None = None
    interest_rate: float | None = None
    tenor_months: int | None = None
    monthly_installment: Money | None = None
    total_repayable: Money | None = None
    total_interest: Money | None = None
    decline_reasons: list[str] | None = None
    decided_at: datetime
    valid_until: datetime


class Application(BaseModel):
    application_id: UUID
    dealer_id: str
    dealer_reference: str | None = None
    branch_code: str | None = None
    salesperson_email: str | None = None
    customer_id: str | None = None
    vehicle: Vehicle
    requested_amount: Money
    down_payment: Money
    requested_tenor_months: int
    status: ApplicationStatus
    qr: QrInfo
    decision: DecisionSummary | None = None
    environment: Literal["sandbox", "production"]
    created_at: datetime
    updated_at: datetime


class CancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class ApplicationListPage(BaseModel):
    items: list[Application]
    next_cursor: str | None = None
