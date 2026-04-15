"""Cross-cutting middleware: correlation IDs, request logging, metrics."""

from __future__ import annotations

import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import correlation_id_var, get_logger

logger = get_logger(__name__)


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Read X-Correlation-ID header (or mint one), bind it to the contextvar,
    and echo it back in the response."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        cid = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())
        token = correlation_id_var.set(cid)
        try:
            response: Response = await call_next(request)
            response.headers["X-Correlation-ID"] = cid
            return response
        finally:
            correlation_id_var.reset(token)


class AccessLogMiddleware(BaseHTTPMiddleware):
    """One log line per request — JSON, structured, includes timing."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "http.request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                elapsed_ms=round(elapsed_ms, 2),
                client_ip=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
            )
            return response
        except Exception:
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "http.request.error",
                method=request.method,
                path=request.url.path,
                elapsed_ms=round(elapsed_ms, 2),
            )
            raise
