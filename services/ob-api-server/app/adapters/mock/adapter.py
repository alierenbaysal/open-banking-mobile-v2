"""Mock adapter — returns synthetic OBIE-compliant data for all 64 endpoints.

Accounts, balances, and transactions are served from the Banking API (PostgreSQL)
via the consent service.  All other resources (beneficiaries, statements, etc.)
still use in-memory fixtures.
"""

from __future__ import annotations

import copy
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx

from app.adapters.base import OBIEAdapter
from app.adapters.mock import data as fixtures
from app.core.errors import not_found, bad_request
from app.config import settings

_TZ_OMAN = timezone(timedelta(hours=4))
logger = logging.getLogger(__name__)

_BANKING_BASE = f"{settings.consent_service_url}/banking"


def _now() -> str:
    return datetime.now(_TZ_OMAN).isoformat()


def _uuid() -> str:
    return str(uuid.uuid4())


def _to_obie_account(row: dict) -> dict:
    """Transform a Banking API account row to OBIE format."""
    acct_type = row.get("account_type", "")
    if "Current" in acct_type or "Savings" in acct_type:
        obie_type = "Personal"
    else:
        obie_type = "Business"
    first = row.get("first_name", "")
    last = row.get("last_name", "")
    return {
        "AccountId": row["account_id"],
        "Currency": row.get("currency", "OMR"),
        "AccountType": obie_type,
        "AccountSubType": acct_type,
        "Description": row.get("description", ""),
        "Status": row.get("status", "Enabled"),
        "Account": [
            {
                "SchemeName": "IBAN",
                "Identification": row.get("iban", ""),
                "Name": f"{first} {last}".strip(),
            }
        ],
    }


def _to_obie_balance(row: dict, account_id: str) -> dict:
    """Transform a Banking API balance row to OBIE format."""
    balance = float(row.get("balance", 0))
    return {
        "AccountId": account_id,
        "Amount": {"Amount": f"{balance:.3f}", "Currency": row.get("currency", "OMR")},
        "CreditDebitIndicator": "Credit" if balance >= 0 else "Debit",
        "Type": "InterimAvailable",
        "DateTime": _now(),
        "CreditLine": [],
    }


def _to_obie_transaction(row: dict) -> dict:
    """Transform a Banking API transaction row to OBIE format."""
    amount = float(row.get("amount", 0))
    balance_after = float(row.get("balance_after", 0))
    created_at = row.get("created_at", "")
    if isinstance(created_at, str):
        dt_str = created_at
    else:
        dt_str = created_at.isoformat() if created_at else _now()
    return {
        "AccountId": row.get("account_id", ""),
        "TransactionId": row.get("transaction_id", ""),
        "TransactionReference": row.get("reference", ""),
        "Amount": {"Amount": f"{abs(amount):.3f}", "Currency": row.get("currency", "OMR")},
        "CreditDebitIndicator": row.get("direction", "Debit"),
        "Status": row.get("status", "Booked"),
        "BookingDateTime": dt_str,
        "TransactionInformation": row.get("description", ""),
        "Balance": {
            "Amount": {"Amount": f"{abs(balance_after):.3f}", "Currency": row.get("currency", "OMR")},
            "CreditDebitIndicator": "Credit" if balance_after >= 0 else "Debit",
            "Type": "InterimBooked",
        },
    }


