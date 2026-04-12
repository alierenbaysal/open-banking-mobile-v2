"""AISP Account Access Consent endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request
from starlette.responses import JSONResponse, Response

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/aisp", tags=["AIS Consents"])


@router.post("/account-access-consents", status_code=201)
async def create_account_access_consent(request: Request):
    body = await request.json()
    adapter = get_adapter()
    result = await adapter.create_account_access_consent(body)
    return JSONResponse(status_code=201, content=result)


@router.get("/account-access-consents/{ConsentId}")
async def get_account_access_consent(ConsentId: str):
    adapter = get_adapter()
    return await adapter.get_account_access_consent(ConsentId)


@router.delete("/account-access-consents/{ConsentId}", status_code=204)
async def delete_account_access_consent(ConsentId: str):
    adapter = get_adapter()
    await adapter.delete_account_access_consent(ConsentId)
    return Response(status_code=204)
