"""Webhook config + delivery history endpoints."""

from __future__ import annotations

import secrets
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Query, status

from app.core import rate_limit
from app.core.auth import AuthedDealer
from app.core.database import acquire
from app.core.errors import WebhookNotFound
from app.schemas.webhook import (
    WebhookConfig,
    WebhookConfigUpdate,
    WebhookDelivery,
    WebhookDeliveryList,
    WebhookSecretRotated,
)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

EVENT_CATALOG = [
    "loan_application.decided",
    "loan_application.declined",
    "loan_application.contracted",
    "loan_application.disbursed",
    "loan_application.expired",
    "loan_application.cancelled",
]


@router.get("/me", response_model=WebhookConfig)
async def get_config(principal: AuthedDealer) -> WebhookConfig:
    return WebhookConfig(
        webhook_url=principal.webhook_url or "",
        events=EVENT_CATALOG,
    )


@router.put("/me", response_model=WebhookConfig)
async def update_config(body: WebhookConfigUpdate, principal: AuthedDealer) -> WebhookConfig:
    async with acquire() as conn:
        await conn.execute(
            "UPDATE tpp_registry SET webhook_url = $1 WHERE tpp_id = $2",
            str(body.webhook_url), principal.tpp_id,
        )
    return WebhookConfig(webhook_url=str(body.webhook_url), events=EVENT_CATALOG)


@router.post("/rotate-secret", response_model=WebhookSecretRotated, status_code=status.HTTP_200_OK)
async def rotate_secret(
    principal: AuthedDealer,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)],
) -> WebhookSecretRotated:
    await rate_limit.consume(principal.tpp_id)
    new_secret = secrets.token_urlsafe(48)
    async with acquire() as conn:
        await conn.execute(
            "UPDATE tpp_registry SET webhook_secret = $1 WHERE tpp_id = $2",
            new_secret, principal.tpp_id,
        )
    return WebhookSecretRotated(webhook_secret=new_secret)


@router.get("/deliveries", response_model=WebhookDeliveryList)
async def list_deliveries(
    principal: AuthedDealer,
    delivery_status: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> WebhookDeliveryList:
    sql = "SELECT * FROM dealer_webhooks WHERE dealer_id = $1"
    args: list[object] = [principal.tpp_id]
    if delivery_status:
        sql += " AND status = $2"
        args.append(delivery_status)
    sql += " ORDER BY created_at DESC LIMIT " + str(int(limit))

    async with acquire() as conn:
        rows = await conn.fetch(sql, *args)

    return WebhookDeliveryList(items=[
        WebhookDelivery(
            webhook_id=r["webhook_id"],
            event_type=r["event_type"],
            application_id=r["application_id"],
            status=r["status"],
            delivery_attempts=r["delivery_attempts"],
            last_attempted_at=r["last_attempted_at"],
            delivered_at=r["delivered_at"],
            last_response_code=r["last_response_code"],
            last_error=r["last_error"],
        ) for r in rows
    ])


@router.post("/replay/{webhook_id}", status_code=status.HTTP_202_ACCEPTED, response_model=WebhookDelivery)
async def replay(webhook_id: UUID, principal: AuthedDealer) -> WebhookDelivery:
    async with acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM dealer_webhooks WHERE webhook_id = $1 AND dealer_id = $2 FOR UPDATE",
            webhook_id, principal.tpp_id,
        )
        if row is None:
            raise WebhookNotFound(f"Webhook {webhook_id} not found")

        await conn.execute(
            """
            UPDATE dealer_webhooks
               SET status = 'pending', next_retry_at = NOW(), last_error = NULL
             WHERE webhook_id = $1
            """,
            webhook_id,
        )

    return WebhookDelivery(
        webhook_id=row["webhook_id"],
        event_type=row["event_type"],
        application_id=row["application_id"],
        status="pending",
        delivery_attempts=row["delivery_attempts"],
        last_attempted_at=row["last_attempted_at"],
        delivered_at=row["delivered_at"],
        last_response_code=row["last_response_code"],
        last_error=row["last_error"],
    )
