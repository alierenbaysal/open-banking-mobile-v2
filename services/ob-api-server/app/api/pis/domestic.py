"""PISP Domestic Payment execution and retrieval endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/pisp", tags=["PIS Domestic"])


@router.post("/domestic-payments", status_code=201)
async def execute_domestic_payment(request: Request):
    body = await request.json()
    consent_id = body.get("Data", {}).get("ConsentId", "")
    adapter = get_adapter()
    result = await adapter.execute_domestic_payment(body, consent_id)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-payments/{DomesticPaymentId}")
async def get_domestic_payment(DomesticPaymentId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_payment(DomesticPaymentId)


@router.get("/domestic-payments/{DomesticPaymentId}/payment-details")
async def get_domestic_payment_details(DomesticPaymentId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_payment_details(DomesticPaymentId)
