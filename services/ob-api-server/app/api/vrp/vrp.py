"""Variable Recurring Payments (VRP) endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse, Response

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/pisp", tags=["VRP"])


# ── VRP Consents ────────────────────────────────────────────────────────

@router.post("/domestic-vrp-consents", status_code=201)
async def create_vrp_consent(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_vrp_consent(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-vrp-consents/{ConsentId}")
async def get_vrp_consent(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_vrp_consent(ConsentId)


@router.delete("/domestic-vrp-consents/{ConsentId}", status_code=204)
async def delete_vrp_consent(ConsentId: str):
    adapter = get_adapter()
    await adapter.delete_vrp_consent(ConsentId)
    return Response(status_code=204)


@router.post("/domestic-vrp-consents/{ConsentId}/funds-confirmation", status_code=201)
async def vrp_funds_confirmation(ConsentId: str, request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.vrp_funds_confirmation(ConsentId, body)
    return JSONResponse(status_code=201, content=result)


# ── VRP Payments ────────────────────────────────────────────────────────

@router.post("/domestic-vrps", status_code=201)
async def execute_vrp(request: Request):
    body = await request.json()
    consent_id = body.get("Data", {}).get("ConsentId", "")
    adapter = get_adapter()
    result = await adapter.execute_vrp(body, consent_id)
    return JSONResponse(status_code=201, content=result)


@router.get("/domestic-vrps/{DomesticVRPId}")
async def get_vrp(DomesticVRPId: str):
    adapter = get_adapter()
    return await adapter.get_vrp(DomesticVRPId)
