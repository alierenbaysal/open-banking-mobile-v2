"""CBPII Confirmation of Funds endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse, Response

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/cbpii", tags=["CoF"])


@router.post("/funds-confirmation-consents", status_code=201)
async def create_funds_confirmation_consent(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_funds_confirmation_consent(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/funds-confirmation-consents/{ConsentId}")
async def get_funds_confirmation_consent(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_funds_confirmation_consent(ConsentId)


@router.delete("/funds-confirmation-consents/{ConsentId}", status_code=204)
async def delete_funds_confirmation_consent(ConsentId: str):
    adapter = get_adapter()
    await adapter.delete_funds_confirmation_consent(ConsentId)
    return Response(status_code=204)


@router.post("/funds-confirmations", status_code=201)
async def check_funds(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.check_funds(body)
    return JSONResponse(status_code=201, content=result)
