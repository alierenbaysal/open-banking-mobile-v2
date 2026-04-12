"""Event publishing and polling endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.models.event import (
    AcknowledgeEventsRequest,
    EventListResponse,
    EventResponse,
    PublishEventRequest,
)
from app.services.event_service import (
    acknowledge_events,
    poll_events,
    publish_event,
)
from app.services.subscription_service import SubscriptionError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["events"])


@router.post("", response_model=EventResponse, status_code=201)
async def publish_event_endpoint(req: PublishEventRequest) -> EventResponse:
    """Publish an event (internal — called by other Qantara services)."""
    try:
        return await publish_event(req)
    except SubscriptionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/{tpp_id}", response_model=EventListResponse)
async def poll_events_endpoint(tpp_id: str) -> EventListResponse:
    """Poll pending events for a TPP.

    Returns events oldest-first, up to 100 per request.
    Use DELETE /events/{tpp_id} to acknowledge after processing.
    """
    return await poll_events(tpp_id)


@router.delete("/{tpp_id}")
async def acknowledge_events_endpoint(
    tpp_id: str,
    req: AcknowledgeEventsRequest | None = None,
) -> dict:
    """Acknowledge (mark as delivered) polled events.

    If request body contains event_ids, only those are acknowledged.
    If body is empty or omitted, all pending events for the TPP are acknowledged.
    """
    if req is None:
        req = AcknowledgeEventsRequest()
    count = await acknowledge_events(tpp_id, req)
    return {"acknowledged": count}
