"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """OB API Server configuration."""

    service_port: int = 8000
    adapter_mode: str = "mock"
    consent_service_url: str = "http://ob-consent-service:8000"
    log_level: str = "INFO"

    keycloak_issuer_url: str = "https://keycloak.uat.bankdhofar.com/realms/open-banking"
    keycloak_jwks_url: str = ""
    jwt_validation_enabled: bool = True

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()
