from decimal import Decimal

import pytest

from app.services.amortization import monthly_installment, total_interest, total_repayable


class TestMonthlyInstallment:
    def test_classic_loan(self):
        # OMR 10,000 @ 5% over 60 months → ~OMR 188.71
        m = monthly_installment(Decimal("10000.000"), Decimal("5.000"), 60)
        # tolerance 1 fil
        assert abs(m - Decimal("188.712")) < Decimal("0.005")

    def test_zero_rate(self):
        # No interest → straight P / n
        m = monthly_installment(Decimal("12000.000"), Decimal("0"), 60)
        assert m == Decimal("200.000")

    def test_high_rate(self):
        # 18% (credit-card-like) on OMR 5,000 over 24 months → ~OMR 249.62
        m = monthly_installment(Decimal("5000.000"), Decimal("18.000"), 24)
        assert abs(m - Decimal("249.622")) < Decimal("0.005")

    def test_negative_principal_raises(self):
        with pytest.raises(ValueError):
            monthly_installment(Decimal("-100"), Decimal("5"), 60)

    def test_zero_tenor_raises(self):
        with pytest.raises(ValueError):
            monthly_installment(Decimal("1000"), Decimal("5"), 0)


class TestTotals:
    def test_total_repayable(self):
        assert total_repayable(Decimal("200.000"), 60) == Decimal("12000.000")

    def test_total_interest(self):
        # OMR 10k @ 5% × 60mo: total ~11322.74 → interest ~1322.74
        m = monthly_installment(Decimal("10000.000"), Decimal("5.000"), 60)
        ti = total_interest(Decimal("10000.000"), m, 60)
        assert ti > Decimal("1300.000")
        assert ti < Decimal("1400.000")
