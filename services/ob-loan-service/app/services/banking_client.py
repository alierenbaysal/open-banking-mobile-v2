"""Thin async client over ob-consent-service's banking endpoints.

We re-use the existing /banking/transfers + /banking/customers/* endpoints
to avoid duplicating money-movement logic. Internal cluster URL only.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class BankingClientError(Exception):
    pass


async def get_customer_primary_account(customer_id: str) -> str | None:
    """Return the customer's primary current-account ID (the salary account)."""
    url = f"{settings.banking_api_base_url}/customers/{customer_id}/accounts"
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url)
    if resp.status_code != 200:
        logger.warning("banking.list_accounts.failed", customer_id=customer_id, status=resp.status_code)
        return None
    accounts = resp.json()
    # Prefer Personal Current Account (where salary lands)
    for a in accounts:
        if a.get("account_type", "").lower() in ("currentaccount", "current account") \
           and "current" in (a.get("description", "") or "").lower():
            return a["account_id"]
    if accounts:
        return accounts[0]["account_id"]
    return None


async def execute_transfer(
    *,
    customer_id: str,
    source_account_id: str,
    target_account_id: str,
    amount: Decimal,
    currency: str = "OMR",
    reference: str,
    description: str = "",
) -> dict[str, Any]:
    url = f"{settings.banking_api_base_url}/transfers"
    payload = {
        "customer_id": customer_id,
        "source_account_id": source_account_id,
        "target_account_id": target_account_id,
        "amount": float(amount),
        "currency": currency,
        "reference": reference,
        "description": description,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(url, json=payload)
    if resp.status_code not in (200, 201):
        logger.error(
            "banking.transfer.failed",
            status=resp.status_code, body=resp.text[:200],
            source=source_account_id, target=target_account_id,
        )
        raise BankingClientError(f"Transfer failed: HTTP {resp.status_code}: {resp.text[:200]}")
    return resp.json()
