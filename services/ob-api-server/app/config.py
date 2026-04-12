"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """OB API Server configuration."""

    service_port: int = 8000
    adapter_mode: str = "mock"
    consent_service_url: str = "http://ob-consent-service:8000"
    log_level: str = "INFO"

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
