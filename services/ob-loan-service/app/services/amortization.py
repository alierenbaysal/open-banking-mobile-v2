"""Amortization math.

Standard installment loan formula:

    M = P * r / (1 - (1 + r)^-n)

where P = principal, r = monthly rate (annual / 12 / 100), n = tenor in months.

Returns Decimals (3-dp OMR convention).
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal


def monthly_installment(principal: Decimal, annual_rate_pct: Decimal, tenor_months: int) -> Decimal:
    """Compute fixed monthly installment for an annuity-style loan."""
    if tenor_months <= 0:
        raise ValueError("tenor_months must be positive")
    if principal <= 0:
        raise ValueError("principal must be positive")

    if annual_rate_pct == 0:
        return _q(principal / Decimal(tenor_months))

    r = annual_rate_pct / Decimal(12) / Decimal(100)
    factor = (Decimal(1) + r) ** Decimal(tenor_months)
    monthly = principal * r * factor / (factor - Decimal(1))
    return _q(monthly)


def total_repayable(monthly: Decimal, tenor_months: int) -> Decimal:
    return _q(monthly * Decimal(tenor_months))


def total_interest(principal: Decimal, monthly: Decimal, tenor_months: int) -> Decimal:
    return _q(monthly * Decimal(tenor_months) - principal)


def _q(value: Decimal) -> Decimal:
    """Quantize to OMR 3-decimal convention."""
    return value.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
