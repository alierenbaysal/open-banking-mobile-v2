"""Event subscription CRUD endpoints."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.models.subscription import (
    CreateSubscriptionRequest,
    SubscriptionResponse,
    UpdateSubscriptionRequest,
)
from app.services.subscription_service import (
    SubscriptionError,
    create_subscription,
    delete_subscription,
    get_subscription,
    list_subscriptions,
    update_subscription,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.post("", response_model=SubscriptionResponse, status_code=201)
async def create_subscription_endpoint(req: CreateSubscriptionRequest) -> SubscriptionResponse:
    """Create a new event subscription for a TPP."""
    try:
        return await create_subscription(req)
    except SubscriptionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("", response_model=list[SubscriptionResponse])
async def list_subscriptions_endpoint(
    tpp_id: str = Query(..., min_length=1, max_length=100),
) -> list[SubscriptionResponse]:
    """List all subscriptions for a given TPP."""
    return await list_subscriptions(tpp_id)


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription_endpoint(subscription_id: UUID) -> SubscriptionResponse:
    """Get a single subscription by ID."""
    try:
        return await get_subscription(subscription_id)
    except SubscriptionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription_endpoint(
    subscription_id: UUID,
    req: UpdateSubscriptionRequest,
) -> SubscriptionResponse:
    """Update an existing subscription."""
    try:
        return await update_subscription(subscription_id, req)
    except SubscriptionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.delete("/{subscription_id}", status_code=204)
async def delete_subscription_endpoint(subscription_id: UUID) -> None:
    """Delete a subscription."""
    try:
        await delete_subscription(subscription_id)
    except SubscriptionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
