"""PISP Consent endpoints — domestic, scheduled, standing order, international."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/pisp", tags=["PIS Consents"])


# ── Domestic Payment Consents ───────────────────────────────────────────

@router.post("/domestic-payment-consents", status_code=201)
async def create_domestic_payment_consent(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_domestic_payment_consent(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-payment-consents/{ConsentId}")
async def get_domestic_payment_consent(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_payment_consent(ConsentId)


@router.get("/domestic-payment-consents/{ConsentId}/funds-confirmation")
async def get_domestic_payment_consent_funds(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_payment_consent_funds(ConsentId)


# ── Domestic Scheduled Payment Consents ─────────────────────────────────

@router.post("/domestic-scheduled-payment-consents", status_code=201)
async def create_domestic_scheduled_payment_consent(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_domestic_scheduled_payment_consent(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-scheduled-payment-consents/{ConsentId}")
async def get_domestic_scheduled_payment_consent(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_scheduled_payment_consent(ConsentId)


# ── Domestic Standing Order Consents ────────────────────────────────────

@router.post("/domestic-standing-order-consents", status_code=201)
async def create_domestic_standing_order_consent(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_domestic_standing_order_consent(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-standing-order-consents/{ConsentId}")
async def get_domestic_standing_order_consent(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_standing_order_consent(ConsentId)


# ── International Payment Consents ──────────────────────────────────────

@router.post("/international-payment-consents", status_code=201)
async def create_international_payment_consent(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_international_payment_consent(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/international-payment-consents/{ConsentId}")
async def get_international_payment_consent(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_international_payment_consent(ConsentId)
