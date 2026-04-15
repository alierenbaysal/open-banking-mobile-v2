from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.money import Money


class TestMoney:
    def test_construct_valid(self):
        m = Money(amount="12000.000", currency="OMR")
        assert m.to_decimal() == Decimal("12000.000")

    def test_normalises_trailing_zeros(self):
        m = Money(amount="100.500")
        assert m.amount == "100.500"

    def test_rejects_non_3dp(self):
        with pytest.raises(ValidationError):
            Money(amount="100.5")
        with pytest.raises(ValidationError):
            Money(amount="100")

    def test_from_decimal(self):
        m = Money.from_decimal(Decimal("9876.5432"))
        # quantised to 3dp
        assert m.amount == "9876.543"

    def test_from_int(self):
        m = Money.from_decimal(50)
        assert m.amount == "50.000"
