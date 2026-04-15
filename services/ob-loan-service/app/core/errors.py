"""RFC 7807 problem-details error model + exception handler.

All errors leave the API as `application/problem+json` with the shape:

    {
      "type": "https://bd.om/errors/<slug>",
      "title": "<short title>",
      "status": <int>,
      "detail": "<human-readable explanation>",
      "instance": "/loan-applications/abc-123",
      "correlation_id": "<uuid>",
      "errors": [{"field": "...", "message": "..."}]
    }
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import correlation_id_var, get_logger

logger = get_logger(__name__)

ERROR_BASE = "https://bd.om/errors/"


class LoanServiceError(HTTPException):
    """Base for all domain errors. Subclass with type_slug + status_code."""

    type_slug: str = "internal-error"
    title: str = "Internal error"
    status_code: int = 500

    def __init__(
        self,
        detail: str | None = None,
        *,
        errors: list[dict[str, str]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(status_code=self.status_code, detail=detail or self.title, headers=headers)
        self.errors = errors or []


# ─────────────────────────────────────────────────────────────────────
# Concrete error types
# ─────────────────────────────────────────────────────────────────────

class ApplicationNotFound(LoanServiceError):
    type_slug = "application-not-found"
    title = "Application not found"
    status_code = 404


class ApplicationStateConflict(LoanServiceError):
    type_slug = "application-state-conflict"
    title = "Application is in a state that does not permit this operation"
    status_code = 409


class IdempotencyKeyConflict(LoanServiceError):
    type_slug = "idempotency-key-conflict"
    title = "Idempotency-Key reused with a different request body"
    status_code = 409


class ValidationError(LoanServiceError):
    type_slug = "validation-error"
    title = "Request failed validation"
    status_code = 422


class Unauthorized(LoanServiceError):
    type_slug = "unauthorized"
    title = "Authentication required or invalid"
    status_code = 401


class Forbidden(LoanServiceError):
    type_slug = "forbidden"
    title = "Caller is not permitted to perform this action"
    status_code = 403


class RateLimited(LoanServiceError):
    type_slug = "rate-limited"
    title = "Rate limit exceeded"
    status_code = 429


class WebhookNotFound(LoanServiceError):
    type_slug = "webhook-not-found"
    title = "Webhook delivery not found"
    status_code = 404


class DealerNotAutoLender(LoanServiceError):
    type_slug = "dealer-not-auto-lender"
    title = "TPP is not enrolled as an auto-lender"
    status_code = 403


class CustomerNotEligible(LoanServiceError):
    type_slug = "customer-not-eligible"
    title = "Customer does not meet baseline eligibility"
    status_code = 422


# ─────────────────────────────────────────────────────────────────────
# Handlers
# ─────────────────────────────────────────────────────────────────────

def _problem(
    *,
    type_slug: str,
    title: str,
    status: int,
    detail: str | None,
    instance: str | None,
    errors: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    body = {
        "type": ERROR_BASE + type_slug,
        "title": title,
        "status": status,
    }
    if detail is not None and detail != title:
        body["detail"] = detail
    if instance is not None:
        body["instance"] = instance
    if errors:
        body["errors"] = errors
    cid = correlation_id_var.get()
    if cid:
        body["correlation_id"] = cid
    return body


async def loan_service_error_handler(request: Request, exc: LoanServiceError) -> JSONResponse:
    body = _problem(
        type_slug=exc.type_slug,
        title=exc.title,
        status=exc.status_code,
        detail=exc.detail if exc.detail != exc.title else None,
        instance=str(request.url.path),
        errors=exc.errors,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=body,
        media_type="application/problem+json",
        headers=exc.headers,
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Convert plain HTTPExceptions into RFC 7807."""
    title = exc.detail if isinstance(exc.detail, str) else "HTTP error"
    body = _problem(
        type_slug=f"http-{exc.status_code}",
        title=title,
        status=exc.status_code,
        detail=None,
        instance=str(request.url.path),
    )
    return JSONResponse(status_code=exc.status_code, content=body, media_type="application/problem+json")


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [
        {"field": ".".join(str(p) for p in e["loc"][1:]) or e["loc"][0], "message": e["msg"]}
        for e in exc.errors()
    ]
    body = _problem(
        type_slug="validation-error",
        title="Request failed validation",
        status=422,
        detail=f"{len(errors)} validation error(s)",
        instance=str(request.url.path),
        errors=errors,
    )
    return JSONResponse(status_code=422, content=jsonable_encoder(body), media_type="application/problem+json")


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled.exception", path=request.url.path, method=request.method)
    body = _problem(
        type_slug="internal-error",
        title="Internal server error",
        status=500,
        detail=None,
        instance=str(request.url.path),
    )
    return JSONResponse(status_code=500, content=body, media_type="application/problem+json")
