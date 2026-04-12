"""AISP Account Information endpoints — per-account resources."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.adapters.registry import get_adapter

router = APIRouter(prefix="/open-banking/v4.0/aisp", tags=["AIS Accounts"])

# Helper to extract consent_id from Bearer token (mock: token IS the consent_id)
def _consent_id(request: Request) -> str:
    return getattr(request.state, "bearer_token", "mock-consent")


@router.get("/accounts")
async def get_accounts(request: Request):
    adapter = get_adapter()
    return await adapter.get_accounts(_consent_id(request))


@router.get("/accounts/{AccountId}")
async def get_account(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_account(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/balances")
async def get_balances(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_balances(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/transactions")
async def get_transactions(
    AccountId: str,
    request: Request,
    fromBookingDateTime: str | None = None,
    toBookingDateTime: str | None = None,
):
    adapter = get_adapter()
    return await adapter.get_transactions(
        AccountId, _consent_id(request), fromBookingDateTime, toBookingDateTime
    )


@router.get("/accounts/{AccountId}/beneficiaries")
async def get_beneficiaries(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_beneficiaries(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/direct-debits")
async def get_direct_debits(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_direct_debits(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/standing-orders")
async def get_standing_orders(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_standing_orders(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/scheduled-payments")
async def get_scheduled_payments(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_scheduled_payments(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/statements")
async def get_statements(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_statements(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/statements/{StatementId}")
async def get_statement(AccountId: str, StatementId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_statement(AccountId, StatementId, _consent_id(request))


@router.get("/accounts/{AccountId}/statements/{StatementId}/transactions")
async def get_statement_transactions(AccountId: str, StatementId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_statement_transactions(AccountId, StatementId, _consent_id(request))


@router.get("/accounts/{AccountId}/product")
async def get_product(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_product(AccountId, _consent_id(request))


@router.get("/accounts/{AccountId}/party")
async def get_party(AccountId: str, request: Request):
    adapter = get_adapter()
    return await adapter.get_party(AccountId, _consent_id(request))
