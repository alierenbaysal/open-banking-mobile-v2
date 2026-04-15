"""Runtime settings loaded from env vars (12-factor)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── Service identity ─────────────────────────────────────────────────
    service_name: str = "ob-loan-service"
    service_version: str = "1.0.0"
    environment: str = Field(default="tnd", description="Deployment env: tnd|sit|uat|stg|prod")
    log_level: str = "INFO"

    # ── Database ────────────────────────────────────────────────────────
    database_url: str = Field(..., description="postgres://… DSN for the qantara DB")
    db_min_pool_size: int = 5
    db_max_pool_size: int = 20

    # ── Redis (idempotency + rate limiting + decision caching) ──────────
    redis_url: str = Field(default="redis://localhost:6379/2", description="Redis DSN")

    # ── Banking API (existing ob-consent-service) ────────────────────────
    banking_api_base_url: str = Field(
        default="http://ob-consent-service:8000/banking",
        description="Internal URL for the existing banking API (transfers, accounts).",
    )

    # ── Decision engine ─────────────────────────────────────────────────
    decision_engine_version: str = "v1.0.0"
    qr_ttl_seconds: int = 600           # 10 min showroom QR
    decision_validity_seconds: int = 600  # offer valid for 10 min after decision

    # CBO regulatory parameters
    max_dbr: float = 0.50               # 50% Debt-Burden-Ratio cap
    min_monthly_income_omr: float = 400.0
    min_loan_omr: float = 500.0
    max_loan_omr: float = 50000.0
    min_tenor_months: int = 12
    max_tenor_months: int = 84
    income_multiple_max: float = 50.0   # max loan = 50× monthly net income

    # ── Lending & collection accounts ───────────────────────────────────
    lending_pool_account_id: str = "DHOF-99001"
    repayment_collection_account_id: str = "DHOF-99002"

    # ── Rate limiting (per-dealer token bucket) ─────────────────────────
    rate_limit_per_minute: int = 60     # default; can be overridden per TPP

    # ── Idempotency window ──────────────────────────────────────────────
    idempotency_ttl_seconds: int = 86400  # 24 h

    # ── Webhook delivery ─────────────────────────────────────────────────
    webhook_max_attempts: int = 8
    webhook_initial_backoff_seconds: int = 1


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
