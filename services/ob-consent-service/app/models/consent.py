"""Pydantic models for consent CRUD and validation responses."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.core.state_machine import ConsentStatus, ConsentType


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class CreateConsentRequest(BaseModel):
    """Body for POST /consents."""

    consent_type: ConsentType
    tpp_id: str = Field(..., min_length=1, max_length=100)
    permissions: list[str] = Field(default_factory=list)
    expiration_time: datetime | None = None
    payment_details: dict[str, Any] | None = None
    control_parameters: dict[str, Any] | None = None
    risk_data: dict[str, Any] | None = None


class AuthorizeConsentRequest(BaseModel):
    """Body for POST /consents/{id}/authorize."""

    customer_id: str = Field(..., min_length=1, max_length=100)
    selected_accounts: list[str] | None = None


class RejectConsentRequest(BaseModel):
    """Body for POST /consents/{id}/reject."""

    customer_id: str | None = None
    reason: str | None = None


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class ConsentResponse(BaseModel):
    """Full consent record returned by GET / POST."""

    consent_id: UUID
    consent_type: ConsentType
    tpp_id: str
    customer_id: str | None = None
    permissions: list[str]
    selected_accounts: list[str] | None = None
    payment_details: dict[str, Any] | None = None
    control_parameters: dict[str, Any] | None = None
    status: ConsentStatus
    status_update_time: datetime
    creation_time: datetime
    expiration_time: datetime | None = None
    authorization_time: datetime | None = None
    revocation_time: datetime | None = None
    revocation_reason: str | None = None
    risk_data: dict[str, Any] | None = None


class ConsentValidationResponse(BaseModel):
    """Returned by the internal validation endpoint."""

    valid: bool
    consent_id: UUID
    consent_type: ConsentType
    status: ConsentStatus
    tpp_id: str
    customer_id: str | None = None
    permissions: list[str]
    selected_accounts: list[str] | None = None
    expiration_time: datetime | None = None
    reason: str | None = None


class ConsentHistoryEntry(BaseModel):
    """A single audit event for a consent."""

    id: int
    consent_id: UUID
    event_type: str
    event_time: datetime
    actor_type: str
    actor_id: str | None = None
    previous_status: str | None = None
    new_status: str | None = None
    details: dict[str, Any] | None = None
    ip_address: str | None = None
    user_agent: str | None = None
