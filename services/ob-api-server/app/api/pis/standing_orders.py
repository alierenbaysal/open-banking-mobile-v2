"""PISP Domestic Standing Order execution and retrieval endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/pisp", tags=["PIS Standing Orders"])


@router.post("/domestic-standing-orders", status_code=201)
async def execute_domestic_standing_order(request: Request):
    body = await request.json()
    consent_id = body.get("Data", {}).get("ConsentId", "")
    adapter = get_adapter()
    result = await adapter.execute_domestic_standing_order(body, consent_id)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-standing-orders/{DomesticStandingOrderId}")
async def get_domestic_standing_order(DomesticStandingOrderId: str):
    adapter = get_adapter()
    return await adapter.get_domestic_standing_order(DomesticStandingOrderId)
