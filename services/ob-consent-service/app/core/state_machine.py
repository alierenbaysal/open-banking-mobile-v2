"""Consent state machine — defines valid transitions and enforces them."""

from __future__ import annotations

from enum import Enum


class ConsentStatus(str, Enum):
    """All valid consent statuses per OBIE specification."""

    AWAITING_AUTHORISATION = "AwaitingAuthorisation"
    AUTHORISED = "Authorised"
    REJECTED = "Rejected"
    CONSUMED = "Consumed"
    REVOKED = "Revoked"
    EXPIRED = "Expired"


class ConsentType(str, Enum):
    """Supported consent types."""

    AIS = "account-access"
    DOMESTIC_PAYMENT = "domestic-payment"
    SCHEDULED_PAYMENT = "scheduled-payment"
    STANDING_ORDER = "standing-order"
    VRP = "domestic-vrp"
    COF = "funds-confirmation"


# Which consent types are one-time-use (auto-consumed after first use).
ONE_TIME_CONSENT_TYPES: frozenset[ConsentType] = frozenset({
    ConsentType.DOMESTIC_PAYMENT,
})


# Valid (from_status, to_status) pairs.
_TRANSITIONS: dict[ConsentStatus, frozenset[ConsentStatus]] = {
    ConsentStatus.AWAITING_AUTHORISATION: frozenset({
        ConsentStatus.AUTHORISED,
        ConsentStatus.REJECTED,
    }),
    ConsentStatus.AUTHORISED: frozenset({
        ConsentStatus.CONSUMED,
        ConsentStatus.REVOKED,
        ConsentStatus.EXPIRED,
    }),
    # Terminal states — no outgoing transitions.
    ConsentStatus.REJECTED: frozenset(),
    ConsentStatus.CONSUMED: frozenset(),
    ConsentStatus.REVOKED: frozenset(),
    ConsentStatus.EXPIRED: frozenset(),
}


class InvalidTransitionError(Exception):
    """Raised when a state transition is not allowed."""

    def __init__(self, current: ConsentStatus, target: ConsentStatus) -> None:
        self.current = current
        self.target = target
        super().__init__(f"Cannot transition from {current.value} to {target.value}")


def validate_transition(current: ConsentStatus, target: ConsentStatus) -> None:
    """Raise InvalidTransitionError if the transition is not allowed."""
    allowed = _TRANSITIONS.get(current, frozenset())
    if target not in allowed:
        raise InvalidTransitionError(current, target)


def is_terminal(status: ConsentStatus) -> bool:
    """Return True if the status is terminal (no further transitions)."""
    return len(_TRANSITIONS.get(status, frozenset())) == 0
