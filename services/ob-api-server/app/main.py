"""OB API Server — OBIE v4.0 compliant Open Banking API for Bank Dhofar."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.errors import OBIEError, obie_error_handler
from app.middleware.fapi_headers import FAPIHeaderMiddleware
from app.middleware.consent_validator import ConsentValidatorMiddleware

# Routers
from app.api.health import router as health_router
from app.api.ais.consents import router as ais_consents_router
from app.api.ais.accounts import router as ais_accounts_router
from app.api.ais.bulk import router as ais_bulk_router
from app.api.pis.consents import router as pis_consents_router
from app.api.pis.domestic import router as pis_domestic_router
from app.api.pis.scheduled import router as pis_scheduled_router
from app.api.pis.standing_orders import router as pis_standing_orders_router
from app.api.pis.international import router as pis_international_router
from app.api.cof.funds import router as cof_funds_router
from app.api.vrp.vrp import router as vrp_router
from app.api.events.events import router as events_router

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger("ob-api-server")

app = FastAPI(
    title="Bank Dhofar Open Banking API",
    description="OBIE v4.0 compliant API server for the Qantara Open Banking platform",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware (applied bottom-up: last added = first executed) ──────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-fapi-interaction-id"],
)

app.add_middleware(FAPIHeaderMiddleware)
app.add_middleware(ConsentValidatorMiddleware)

# ── Exception handlers ──────────────────────────────────────────────────

app.add_exception_handler(OBIEError, obie_error_handler)

# ── Routers ─────────────────────────────────────────────────────────────

app.include_router(health_router)
app.include_router(ais_consents_router)
app.include_router(ais_accounts_router)
app.include_router(ais_bulk_router)
app.include_router(pis_consents_router)
app.include_router(pis_domestic_router)
app.include_router(pis_scheduled_router)
app.include_router(pis_standing_orders_router)
app.include_router(pis_international_router)
app.include_router(cof_funds_router)
app.include_router(vrp_router)
app.include_router(events_router)


@app.on_event("startup")
async def startup():
    logger.info(
        "OB API Server starting — adapter=%s port=%s",
        settings.adapter_mode,
        settings.service_port,
    )


@app.on_event("shutdown")
async def shutdown():
    logger.info("OB API Server shutting down")
