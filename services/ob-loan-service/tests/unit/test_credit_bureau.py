import pytest

from app.services.credit_bureau import fetch_score


@pytest.mark.asyncio
class TestFetchScore:
    async def test_known_prime_customer(self):
        r = await fetch_score("CUST-001")
        assert r.score == 782
        assert r.band == "prime"
        assert r.has_active_defaults is False

    async def test_known_subprime_customer(self):
        r = await fetch_score("CUST-004")
        assert r.score == 612
        assert r.band == "sub_prime"

    async def test_unknown_customer_thin_file(self):
        r = await fetch_score("CUST-DOESNOTEXIST")
        # falls back to near-prime
        assert r.score == 680
        assert r.band == "near_prime"
        assert "thin_file" in str(r.raw)