class MockAdapter(OBIEAdapter):
    """Hybrid adapter: accounts/balances/transactions from Banking API, rest from fixtures."""

    def __init__(self) -> None:
        # Fixtures still used for supplementary AIS resources
        self._direct_debits: dict[str, list[dict]] = copy.deepcopy(fixtures.DIRECT_DEBITS)
        self._standing_orders: dict[str, list[dict]] = copy.deepcopy(fixtures.STANDING_ORDERS)
        self._scheduled_payments: dict[str, list[dict]] = copy.deepcopy(fixtures.SCHEDULED_PAYMENTS)
        self._statements: dict[str, list[dict]] = copy.deepcopy(fixtures.STATEMENTS)
        self._products: dict[str, dict] = copy.deepcopy(fixtures.PRODUCTS)
        self._parties: dict[str, dict] = copy.deepcopy(fixtures.PARTIES)

        # Mutable stores for consents, payments, VRPs, events
        self._account_consents: dict[str, dict] = {}
        self._payment_consents: dict[str, dict] = {}
        self._scheduled_payment_consents: dict[str, dict] = {}
        self._standing_order_consents: dict[str, dict] = {}
        self._international_payment_consents: dict[str, dict] = {}
        self._domestic_payments: dict[str, dict] = {}
        self._domestic_scheduled_payments: dict[str, dict] = {}
        self._domestic_standing_orders: dict[str, dict] = {}
        self._international_payments: dict[str, dict] = {}
        self._cof_consents: dict[str, dict] = {}
        self._vrp_consents: dict[str, dict] = {}
        self._vrp_payments: dict[str, dict] = {}
        self._event_subscriptions: dict[str, dict] = {}
        self._events: list[dict] = []

    # ── helpers ──────────────────────────────────────────────────────────

    async def _banking_get(self, path: str, params: dict | None = None) -> Any:
        """Call the Banking API (consent-service) and return parsed JSON."""
        url = f"{_BANKING_BASE}{path}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()

    async def _validate_account(self, account_id: str) -> None:
        """Verify account exists via Banking API. Raises not_found on 404."""
        try:
            await self._banking_get(f"/accounts/{account_id}/balances")
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise not_found("Account", account_id)
            raise

    # ── AIS: Account Access Consents ────────────────────────────────────

    async def create_account_access_consent(self, data: dict[str, Any]) -> dict[str, Any]:
        consent_data = data.get("Data", {})
        consent_id = f"urn:bankdhofar:consent:{_uuid()}"
        now = _now()
        consent = {
            "ConsentId": consent_id,
            "Status": "AwaitingAuthorisation",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Permissions": consent_data.get("Permissions", []),
            "ExpirationDateTime": consent_data.get("ExpirationDateTime"),
            "TransactionFromDateTime": consent_data.get("TransactionFromDateTime"),
            "TransactionToDateTime": consent_data.get("TransactionToDateTime"),
        }
        self._account_consents[consent_id] = consent
        return {
            "Data": consent,
            "Risk": data.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/aisp/account-access-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_account_access_consent(self, consent_id: str) -> dict[str, Any]:
        consent = self._account_consents.get(consent_id)
        if not consent:
            raise not_found("AccountAccessConsent", consent_id)
        return {
            "Data": consent,
            "Risk": {},
            "Links": {"Self": f"/open-banking/v4.0/aisp/account-access-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def delete_account_access_consent(self, consent_id: str) -> None:
        if consent_id not in self._account_consents:
            raise not_found("AccountAccessConsent", consent_id)
        del self._account_consents[consent_id]

    # ── Consent-scoped account filtering ────────────────────────────────

    async def _get_consent(self, consent_id: str) -> dict | None:
        """Fetch the full consent record from the consent service."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.consent_service_url}/consents/{consent_id}")
                if resp.status_code == 200:
                    return resp.json()
        except Exception:
            pass
        return None

    async def _get_consented_account_ids(self, consent_id: str) -> list[str] | None:
        """Fetch selected_accounts from consent service. Returns empty list if revoked/expired."""
        data = await self._get_consent(consent_id)
        if data:
            status = data.get("status", "")
            if status != "Authorised":
                return []  # Consent revoked/expired — no access
            return data.get("selected_accounts")
        return None

    # ── AIS: Accounts (from Banking API) ────────────────────────────────

    async def get_accounts(self, consent_id: str) -> dict[str, Any]:
        allowed = await self._get_consented_account_ids(consent_id)
        if allowed:
            # Fetch only the consented accounts from the Banking API
            try:
                ids_str = ",".join(allowed)
                rows = await self._banking_get("/accounts/by-ids", params={"ids": ids_str})
                accounts = [_to_obie_account(r) for r in rows]
            except Exception:
                logger.exception("Banking API call failed for get_accounts, returning empty")
                accounts = []
        else:
            # No consent filter — return empty (no blanket access without consent)
            accounts = []
        return {
            "Data": {"Account": accounts},
            "Links": {"Self": "/open-banking/v4.0/aisp/accounts"},
            "Meta": {"TotalPages": 1},
        }

    async def get_account(self, account_id: str, consent_id: str) -> dict[str, Any]:
        try:
            row = await self._banking_get(f"/accounts/{account_id}")
            acct = _to_obie_account(row)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise not_found("Account", account_id)
            raise
        return {
            "Data": {"Account": [acct]},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_balances(self, account_id: str, consent_id: str) -> dict[str, Any]:
        try:
            row = await self._banking_get(f"/accounts/{account_id}/balances")
            bal = _to_obie_balance(row, account_id)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise not_found("Account", account_id)
            raise
        return {
            "Data": {"Balance": [bal]},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/balances"},
            "Meta": {"TotalPages": 1},
        }

    async def get_transactions(
        self,
        account_id: str,
        consent_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        try:
            rows = await self._banking_get(f"/accounts/{account_id}/transactions")
            txns = [_to_obie_transaction(r) for r in rows]
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise not_found("Account", account_id)
            raise
        return {
            "Data": {"Transaction": txns},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/transactions"},
            "Meta": {"TotalPages": 1},
        }

    async def get_beneficiaries(self, account_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        # Get customer_id from the consent to fetch beneficiaries from Banking API
        bens: list[dict] = []
        consent = await self._get_consent(consent_id)
        if consent:
            customer_id = consent.get("customer_id")
            if customer_id:
                try:
                    rows = await self._banking_get(f"/customers/{customer_id}/beneficiaries")
                    bens = [
                        {
                            "AccountId": account_id,
                            "BeneficiaryId": r.get("beneficiary_id", ""),
                            "Reference": r.get("nickname", ""),
                            "CreditorAccount": {
                                "SchemeName": "IBAN",
                                "Identification": r.get("iban", ""),
                                "Name": r.get("name", ""),
                            },
                        }
                        for r in rows
                    ]
                except Exception:
                    logger.warning("Failed to fetch beneficiaries for customer %s", customer_id)
        return {
            "Data": {"Beneficiary": bens},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/beneficiaries"},
            "Meta": {"TotalPages": 1},
        }

    async def get_direct_debits(self, account_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        dds = self._direct_debits.get(account_id, [])
        return {
            "Data": {"DirectDebit": dds},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/direct-debits"},
            "Meta": {"TotalPages": 1},
        }

    async def get_standing_orders(self, account_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        sos = self._standing_orders.get(account_id, [])
        return {
            "Data": {"StandingOrder": sos},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/standing-orders"},
            "Meta": {"TotalPages": 1},
        }

    async def get_scheduled_payments(self, account_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        sps = self._scheduled_payments.get(account_id, [])
        return {
            "Data": {"ScheduledPayment": sps},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/scheduled-payments"},
            "Meta": {"TotalPages": 1},
        }

    async def get_statements(self, account_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        stmts = self._statements.get(account_id, [])
        return {
            "Data": {"Statement": stmts},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/statements"},
            "Meta": {"TotalPages": 1},
        }

    async def get_statement(self, account_id: str, statement_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        stmts = self._statements.get(account_id, [])
        for s in stmts:
            if s["StatementId"] == statement_id:
                return {
                    "Data": {"Statement": [s]},
                    "Links": {
                        "Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/statements/{statement_id}"
                    },
                    "Meta": {"TotalPages": 1},
                }
        raise not_found("Statement", statement_id)

    async def get_statement_transactions(
        self,
        account_id: str,
        statement_id: str,
        consent_id: str,
    ) -> dict[str, Any]:
        await self._validate_account(account_id)
        # Return all transactions for the account as statement transactions (from Banking API)
        try:
            rows = await self._banking_get(f"/accounts/{account_id}/transactions")
            txns = [_to_obie_transaction(r) for r in rows]
        except Exception:
            txns = []
        return {
            "Data": {"Transaction": txns},
            "Links": {
                "Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/statements/{statement_id}/transactions"
            },
            "Meta": {"TotalPages": 1},
        }

    async def get_product(self, account_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        prod = self._products.get(account_id, {
            "AccountId": account_id,
            "ProductId": "PROD-GENERIC",
            "ProductType": "PersonalCurrentAccount",
            "ProductName": "Standard Account",
        })
        return {
            "Data": {"Product": [prod]},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/product"},
            "Meta": {"TotalPages": 1},
        }

    async def get_party(self, account_id: str, consent_id: str) -> dict[str, Any]:
        await self._validate_account(account_id)
        party = self._parties.get(account_id, {
            "PartyId": "PARTY-UNKNOWN",
            "PartyType": "Sole",
            "Name": "Unknown",
        })
        return {
            "Data": {"Party": party},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/party"},
            "Meta": {"TotalPages": 1},
        }

    # ── AIS: Bulk ───────────────────────────────────────────────────────

    async def get_all_balances(self, consent_id: str) -> dict[str, Any]:
        """Get balances for all consented accounts via Banking API."""
        allowed = await self._get_consented_account_ids(consent_id)
        all_bals: list[dict] = []
        if allowed:
            for account_id in allowed:
                try:
                    row = await self._banking_get(f"/accounts/{account_id}/balances")
                    all_bals.append(_to_obie_balance(row, account_id))
                except Exception:
                    logger.warning("Failed to fetch balance for %s", account_id)
        return {
            "Data": {"Balance": all_bals},
            "Links": {"Self": "/open-banking/v4.0/aisp/balances"},
            "Meta": {"TotalPages": 1},
        }

    async def get_all_transactions(self, consent_id: str) -> dict[str, Any]:
        """Get transactions for all consented accounts via Banking API."""
        allowed = await self._get_consented_account_ids(consent_id)
        all_txns: list[dict] = []
        if allowed:
            for account_id in allowed:
                try:
                    rows = await self._banking_get(f"/accounts/{account_id}/transactions")
                    all_txns.extend([_to_obie_transaction(r) for r in rows])
                except Exception:
                    logger.warning("Failed to fetch transactions for %s", account_id)
        return {
            "Data": {"Transaction": all_txns},
            "Links": {"Self": "/open-banking/v4.0/aisp/transactions"},
            "Meta": {"TotalPages": 1},
        }

    async def get_all_beneficiaries(self, consent_id: str) -> dict[str, Any]:
        all_bens: list[dict] = []
        consent = await self._get_consent(consent_id)
        if consent:
            customer_id = consent.get("customer_id")
            allowed = consent.get("selected_accounts") or []
            if customer_id:
                try:
                    rows = await self._banking_get(f"/customers/{customer_id}/beneficiaries")
                    # Map beneficiaries to each consented account
                    for account_id in allowed:
                        for r in rows:
                            all_bens.append({
                                "AccountId": account_id,
                                "BeneficiaryId": r.get("beneficiary_id", ""),
                                "Reference": r.get("nickname", ""),
                                "CreditorAccount": {
                                    "SchemeName": "IBAN",
                                    "Identification": r.get("iban", ""),
                                    "Name": r.get("name", ""),
                                },
                            })
                except Exception:
                    logger.warning("Failed to fetch all beneficiaries for customer %s", customer_id)
        return {
            "Data": {"Beneficiary": all_bens},
            "Links": {"Self": "/open-banking/v4.0/aisp/beneficiaries"},
            "Meta": {"TotalPages": 1},
        }

    async def get_all_direct_debits(self, consent_id: str) -> dict[str, Any]:
        all_dds = []
        for dds in self._direct_debits.values():
            all_dds.extend(dds)
        return {
            "Data": {"DirectDebit": all_dds},
            "Links": {"Self": "/open-banking/v4.0/aisp/direct-debits"},
            "Meta": {"TotalPages": 1},
        }

    async def get_all_standing_orders(self, consent_id: str) -> dict[str, Any]:
        all_sos = []
        for sos in self._standing_orders.values():
            all_sos.extend(sos)
        return {
            "Data": {"StandingOrder": all_sos},
            "Links": {"Self": "/open-banking/v4.0/aisp/standing-orders"},
            "Meta": {"TotalPages": 1},
        }

    async def get_all_scheduled_payments(self, consent_id: str) -> dict[str, Any]:
        all_sps = []
        for sps in self._scheduled_payments.values():
            all_sps.extend(sps)
        return {
            "Data": {"ScheduledPayment": all_sps},
            "Links": {"Self": "/open-banking/v4.0/aisp/scheduled-payments"},
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: Domestic Payment Consents ──────────────────────────────────

    async def create_domestic_payment_consent(self, data: dict[str, Any], *, client_id: str | None = None) -> dict[str, Any]:
        initiation = data.get("Data", {}).get("Initiation", {})
        risk = data.get("Risk", {})

        tpp_id = client_id or "unknown-tpp"
        amount_info = initiation.get("InstructedAmount", {})
        payment_details = {
            "instructed_amount": {
                "amount": amount_info.get("Amount", "0"),
                "currency": amount_info.get("Currency", "OMR"),
            },
            "creditor_account": initiation.get("CreditorAccount"),
            "remittance_reference": initiation.get("RemittanceInformation", {}).get("Reference"),
        }

        consent_id = None
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    f"{settings.consent_service_url}/consents",
                    json={
                        "consent_type": "domestic-payment",
                        "tpp_id": tpp_id,
                        "permissions": ["ReadPaymentsBasic", "ReadPaymentsDetail"],
                        "payment_details": payment_details,
                        "risk_data": risk or None,
                    },
                )
                if resp.status_code == 201:
                    cs_data = resp.json()
                    consent_id = cs_data.get("consent_id")
        except Exception as exc:
            logger.warning("Failed to persist payment consent to consent service: %s", exc)

        if not consent_id:
            consent_id = _uuid()

        now = _now()
        consent = {
            "ConsentId": consent_id,
            "Status": "AwaitingAuthorisation",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
            "Risk": risk,
        }
        self._payment_consents[consent_id] = consent
        return {
            "Data": consent,
            "Risk": risk,
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-payment-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_payment_consent(self, consent_id: str) -> dict[str, Any]:
        consent = self._payment_consents.get(consent_id)
        if not consent:
            raise not_found("DomesticPaymentConsent", consent_id)
        return {
            "Data": consent,
            "Risk": consent.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-payment-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_payment_consent_funds(self, consent_id: str) -> dict[str, Any]:
        consent = self._payment_consents.get(consent_id)
        if not consent:
            raise not_found("DomesticPaymentConsent", consent_id)
        return {
            "Data": {
                "FundsAvailableResult": {
                    "FundsAvailableDateTime": _now(),
                    "FundsAvailable": True,
                }
            },
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/domestic-payment-consents/{consent_id}/funds-confirmation"
            },
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: Domestic Payments ──────────────────────────────────────────

    async def execute_domestic_payment(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]:
        payment_id = f"urn:bankdhofar:dp:{_uuid()}"
        now = _now()
        initiation = data.get("Data", {}).get("Initiation", {})
        payment = {
            "DomesticPaymentId": payment_id,
            "ConsentId": consent_id,
            "Status": "AcceptedSettlementInProcess",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
        }
        self._domestic_payments[payment_id] = payment
        # Mark consent as consumed
        if consent_id in self._payment_consents:
            self._payment_consents[consent_id]["Status"] = "Consumed"
            self._payment_consents[consent_id]["StatusUpdateDateTime"] = now

        # Execute the actual transfer via consent service
        try:
            consent_data = await self._get_consent(consent_id)
            if consent_data:
                pd = consent_data.get("payment_details") or {}
                amt = pd.get("instructed_amount", {})
                creditor = pd.get("creditor_account", {})
                selected = consent_data.get("selected_accounts") or []
                customer_id = consent_data.get("customer_id", "")
                source_account = selected[0] if selected else ""
                target_iban = creditor.get("identification", "")

                tpp_id = consent_data.get("tpp_id", "")

                if source_account and customer_id:
                    target_account = None
                    # Try IBAN lookup first
                    if target_iban:
                        try:
                            async with httpx.AsyncClient(timeout=5.0) as c2:
                                r = await c2.get(
                                    f"{settings.consent_service_url}/banking/accounts/by-iban/{target_iban}"
                                )
                                if r.status_code == 200:
                                    target_account = r.json().get("account_id")
                        except Exception:
                            pass
                    # Fallback: resolve by TPP merchant mapping
                    if not target_account:
                        _TPP_MERCHANT_ACCOUNTS = {
                            "salalah-souq-demo": "DHOF-20001",
                            "masroofi-demo": "DHOF-20002",
                            "hisab-demo": "DHOF-20003",
                        }
                        target_account = _TPP_MERCHANT_ACCOUNTS.get(tpp_id)
                        if target_account:
                            logger.info("Resolved TPP %s to merchant account %s via fallback map", tpp_id, target_account)
                        else:
                            logger.error("Could not resolve IBAN %s or TPP %s to any account", target_iban, tpp_id)
                            raise ValueError(f"Cannot resolve merchant account for TPP {tpp_id}")

                    ref = (pd.get("remittance_information") or {}).get("reference", payment_id[:16])
                    transfer_body = {
                        "customer_id": customer_id,
                        "source_account_id": source_account,
                        "target_account_id": target_account,
                        "amount": float(amt.get("amount", 0)),
                        "currency": amt.get("currency", "OMR"),
                        "reference": ref,
                    }
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        tr = await client.post(f"{_BANKING_BASE}/transfers", json=transfer_body)
                        if tr.status_code == 201:
                            payment["Status"] = "AcceptedSettlementCompleted"
                            payment["StatusUpdateDateTime"] = _now()
                            logger.info("Transfer executed for payment %s", payment_id)
                        else:
                            payment["Status"] = "Rejected"
                            payment["StatusUpdateDateTime"] = _now()
                            logger.error("Transfer FAILED for payment %s: %s", payment_id, tr.text)
                            raise ValueError(f"Bank transfer failed: {tr.text}")
                else:
                    payment["Status"] = "Rejected"
                    logger.error("Missing transfer params: source=%s iban=%s customer=%s", source_account, target_iban, customer_id)
                    raise ValueError("Missing source account, target IBAN, or customer ID")
        except Exception as exc:
            payment["Status"] = "Rejected"
            payment["StatusUpdateDateTime"] = _now()
            logger.error("Transfer execution error for payment %s: %s", payment_id, exc)
            raise

        return {
            "Data": payment,
            "Risk": data.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-payments/{payment_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_payment(self, payment_id: str) -> dict[str, Any]:
        payment = self._domestic_payments.get(payment_id)
        if not payment:
            raise not_found("DomesticPayment", payment_id)
        return {
            "Data": payment,
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-payments/{payment_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_payment_details(self, payment_id: str) -> dict[str, Any]:
        payment = self._domestic_payments.get(payment_id)
        if not payment:
            raise not_found("DomesticPayment", payment_id)
        return {
            "Data": {
                "PaymentStatus": [
                    {
                        "PaymentTransactionId": f"TXN-{payment_id[:8]}",
                        "Status": "AcceptedSettlementCompleted",
                        "StatusUpdateDateTime": _now(),
                        "StatusDetail": {
                            "LocalInstrument": "OM.OBIE.FPS",
                            "Status": "AcceptedSettlementCompleted",
                            "StatusReason": "Accepted",
                            "StatusReasonDescription": "Payment completed successfully",
                        },
                    }
                ]
            },
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-payments/{payment_id}/payment-details"},
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: Domestic Scheduled Payment Consents ────────────────────────

    async def create_domestic_scheduled_payment_consent(self, data: dict[str, Any]) -> dict[str, Any]:
        consent_id = f"urn:bankdhofar:dspc:{_uuid()}"
        now = _now()
        initiation = data.get("Data", {}).get("Initiation", {})
        risk = data.get("Risk", {})
        consent = {
            "ConsentId": consent_id,
            "Status": "AwaitingAuthorisation",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
            "Risk": risk,
        }
        self._scheduled_payment_consents[consent_id] = consent
        return {
            "Data": consent,
            "Risk": risk,
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/domestic-scheduled-payment-consents/{consent_id}"
            },
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_scheduled_payment_consent(self, consent_id: str) -> dict[str, Any]:
        consent = self._scheduled_payment_consents.get(consent_id)
        if not consent:
            raise not_found("DomesticScheduledPaymentConsent", consent_id)
        return {
            "Data": consent,
            "Risk": consent.get("Risk", {}),
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/domestic-scheduled-payment-consents/{consent_id}"
            },
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: Domestic Scheduled Payments ────────────────────────────────

    async def execute_domestic_scheduled_payment(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]:
        payment_id = f"urn:bankdhofar:dsp:{_uuid()}"
        now = _now()
        initiation = data.get("Data", {}).get("Initiation", {})
        payment = {
            "DomesticScheduledPaymentId": payment_id,
            "ConsentId": consent_id,
            "Status": "InitiationPending",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
        }
        self._domestic_scheduled_payments[payment_id] = payment
        if consent_id in self._scheduled_payment_consents:
            self._scheduled_payment_consents[consent_id]["Status"] = "Consumed"
            self._scheduled_payment_consents[consent_id]["StatusUpdateDateTime"] = now
        return {
            "Data": payment,
            "Risk": data.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-scheduled-payments/{payment_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_scheduled_payment(self, payment_id: str) -> dict[str, Any]:
        payment = self._domestic_scheduled_payments.get(payment_id)
        if not payment:
            raise not_found("DomesticScheduledPayment", payment_id)
        return {
            "Data": payment,
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-scheduled-payments/{payment_id}"},
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: Domestic Standing Order Consents ───────────────────────────

    async def create_domestic_standing_order_consent(self, data: dict[str, Any]) -> dict[str, Any]:
        consent_id = f"urn:bankdhofar:dsoc:{_uuid()}"
        now = _now()
        initiation = data.get("Data", {}).get("Initiation", {})
        risk = data.get("Risk", {})
        consent = {
            "ConsentId": consent_id,
            "Status": "AwaitingAuthorisation",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
            "Risk": risk,
        }
        self._standing_order_consents[consent_id] = consent
        return {
            "Data": consent,
            "Risk": risk,
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/domestic-standing-order-consents/{consent_id}"
            },
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_standing_order_consent(self, consent_id: str) -> dict[str, Any]:
        consent = self._standing_order_consents.get(consent_id)
        if not consent:
            raise not_found("DomesticStandingOrderConsent", consent_id)
        return {
            "Data": consent,
            "Risk": consent.get("Risk", {}),
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/domestic-standing-order-consents/{consent_id}"
            },
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: Domestic Standing Orders ───────────────────────────────────

    async def execute_domestic_standing_order(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]:
        order_id = f"urn:bankdhofar:dso:{_uuid()}"
        now = _now()
        initiation = data.get("Data", {}).get("Initiation", {})
        order = {
            "DomesticStandingOrderId": order_id,
            "ConsentId": consent_id,
            "Status": "InitiationPending",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
        }
        self._domestic_standing_orders[order_id] = order
        if consent_id in self._standing_order_consents:
            self._standing_order_consents[consent_id]["Status"] = "Consumed"
            self._standing_order_consents[consent_id]["StatusUpdateDateTime"] = now
        return {
            "Data": order,
            "Risk": data.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-standing-orders/{order_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_domestic_standing_order(self, order_id: str) -> dict[str, Any]:
        order = self._domestic_standing_orders.get(order_id)
        if not order:
            raise not_found("DomesticStandingOrder", order_id)
        return {
            "Data": order,
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-standing-orders/{order_id}"},
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: International Payment Consents ─────────────────────────────

    async def create_international_payment_consent(self, data: dict[str, Any]) -> dict[str, Any]:
        consent_id = f"urn:bankdhofar:ipc:{_uuid()}"
        now = _now()
        initiation = data.get("Data", {}).get("Initiation", {})
        risk = data.get("Risk", {})
        consent = {
            "ConsentId": consent_id,
            "Status": "AwaitingAuthorisation",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
            "Risk": risk,
        }
        self._international_payment_consents[consent_id] = consent
        return {
            "Data": consent,
            "Risk": risk,
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/international-payment-consents/{consent_id}"
            },
            "Meta": {"TotalPages": 1},
        }

    async def get_international_payment_consent(self, consent_id: str) -> dict[str, Any]:
        consent = self._international_payment_consents.get(consent_id)
        if not consent:
            raise not_found("InternationalPaymentConsent", consent_id)
        return {
            "Data": consent,
            "Risk": consent.get("Risk", {}),
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/international-payment-consents/{consent_id}"
            },
            "Meta": {"TotalPages": 1},
        }

    # ── PIS: International Payments ─────────────────────────────────────

    async def execute_international_payment(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]:
        payment_id = f"urn:bankdhofar:ip:{_uuid()}"
        now = _now()
        initiation = data.get("Data", {}).get("Initiation", {})
        payment = {
            "InternationalPaymentId": payment_id,
            "ConsentId": consent_id,
            "Status": "AcceptedSettlementInProcess",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": initiation,
        }
        self._international_payments[payment_id] = payment
        if consent_id in self._international_payment_consents:
            self._international_payment_consents[consent_id]["Status"] = "Consumed"
            self._international_payment_consents[consent_id]["StatusUpdateDateTime"] = now
        return {
            "Data": payment,
            "Risk": data.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/international-payments/{payment_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_international_payment(self, payment_id: str) -> dict[str, Any]:
        payment = self._international_payments.get(payment_id)
        if not payment:
            raise not_found("InternationalPayment", payment_id)
        return {
            "Data": payment,
            "Links": {"Self": f"/open-banking/v4.0/pisp/international-payments/{payment_id}"},
            "Meta": {"TotalPages": 1},
        }

    # ── CoF: Confirmation of Funds ──────────────────────────────────────

    async def create_funds_confirmation_consent(self, data: dict[str, Any]) -> dict[str, Any]:
        consent_id = f"urn:bankdhofar:cof:{_uuid()}"
        now = _now()
        consent_data = data.get("Data", {})
        consent = {
            "ConsentId": consent_id,
            "Status": "AwaitingAuthorisation",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "DebtorAccount": consent_data.get("DebtorAccount", {}),
            "ExpirationDateTime": consent_data.get("ExpirationDateTime"),
        }
        self._cof_consents[consent_id] = consent
        return {
            "Data": consent,
            "Links": {"Self": f"/open-banking/v4.0/cbpii/funds-confirmation-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_funds_confirmation_consent(self, consent_id: str) -> dict[str, Any]:
        consent = self._cof_consents.get(consent_id)
        if not consent:
            raise not_found("FundsConfirmationConsent", consent_id)
        return {
            "Data": consent,
            "Links": {"Self": f"/open-banking/v4.0/cbpii/funds-confirmation-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def delete_funds_confirmation_consent(self, consent_id: str) -> None:
        if consent_id not in self._cof_consents:
            raise not_found("FundsConfirmationConsent", consent_id)
        del self._cof_consents[consent_id]

    async def check_funds(self, data: dict[str, Any]) -> dict[str, Any]:
        fund_data = data.get("Data", {})
        reference = fund_data.get("Reference", "")
        amount = fund_data.get("InstructedAmount", {}).get("Amount", "0")
        currency = fund_data.get("InstructedAmount", {}).get("Currency", "OMR")
        return {
            "Data": {
                "FundsConfirmationId": _uuid(),
                "ConsentId": fund_data.get("ConsentId", ""),
                "CreationDateTime": _now(),
                "FundsAvailable": True,
                "Reference": reference,
                "InstructedAmount": {"Amount": amount, "Currency": currency},
            },
            "Links": {"Self": "/open-banking/v4.0/cbpii/funds-confirmations"},
            "Meta": {"TotalPages": 1},
        }

    # ── VRP ──────────────────────────────────────────────────────────────

    async def create_vrp_consent(self, data: dict[str, Any]) -> dict[str, Any]:
        consent_id = f"urn:bankdhofar:vrpc:{_uuid()}"
        now = _now()
        vrp_data = data.get("Data", {})
        consent = {
            "ConsentId": consent_id,
            "Status": "AwaitingAuthorisation",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "ControlParameters": vrp_data.get("ControlParameters", {}),
            "Initiation": vrp_data.get("Initiation", {}),
            "Risk": data.get("Risk", {}),
        }
        self._vrp_consents[consent_id] = consent
        return {
            "Data": consent,
            "Risk": data.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-vrp-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_vrp_consent(self, consent_id: str) -> dict[str, Any]:
        consent = self._vrp_consents.get(consent_id)
        if not consent:
            raise not_found("DomesticVRPConsent", consent_id)
        return {
            "Data": consent,
            "Risk": consent.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-vrp-consents/{consent_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def delete_vrp_consent(self, consent_id: str) -> None:
        if consent_id not in self._vrp_consents:
            raise not_found("DomesticVRPConsent", consent_id)
        del self._vrp_consents[consent_id]

    async def vrp_funds_confirmation(self, consent_id: str, data: dict[str, Any]) -> dict[str, Any]:
        if consent_id not in self._vrp_consents:
            raise not_found("DomesticVRPConsent", consent_id)
        return {
            "Data": {
                "FundsAvailableResult": {
                    "FundsAvailableDateTime": _now(),
                    "FundsAvailable": True,
                }
            },
            "Links": {
                "Self": f"/open-banking/v4.0/pisp/domestic-vrp-consents/{consent_id}/funds-confirmation"
            },
            "Meta": {"TotalPages": 1},
        }

    async def execute_vrp(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]:
        vrp_id = f"urn:bankdhofar:vrp:{_uuid()}"
        now = _now()
        vrp_data = data.get("Data", {})
        payment = {
            "DomesticVRPId": vrp_id,
            "ConsentId": consent_id,
            "Status": "AcceptedSettlementInProcess",
            "StatusUpdateDateTime": now,
            "CreationDateTime": now,
            "Initiation": vrp_data.get("Initiation", {}),
            "Instruction": vrp_data.get("Instruction", {}),
        }
        self._vrp_payments[vrp_id] = payment
        return {
            "Data": payment,
            "Risk": data.get("Risk", {}),
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-vrps/{vrp_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_vrp(self, vrp_id: str) -> dict[str, Any]:
        payment = self._vrp_payments.get(vrp_id)
        if not payment:
            raise not_found("DomesticVRP", vrp_id)
        return {
            "Data": payment,
            "Links": {"Self": f"/open-banking/v4.0/pisp/domestic-vrps/{vrp_id}"},
            "Meta": {"TotalPages": 1},
        }

    # ── Events ───────────────────────────────────────────────────────────

    async def create_event_subscription(self, data: dict[str, Any]) -> dict[str, Any]:
        sub_id = _uuid()
        sub_data = data.get("Data", {})
        sub = {
            "EventSubscriptionId": sub_id,
            "CallbackUrl": sub_data.get("CallbackUrl"),
            "Version": sub_data.get("Version", "4.0"),
            "EventTypes": sub_data.get("EventTypes", []),
        }
        self._event_subscriptions[sub_id] = sub
        return {
            "Data": sub,
            "Links": {"Self": f"/open-banking/v4.0/events/event-subscriptions/{sub_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_event_subscriptions(self) -> dict[str, Any]:
        subs = list(self._event_subscriptions.values())
        return {
            "Data": {"EventSubscription": subs},
            "Links": {"Self": "/open-banking/v4.0/events/event-subscriptions"},
            "Meta": {"TotalPages": 1},
        }

    async def get_event_subscription(self, sub_id: str) -> dict[str, Any]:
        sub = self._event_subscriptions.get(sub_id)
        if not sub:
            raise not_found("EventSubscription", sub_id)
        return {
            "Data": sub,
            "Links": {"Self": f"/open-banking/v4.0/events/event-subscriptions/{sub_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def update_event_subscription(self, sub_id: str, data: dict[str, Any]) -> dict[str, Any]:
        sub = self._event_subscriptions.get(sub_id)
        if not sub:
            raise not_found("EventSubscription", sub_id)
        sub_data = data.get("Data", {})
        if "CallbackUrl" in sub_data:
            sub["CallbackUrl"] = sub_data["CallbackUrl"]
        if "EventTypes" in sub_data:
            sub["EventTypes"] = sub_data["EventTypes"]
        if "Version" in sub_data:
            sub["Version"] = sub_data["Version"]
        return {
            "Data": sub,
            "Links": {"Self": f"/open-banking/v4.0/events/event-subscriptions/{sub_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def delete_event_subscription(self, sub_id: str) -> None:
        if sub_id not in self._event_subscriptions:
            raise not_found("EventSubscription", sub_id)
        del self._event_subscriptions[sub_id]

    async def poll_events(self) -> dict[str, Any]:
        # Return any unacknowledged events
        return {
            "sets": {},
            "moreAvailable": False,
        }

    async def acknowledge_events(self, data: dict[str, Any]) -> None:
        # Accept acknowledgements, no-op in mock
        pass
