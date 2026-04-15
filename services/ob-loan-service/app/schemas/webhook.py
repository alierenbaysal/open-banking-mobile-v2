"""Webhook schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class WebhookConfig(BaseModel):
    webhook_url: str
    events: list[str]


class WebhookConfigUpdate(BaseModel):
    webhook_url: HttpUrl


class WebhookSecretRotated(BaseModel):
    webhook_secret: str = Field(description="Shown once — store securely")


class WebhookDelivery(BaseModel):
    webhook_id: UUID
    event_type: str
    application_id: UUID | None = None
    status: Literal["pending", "delivered", "failed", "dead_letter"]
    delivery_attempts: int
    last_attempted_at: datetime | None = None
    delivered_at: datetime | None = None
    last_response_code: int | None = None
    last_error: str | None = None


class WebhookDeliveryList(BaseModel):
    items: list[WebhookDelivery]


class WebhookEventBody(BaseModel):
    """Body shape Bank Dhofar POSTs to the dealer's webhook_url."""
    event_id: UUID
    event_type: str
    occurred_at: datetime
    application_id: UUID | None = None
    data: dict[str, Any]
