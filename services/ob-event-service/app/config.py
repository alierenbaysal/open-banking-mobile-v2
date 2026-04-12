"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service configuration.

    All values can be overridden via environment variables.
    """

    database_url: str = "postgresql://events:events@localhost:5432/events"
    service_port: int = 8000
    log_level: str = "INFO"

    # Webhook delivery
    webhook_max_retries: int = 5
    webhook_timeout: int = 10  # seconds

    # Connection pool tuning
    db_min_pool_size: int = 5
    db_max_pool_size: int = 20

    # Dispatcher polling interval
    dispatcher_poll_interval: int = 5  # seconds

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
