"""OBIE v4.0 Event models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OBEventSubscription(BaseModel):
    EventSubscriptionId: str
    CallbackUrl: str | None = None
    Version: str = "4.0"
    EventTypes: list[str] = Field(default_factory=list)


class OBEventNotification(BaseModel):
    iss: str
    iat: int
    jti: str
    aud: str
    sub: str
    txn: str
    toe: int
    events: dict[str, Any] = Field(default_factory=dict)
