"""Abstract adapter interface for the OBIE API server.

Every backend (mock, corporate-banking, e-mandate) implements this interface.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class OBIEAdapter(ABC):
    """Contract that every adapter must fulfil."""

    # ── AIS: Account Access Consents ────────────────────────────────────
    @abstractmethod
    async def create_account_access_consent(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def get_account_access_consent(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_account_access_consent(self, consent_id: str) -> None: ...

    # ── AIS: Accounts ───────────────────────────────────────────────────
    @abstractmethod
    async def get_accounts(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_account(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_balances(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_transactions(
        self,
        account_id: str,
        consent_id: str,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def get_beneficiaries(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_direct_debits(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_standing_orders(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_scheduled_payments(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_statements(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_statement(self, account_id: str, statement_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_statement_transactions(
        self,
        account_id: str,
        statement_id: str,
        consent_id: str,
    ) -> dict[str, Any]: ...

    @abstractmethod
    async def get_product(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_party(self, account_id: str, consent_id: str) -> dict[str, Any]: ...

    # ── AIS: Bulk ───────────────────────────────────────────────────────
    @abstractmethod
    async def get_all_balances(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_all_transactions(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_all_beneficiaries(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_all_direct_debits(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_all_standing_orders(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_all_scheduled_payments(self, consent_id: str) -> dict[str, Any]: ...

    # ── PIS: Domestic Payments ──────────────────────────────────────────
    @abstractmethod
    async def create_domestic_payment_consent(self, data: dict[str, Any], *, client_id: str | None = None) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_payment_consent(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_payment_consent_funds(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def execute_domestic_payment(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_payment(self, payment_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_payment_details(self, payment_id: str) -> dict[str, Any]: ...

    # ── PIS: Domestic Scheduled Payments ────────────────────────────────
    @abstractmethod
    async def create_domestic_scheduled_payment_consent(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_scheduled_payment_consent(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def execute_domestic_scheduled_payment(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_scheduled_payment(self, payment_id: str) -> dict[str, Any]: ...

    # ── PIS: Domestic Standing Orders ───────────────────────────────────
    @abstractmethod
    async def create_domestic_standing_order_consent(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_standing_order_consent(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def execute_domestic_standing_order(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_domestic_standing_order(self, order_id: str) -> dict[str, Any]: ...

    # ── PIS: International Payments ─────────────────────────────────────
    @abstractmethod
    async def create_international_payment_consent(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def get_international_payment_consent(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def execute_international_payment(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_international_payment(self, payment_id: str) -> dict[str, Any]: ...

    # ── CoF: Confirmation of Funds ──────────────────────────────────────
    @abstractmethod
    async def create_funds_confirmation_consent(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def get_funds_confirmation_consent(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_funds_confirmation_consent(self, consent_id: str) -> None: ...

    @abstractmethod
    async def check_funds(self, data: dict[str, Any]) -> dict[str, Any]: ...

    # ── VRP ──────────────────────────────────────────────────────────────
    @abstractmethod
    async def create_vrp_consent(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def get_vrp_consent(self, consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_vrp_consent(self, consent_id: str) -> None: ...

    @abstractmethod
    async def vrp_funds_confirmation(self, consent_id: str, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def execute_vrp(self, data: dict[str, Any], consent_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def get_vrp(self, vrp_id: str) -> dict[str, Any]: ...

    # ── Events ───────────────────────────────────────────────────────────
    @abstractmethod
    async def create_event_subscription(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def get_event_subscriptions(self) -> dict[str, Any]: ...

    @abstractmethod
    async def get_event_subscription(self, sub_id: str) -> dict[str, Any]: ...

    @abstractmethod
    async def update_event_subscription(self, sub_id: str, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    async def delete_event_subscription(self, sub_id: str) -> None: ...

    @abstractmethod
    async def poll_events(self) -> dict[str, Any]: ...

    @abstractmethod
    async def acknowledge_events(self, data: dict[str, Any]) -> None: ...
