"""Money primitive — strict OMR with 3 decimal places (Oman convention)."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Money(BaseModel):
    model_config = ConfigDict(populate_by_name=True, frozen=False)

    amount: str = Field(pattern=r"^\d+\.\d{3}$", description="String to preserve exact precision; 3 decimals")
    currency: Literal["OMR"] = "OMR"

    @field_validator("amount")
    @classmethod
    def _normalise(cls, v: str) -> str:
        # Already enforced by regex but normalise leading zeros.
        d = Decimal(v).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        return f"{d:.3f}"

    def to_decimal(self) -> Decimal:
        return Decimal(self.amount)

    @classmethod
    def from_decimal(cls, value: Decimal | float | int, currency: str = "OMR") -> Money:
        d = Decimal(str(value)).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        return cls(amount=f"{d:.3f}", currency=currency)  # type: ignore[arg-type]
