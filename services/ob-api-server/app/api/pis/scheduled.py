"""PISP Domestic Scheduled Payment execution and retrieval endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/pisp", tags=["PIS Scheduled"])


@router.post("/domestic-scheduled-payments", status_code=201)
async def execute_domestic_scheduled_payment(request: Request):
    body = await request.json()
    consent_id = body.get("Data", {}).get("ConsentId", "")
    adapter = get_adapter()
    result = await adapter.execute_domestic_scheduled_payment(body, consent_id)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-scheduled-payments/{DomesticScheduledPaymentId}")
async def get_domestic_scheduled_payment(DomesticScheduledPaymentId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_scheduled_payment(DomesticScheduledPaymentId)
