"""Event subscription and polling endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse, Response

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/events", tags=["Events"])


# ── Event Subscriptions ─────────────────────────────────────────────────

@router.post("/event-subscriptions", status_code=201)
async def create_event_subscription(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_event_subscription(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/event-subscriptions")
async def get_event_subscriptions():
    adapter = get_adapter()
    return await adapter.get_event_subscriptions()


@router.get("/event-subscriptions/{EventSubscriptionId}")
async def get_event_subscription(EventSubscriptionId: str):
    adapter = get_adapter()
    return await adapter.get_event_subscription(EventSubscriptionId)


@router.put("/event-subscriptions/{EventSubscriptionId}")
async def update_event_subscription(EventSubscriptionId: str, request: Request):
    body = await request.json()
    adapter = get_adapter()
    return await adapter.update_event_subscription(EventSubscriptionId, body)


@router.delete("/event-subscriptions/{EventSubscriptionId}", status_code=204)
async def delete_event_subscription(EventSubscriptionId: str):
    adapter = get_adapter()
    await adapter.delete_event_subscription(EventSubscriptionId)
    return Response(status_code=204)


# ── Event Polling ───────────────────────────────────────────────────────

@router.post("")
async def acknowledge_events(request: Request):
    body = await request.json()
    adapter = get_adapter()
    await adapter.acknowledge_events(body)
    return Response(status_code=200)


@router.get("")
async def poll_events():
    adapter = get_adapter()
    return await adapter.poll_events()
