"""Mock adapter — returns synthetic OBIE-compliant data for all 64 endpoints.

All state is held in-memory (dict).  Restarting the service resets everything.
"""

from __future__ import annotations

import copy
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from app.adapters.base import OBIEAdapter
from app.adapters.mock import data as fixtures
from app.core.errors import not_found, bad_request

_TZ_OMAN = timezone(timedelta(hours=4))


def _now() -> str:
    return datetime.now(_TZ_OMAN).isoformat()


def _uuid() -> str:
    return str(uuid.uuid4())


class MockAdapter(OBIEAdapter):
    """In-memory mock implementing every OBIEAdapter method."""

    def __init__(self) -> None:
        # Deep-copy fixtures so mutations don't pollute the module-level data
        self._accounts: list[dict] = copy.deepcopy(fixtures.ACCOUNTS)
        self._balances: dict[str, list[dict]] = copy.deepcopy(fixtures.BALANCES)
        self._transactions: dict[str, list[dict]] = copy.deepcopy(fixtures.TRANSACTIONS)
        self._beneficiaries: dict[str, list[dict]] = copy.deepcopy(fixtures.BENEFICIARIES)
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

    def _find_account(self, account_id: str) -> dict:
        for acct in self._accounts:
            if acct["AccountId"] == account_id:
                return acct
        raise not_found("Account", account_id)

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

    # ── AIS: Accounts ───────────────────────────────────────────────────

    async def get_accounts(self, consent_id: str) -> dict[str, Any]:
        return {
            "Data": {"Account": self._accounts},
            "Links": {"Self": "/open-banking/v4.0/aisp/accounts"},
            "Meta": {"TotalPages": 1},
        }

    async def get_account(self, account_id: str, consent_id: str) -> dict[str, Any]:
        acct = self._find_account(account_id)
        return {
            "Data": {"Account": [acct]},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}"},
            "Meta": {"TotalPages": 1},
        }

    async def get_balances(self, account_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
        bals = self._balances.get(account_id, [])
        return {
            "Data": {"Balance": bals},
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
        self._find_account(account_id)
        txns = self._transactions.get(account_id, [])
        return {
            "Data": {"Transaction": txns},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/transactions"},
            "Meta": {"TotalPages": 1},
        }

    async def get_beneficiaries(self, account_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
        bens = self._beneficiaries.get(account_id, [])
        return {
            "Data": {"Beneficiary": bens},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/beneficiaries"},
            "Meta": {"TotalPages": 1},
        }

    async def get_direct_debits(self, account_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
        dds = self._direct_debits.get(account_id, [])
        return {
            "Data": {"DirectDebit": dds},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/direct-debits"},
            "Meta": {"TotalPages": 1},
        }

    async def get_standing_orders(self, account_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
        sos = self._standing_orders.get(account_id, [])
        return {
            "Data": {"StandingOrder": sos},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/standing-orders"},
            "Meta": {"TotalPages": 1},
        }

    async def get_scheduled_payments(self, account_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
        sps = self._scheduled_payments.get(account_id, [])
        return {
            "Data": {"ScheduledPayment": sps},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/scheduled-payments"},
            "Meta": {"TotalPages": 1},
        }

    async def get_statements(self, account_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
        stmts = self._statements.get(account_id, [])
        return {
            "Data": {"Statement": stmts},
            "Links": {"Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/statements"},
            "Meta": {"TotalPages": 1},
        }

    async def get_statement(self, account_id: str, statement_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
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
        self._find_account(account_id)
        # Return all transactions for the account as statement transactions
        txns = self._transactions.get(account_id, [])
        return {
            "Data": {"Transaction": txns},
            "Links": {
                "Self": f"/open-banking/v4.0/aisp/accounts/{account_id}/statements/{statement_id}/transactions"
            },
            "Meta": {"TotalPages": 1},
        }

    async def get_product(self, account_id: str, consent_id: str) -> dict[str, Any]:
        self._find_account(account_id)
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
        self._find_account(account_id)
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
        all_bals = []
        for bals in self._balances.values():
            all_bals.extend(bals)
        return {
            "Data": {"Balance": all_bals},
            "Links": {"Self": "/open-banking/v4.0/aisp/balances"},
            "Meta": {"TotalPages": 1},
        }

    async def get_all_transactions(self, consent_id: str) -> dict[str, Any]:
        all_txns = []
        for txns in self._transactions.values():
            all_txns.extend(txns)
        return {
            "Data": {"Transaction": all_txns},
            "Links": {"Self": "/open-banking/v4.0/aisp/transactions"},
            "Meta": {"TotalPages": 1},
        }

    async def get_all_beneficiaries(self, consent_id: str) -> dict[str, Any]:
        all_bens = []
        for bens in self._beneficiaries.values():
            all_bens.extend(bens)
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

    async def create_domestic_payment_consent(self, data: dict[str, Any]) -> dict[str, Any]:
        consent_id = f"urn:bankdhofar:dpc:{_uuid()}"
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
