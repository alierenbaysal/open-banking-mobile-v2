"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service configuration.

    All values can be overridden via environment variables.
    """

    database_url: str = "postgresql://consent:consent@localhost:5432/consent"
    service_port: int = 8000
    log_level: str = "INFO"
    consent_default_expiry_days: int = 180
    consent_cleanup_interval: int = 3600  # seconds

    # Connection pool tuning
    db_min_pool_size: int = 5
    db_max_pool_size: int = 20

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
