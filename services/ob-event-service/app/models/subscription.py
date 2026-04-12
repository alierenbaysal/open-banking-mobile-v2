"""Pydantic models for event subscription CRUD."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class SubscriptionStatus(StrEnum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"


class EventType(StrEnum):
    """OBIE-compliant event type URNs."""

    RESOURCE_UPDATE = "urn:uk:org:openbanking:events:resource-update"
    CONSENT_REVOKED = "urn:uk:org:openbanking:events:consent-authorization-revoked"
    ACCOUNT_UPDATE = "urn:uk:org:openbanking:events:account-access-consent-linked-account-update"


VALID_EVENT_TYPES: set[str] = {e.value for e in EventType}


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class CreateSubscriptionRequest(BaseModel):
    """Body for POST /subscriptions."""

    tpp_id: str = Field(..., min_length=1, max_length=100)
    callback_url: str = Field(..., min_length=1)
    event_types: list[str] = Field(..., min_length=1)
    version: str = Field(default="4.0", max_length=10)


class UpdateSubscriptionRequest(BaseModel):
    """Body for PUT /subscriptions/{id}."""

    callback_url: str | None = Field(default=None, min_length=1)
    event_types: list[str] | None = Field(default=None, min_length=1)
    version: str | None = Field(default=None, max_length=10)
    status: SubscriptionStatus | None = None


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class SubscriptionResponse(BaseModel):
    """Full subscription record returned by GET / POST."""

    subscription_id: UUID
    tpp_id: str
    callback_url: str
    event_types: list[str]
    version: str
    status: SubscriptionStatus
    created_at: datetime
    updated_at: datetime
