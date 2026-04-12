"""Pydantic models for events."""

from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class EventStatus(StrEnum):
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class PublishEventRequest(BaseModel):
    """Body for POST /events — used by internal services to publish events."""

    tpp_id: str = Field(..., min_length=1, max_length=100)
    event_type: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    resource_id: str | None = Field(default=None, max_length=100)
    resource_type: str | None = Field(default=None, max_length=50)
    payload: dict[str, Any] = Field(default_factory=dict)


class AcknowledgeEventsRequest(BaseModel):
    """Body for DELETE /events/{tpp_id} — acknowledge (delete) polled events."""

    event_ids: list[UUID] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class EventResponse(BaseModel):
    """Single event record."""

    event_id: UUID
    tpp_id: str
    event_type: str
    subject: str
    resource_id: str | None = None
    resource_type: str | None = None
    payload: dict[str, Any]
    status: EventStatus
    delivery_attempts: int
    last_attempt_at: datetime | None = None
    delivered_at: datetime | None = None
    created_at: datetime


class EventListResponse(BaseModel):
    """Wrapper for polling endpoint — returns a list of events."""

    sets: list[EventResponse]
    more_available: bool
