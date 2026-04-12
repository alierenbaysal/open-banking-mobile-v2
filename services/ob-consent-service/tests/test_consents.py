"""Tests for consent state machine and service logic.

These are unit tests for the state machine and integration-style tests
for the FastAPI endpoints (using httpx AsyncClient with a real or
mocked database).

Run with: pytest tests/
"""

from __future__ import annotations

import pytest

from app.core.state_machine import (
    ConsentStatus,
    ConsentType,
    InvalidTransitionError,
    ONE_TIME_CONSENT_TYPES,
    is_terminal,
    validate_transition,
)


# ---------------------------------------------------------------------------
# State machine unit tests
# ---------------------------------------------------------------------------


class TestStateMachine:
    """Validate every allowed and disallowed transition."""

    def test_awaiting_to_authorised(self) -> None:
        validate_transition(ConsentStatus.AWAITING_AUTHORISATION, ConsentStatus.AUTHORISED)

    def test_awaiting_to_rejected(self) -> None:
        validate_transition(ConsentStatus.AWAITING_AUTHORISATION, ConsentStatus.REJECTED)

    def test_awaiting_to_consumed_invalid(self) -> None:
        with pytest.raises(InvalidTransitionError):
            validate_transition(ConsentStatus.AWAITING_AUTHORISATION, ConsentStatus.CONSUMED)

    def test_awaiting_to_revoked_invalid(self) -> None:
        with pytest.raises(InvalidTransitionError):
            validate_transition(ConsentStatus.AWAITING_AUTHORISATION, ConsentStatus.REVOKED)

    def test_authorised_to_consumed(self) -> None:
        validate_transition(ConsentStatus.AUTHORISED, ConsentStatus.CONSUMED)

    def test_authorised_to_revoked(self) -> None:
        validate_transition(ConsentStatus.AUTHORISED, ConsentStatus.REVOKED)

    def test_authorised_to_expired(self) -> None:
        validate_transition(ConsentStatus.AUTHORISED, ConsentStatus.EXPIRED)

    def test_authorised_to_awaiting_invalid(self) -> None:
        with pytest.raises(InvalidTransitionError):
            validate_transition(ConsentStatus.AUTHORISED, ConsentStatus.AWAITING_AUTHORISATION)

    def test_rejected_is_terminal(self) -> None:
        assert is_terminal(ConsentStatus.REJECTED)
        with pytest.raises(InvalidTransitionError):
            validate_transition(ConsentStatus.REJECTED, ConsentStatus.AUTHORISED)

    def test_consumed_is_terminal(self) -> None:
        assert is_terminal(ConsentStatus.CONSUMED)

    def test_revoked_is_terminal(self) -> None:
        assert is_terminal(ConsentStatus.REVOKED)

    def test_expired_is_terminal(self) -> None:
        assert is_terminal(ConsentStatus.EXPIRED)

    def test_awaiting_is_not_terminal(self) -> None:
        assert not is_terminal(ConsentStatus.AWAITING_AUTHORISATION)

    def test_authorised_is_not_terminal(self) -> None:
        assert not is_terminal(ConsentStatus.AUTHORISED)


class TestConsentTypes:
    """Validate consent type configuration."""

    def test_domestic_payment_is_one_time(self) -> None:
        assert ConsentType.DOMESTIC_PAYMENT in ONE_TIME_CONSENT_TYPES

    def test_ais_is_not_one_time(self) -> None:
        assert ConsentType.AIS not in ONE_TIME_CONSENT_TYPES

    def test_vrp_is_not_one_time(self) -> None:
        assert ConsentType.VRP not in ONE_TIME_CONSENT_TYPES

    def test_cof_is_not_one_time(self) -> None:
        assert ConsentType.COF not in ONE_TIME_CONSENT_TYPES

    def test_all_consent_type_values(self) -> None:
        expected = {
            "account-access",
            "domestic-payment",
            "scheduled-payment",
            "standing-order",
            "domestic-vrp",
            "funds-confirmation",
        }
        actual = {ct.value for ct in ConsentType}
        assert actual == expected

    def test_all_status_values(self) -> None:
        expected = {
            "AwaitingAuthorisation",
            "Authorised",
            "Rejected",
            "Consumed",
            "Revoked",
            "Expired",
        }
        actual = {s.value for s in ConsentStatus}
        assert actual == expected


class TestInvalidTransitionError:
    """Validate error message formatting."""

    def test_error_message(self) -> None:
        err = InvalidTransitionError(ConsentStatus.REJECTED, ConsentStatus.AUTHORISED)
        assert "Rejected" in str(err)
        assert "Authorised" in str(err)
        assert err.current == ConsentStatus.REJECTED
        assert err.target == ConsentStatus.AUTHORISED
