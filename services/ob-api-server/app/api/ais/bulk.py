"""AISP Bulk resource endpoints — data across all accounts."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/aisp", tags=["AIS Bulk"])


def _consent_id(request: Request) -> str:
    return getattr(request.state, "bearer_token", "mock-consent")


@router.get("/balances")
async def get_all_balances(request: Request):
    adapter = get_adapter()
    return await adapter.get_all_balances(_consent_id(request))


@router.get("/transactions")
async def get_all_transactions(request: Request):
    adapter = get_adapter()
    return await adapter.get_all_transactions(_consent_id(request))


@router.get("/beneficiaries")
async def get_all_beneficiaries(request: Request):
    adapter = get_adapter()
    return await adapter.get_all_beneficiaries(_consent_id(request))


@router.get("/direct-debits")
async def get_all_direct_debits(request: Request):
    adapter = get_adapter()
    return await adapter.get_all_direct_debits(_consent_id(request))


@router.get("/standing-orders")
async def get_all_standing_orders(request: Request):
    adapter = get_adapter()
    return await adapter.get_all_standing_orders(_consent_id(request))


@router.get("/scheduled-payments")
async def get_all_scheduled_payments(request: Request):
    adapter = get_adapter()
    return await adapter.get_all_scheduled_payments(_consent_id(request))
