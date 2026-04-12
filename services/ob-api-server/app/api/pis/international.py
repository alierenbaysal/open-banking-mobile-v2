"""PISP International Payment execution and retrieval endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/pisp", tags=["PIS International"])


@router.post("/international-payments", status_code=201)
async def execute_international_payment(request: Request):
    body = await request.json()
    consent_id = body.get("Data", {}).get("ConsentId", "")
    adapter = get_adapter()
    result = await adapter.execute_international_payment(body, consent_id)
    return JSONResponse(status_code=201, content=result)


@router.get("/international-payments/{InternationalPaymentId}")
async def get_international_payment(InternationalPaymentId: str):
    adapter = get_adapter()
    return await adapter.get_international_payment(InternationalPaymentId)
