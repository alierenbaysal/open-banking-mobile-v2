"""Application configuration loaded from environment variables.

THEQA SAML SP configuration. The IdP-side values (entity id, SSO/SLO URLs)
come from MTCIT's staging profile email (2026-05-21). The SP-side certificate
and private key are the ones MTCIT issued against our CSR (RSA 3072) — they are
injected at runtime from the `qantara-theqa-saml` K8s secret, never baked into
the image.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Service configuration. All values overridable via environment variables."""

    database_url: str = "postgresql://theqa:theqa@localhost:5432/theqa"
    service_port: int = 8000
    log_level: str = "INFO"

    # Connection pool tuning
    db_min_pool_size: int = 5
    db_max_pool_size: int = 20

    # ---- SP (Bank Dhofar) ----
    # Entity ID = the profile id MTCIT created for us on SAS staging.
    saml_sp_entity_id: str = "36f54cb6-f700-46b0-81d3-5caa4ad322f0"
    # Registered with MTCIT (Emrah → Asma, 2026-05-18): the SP lives on the
    # qantara-api DMZ host, ACS/SLS under /auth/saml/. Must match exactly or
    # THEQA's SAML Destination/AudienceRestriction checks fail.
    saml_sp_base_url: str = "https://qantara-api.omtd.bankdhofar.com"
    saml_sp_acs_path: str = "/auth/saml/acs"
    saml_sp_sls_path: str = "/auth/saml/sls"
    # PEM contents (not paths) — injected from the qantara-theqa-saml secret.
    saml_sp_x509cert: str = ""
    saml_sp_private_key: str = ""

    # ---- IdP (MTCIT THEQA SAS) ---- (from staging profile email)
    saml_idp_entity_id: str = "https://SASIdp"
    saml_idp_sso_url: str = "https://stg-idp-pki.mtcit.gov.om/Idp/SingleSignOnService"
    saml_idp_slo_url: str = "https://stg-idp-pki.mtcit.gov.om/Idp/SingleLogoutService"
    # IdP signing certificate — to be provided by MTCIT (or pulled from IdP
    # metadata once the tunnel is up). Required before assertions can be
    # validated; until then strict validation will (correctly) reject.
    saml_idp_x509cert: str = ""

    # ---- Security profile ----
    saml_strict: bool = True
    saml_debug: bool = False
    # THEQA SAS expects signed AuthnRequests and signs its assertions.
    saml_authn_requests_signed: bool = True
    saml_want_assertions_signed: bool = True

    # ---- Mobile return ----
    # Deep link the BD Online app registers; we redirect here after ACS.
    app_return_deeplink: str = "bdonline://verify/callback"

    model_config = {"env_prefix": "", "case_sensitive": False}

    @property
    def acs_url(self) -> str:
        return f"{self.saml_sp_base_url.rstrip('/')}{self.saml_sp_acs_path}"

    @property
    def sls_url(self) -> str:
        return f"{self.saml_sp_base_url.rstrip('/')}{self.saml_sp_sls_path}"


settings = Settings()
