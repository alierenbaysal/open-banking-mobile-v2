"""Keycloak JWT validation for OBIE FAPI-compliant access tokens."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

import httpx
import jwt
from jwt import PyJWKClient, PyJWKClientError

from app.config import settings
from app.core.errors import OBIEErrorResponse

logger = logging.getLogger("ob-api-server.auth")

JWKS_CACHE_TTL = 300  # 5 minutes


@dataclass
class TokenInfo:
    client_id: str
    consent_id: str | None
    scopes: list[str]
    cert_thumbprint: str | None
    raw_claims: dict = field(default_factory=dict)


class JWTValidationError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code
        self.body = OBIEErrorResponse.build(
            status_code=status_code,
            error_code="UK.OBIE.Unauthorized",
            message=message,
        )
        super().__init__(message)


class KeycloakJWTValidator:
    def __init__(self) -> None:
        self._jwks_client: PyJWKClient | None = None
        self._jwks_last_refresh: float = 0.0
        self._issuer = settings.keycloak_issuer_url.rstrip("/")
        self._jwks_url = (
            settings.keycloak_jwks_url
            or f"{self._issuer}/protocol/openid-connect/certs"
        )

    def _get_jwks_client(self) -> PyJWKClient:
        now = time.monotonic()
        if self._jwks_client is None or (now - self._jwks_last_refresh) > JWKS_CACHE_TTL:
            self._jwks_client = PyJWKClient(self._jwks_url, cache_keys=True)
            self._jwks_last_refresh = now
        return self._jwks_client

    def validate(self, token: str) -> TokenInfo:
        try:
            signing_key = self._get_jwks_client().get_signing_key_from_jwt(token)
        except PyJWKClientError as exc:
            logger.warning("JWKS key lookup failed: %s", exc)
            raise JWTValidationError("Unable to verify token signature") from exc
        except Exception as exc:
            logger.warning("JWKS fetch error: %s", exc)
            raise JWTValidationError("Unable to fetch signing keys") from exc

        try:
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["PS256", "RS256"],
                issuer=self._issuer,
                options={
                    "require": ["exp", "iat", "iss"],
                    "verify_aud": False,
                },
            )
        except jwt.ExpiredSignatureError:
            raise JWTValidationError("Token has expired")
        except jwt.InvalidIssuerError:
            raise JWTValidationError("Invalid token issuer")
        except jwt.InvalidTokenError as exc:
            logger.warning("JWT validation failed: %s", exc)
            raise JWTValidationError("Invalid access token") from exc

        client_id = claims.get("azp") or claims.get("client_id", "")

        consent_id = claims.get("consent_id") or claims.get("openbanking_intent_id")

        scope_raw = claims.get("scope", "")
        if isinstance(scope_raw, str):
            scopes = scope_raw.split() if scope_raw else []
        else:
            scopes = list(scope_raw)

        cert_thumbprint: str | None = None
        cnf = claims.get("cnf")
        if isinstance(cnf, dict):
            cert_thumbprint = cnf.get("x5t#S256")

        return TokenInfo(
            client_id=client_id,
            consent_id=consent_id,
            scopes=scopes,
            cert_thumbprint=cert_thumbprint,
            raw_claims=claims,
        )


_validator: KeycloakJWTValidator | None = None


def get_validator() -> KeycloakJWTValidator:
    global _validator
    if _validator is None:
        _validator = KeycloakJWTValidator()
    return _validator
