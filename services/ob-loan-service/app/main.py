"""ob-loan-service entrypoint.

Wires middleware, routers, exception handlers, and lifecycle hooks.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import __version__
from app.api import applications, contracts, decisions, disbursements, health, internal, tpps, webhooks
from app.config import settings
from app.core.database import close_pool, init_pool
from app.core.errors import (
    LoanServiceError,
    http_exception_handler,
    loan_service_error_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.logging import configure_logging, get_logger
from app.core.middleware import AccessLogMiddleware, CorrelationIdMiddleware
from app.core.redis import close_redis, init_redis

configure_logging(level=settings.log_level, service=settings.service_name)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    import asyncio
    from app.workers.webhook_worker import webhook_loop

    logger.info("service.start", version=__version__, environment=settings.environment)
    await init_pool()
    await init_redis()

    webhook_task = asyncio.create_task(webhook_loop())
    try:
        yield
    finally:
        logger.info("service.stop")
        webhook_task.cancel()
        try:
            await webhook_task
        except asyncio.CancelledError:
            pass
        await close_redis()
        await close_pool()


app = FastAPI(
    title="Bank Dhofar Open Finance — Auto Loan Origination",
    version=__version__,
    description="Embedded auto-loan origination APIs for registered TPPs.",
    lifespan=lifespan,
    default_response_class=__import__("fastapi.responses", fromlist=["ORJSONResponse"]).ORJSONResponse,
)

# ── Middleware (order matters: outermost first) ─────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
)
app.add_middleware(AccessLogMiddleware)
app.add_middleware(CorrelationIdMiddleware)

# ── Exception handlers ──────────────────────────────────────────────────
app.add_exception_handler(LoanServiceError, loan_service_error_handler)             # type: ignore[arg-type]
app.add_exception_handler(RequestValidationError, validation_exception_handler)     # type: ignore[arg-type]
app.add_exception_handler(StarletteHTTPException, http_exception_handler)           # type: ignore[arg-type]
app.add_exception_handler(Exception, unhandled_exception_handler)

# ── Routers ─────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(applications.router)
app.include_router(decisions.router)
app.include_router(contracts.router)
app.include_router(disbursements.router)
app.include_router(webhooks.router)
app.include_router(tpps.router)
app.include_router(internal.router)
