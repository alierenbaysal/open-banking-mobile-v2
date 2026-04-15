"""Mala'a credit-bureau stub.

In production this calls Mala'a's REST API with the customer's National ID.
For MVP we return deterministic synthetic scores keyed off customer_id, so
demos and tests are reproducible.

Score ranges (industry convention, mirroring Mala'a 300–900 scale):
  prime       : 750+    → best rates
  near_prime  : 650–749 → standard rates + 50bps
  sub_prime   : <650    → standard rates + 200bps or decline
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

ScoreBand = Literal["prime", "near_prime", "sub_prime"]


@dataclass(frozen=True)
class BureauResult:
    score: int
    band: ScoreBand
    has_active_defaults: bool
    enquiries_last_90d: int
    raw: dict[str, object]


# Deterministic synthetic table for our seeded test customers.
_SYNTHETIC: dict[str, BureauResult] = {
    # CUST-001 emrahbaysal@gmail.com — high earner, clean record
    "CUST-001": BureauResult(
        score=782, band="prime", has_active_defaults=False, enquiries_last_90d=1,
        raw={"source": "stub", "tier": "prime"},
    ),
    # CUST-002 fatima — solid prime
    "CUST-002": BureauResult(
        score=725, band="near_prime", has_active_defaults=False, enquiries_last_90d=2,
        raw={"source": "stub", "tier": "near_prime"},
    ),
    # CUST-003 ahmed — disciplined, mid
    "CUST-003": BureauResult(
        score=698, band="near_prime", has_active_defaults=False, enquiries_last_90d=0,
        raw={"source": "stub", "tier": "near_prime"},
    ),
    # CUST-004 sara — heavy spender, recent late repayment
    "CUST-004": BureauResult(
        score=612, band="sub_prime", has_active_defaults=False, enquiries_last_90d=4,
        raw={"source": "stub", "tier": "sub_prime", "note": "recent late payment on credit card"},
    ),
}


async def fetch_score(customer_id: str) -> BureauResult:
    """Return a (deterministic) bureau result for a customer."""
    if customer_id in _SYNTHETIC:
        return _SYNTHETIC[customer_id]
    # Fall back to a "thin file" near-prime — in real life Mala'a would say "no record".
    return BureauResult(
        score=680, band="near_prime", has_active_defaults=False, enquiries_last_90d=0,
        raw={"source": "stub", "tier": "thin_file", "note": "no record — defaulted to near-prime"},
    )
