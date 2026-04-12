"""Consent validation middleware.

Phase 1: validates that an Authorization Bearer token is present.
Phase 2: will forward the token to the consent service for full validation.
"""

from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.errors import OBIEErrorResponse

# Paths that do NOT require a bearer token
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

        # Skip auth for health/docs endpoints
        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            return await call_next(request)

        # Skip auth for non-API paths
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

        # Extract token and store for downstream use
        token = auth_header[7:]
        request.state.bearer_token = token

        # Phase 2: validate token against consent service
        # consent_url = settings.consent_service_url
        # async with httpx.AsyncClient() as client:
        #     resp = await client.post(f"{consent_url}/validate", json={"token": token})
        #     if resp.status_code != 200:
        #         return JSONResponse(status_code=403, content=...)

        return await call_next(request)
