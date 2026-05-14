"""Consent validation middleware.

When JWT validation is enabled, validates the Bearer token as a Keycloak JWT
and extracts consent_id from claims. Otherwise falls back to treating the
raw token as a consent_id (legacy mode).
"""

from __future__ import annotations

import logging

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings
from app.core.errors import OBIEErrorResponse

logger = logging.getLogger("ob-api-server.consent")

_EXEMPT_PREFIXES = (
    "/health",
    "/ready",
    "/docs",
    "/openapi.json",
    "/redoc",
)


class ConsentValidatorMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        path = request.url.path

        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            return await call_next(request)

        if not path.startswith("/open-banking/"):
            return await call_next(request)

        auth_header = request.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            body = OBIEErrorResponse.build(
                status_code=401,
                error_code="UK.OBIE.Header.Missing",
                message="Authorization header with Bearer token is required",
            )
            return JSONResponse(status_code=401, content=body)

        token = auth_header[7:]
        request.state.bearer_token = token

        if settings.jwt_validation_enabled and token.count(".") == 2:
            from app.auth.jwt_validator import JWTValidationError, get_validator

            try:
                token_info = get_validator().validate(token)
            except JWTValidationError as exc:
                return JSONResponse(status_code=exc.status_code, content=exc.body)

            request.state.token_info = token_info
            request.state.consent_id = token_info.consent_id
            request.state.client_id = token_info.client_id
            logger.debug(
                "JWT validated: client_id=%s consent_id=%s",
                token_info.client_id,
                token_info.consent_id,
            )
        else:
            request.state.consent_id = token
            request.state.token_info = None
            request.state.client_id = None

        return await call_next(request)
