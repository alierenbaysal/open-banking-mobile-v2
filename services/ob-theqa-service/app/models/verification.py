"""THEQA verification request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class StartVerificationRequest(BaseModel):
    """Body for POST /theqa/verifications — begins a verification session.

    `customer_id` ties the THEQA identity assertion back to a BD customer.
    `purpose` records why strong auth was requested (onboarding, consent, etc.).
    """

    customer_id: str = Field(..., min_length=1, max_length=100)
    purpose: str = Field("onboarding", max_length=64)
    relay_state: str | None = Field(None, max_length=512)


class StartVerificationResponse(BaseModel):
    reference: UUID
    redirect_url: str
    status: str


class VerificationResult(BaseModel):
    reference: UUID
    customer_id: str
    purpose: str
    status: str  # pending | verified | failed
    national_id: str | None = None
    name_id: str | None = None
    attributes: dict[str, Any] | None = None
    error: str | None = None
    created_at: datetime
    completed_at: datetime | None = None
