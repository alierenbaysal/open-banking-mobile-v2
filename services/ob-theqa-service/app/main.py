"""FastAPI application entry point — THEQA SAML SP service."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, saml
from app.config import settings
from app.core.database import close_pool, init_pool

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle."""
    logger.info("Starting ob-theqa-service")
    await init_pool()
    if not settings.saml_idp_x509cert:
        logger.warning(
            "THEQA IdP signing certificate not configured — assertion "
            "validation will reject until SAML_IDP_X509CERT is provided by MTCIT."
        )
    yield
    logger.info("Shutting down ob-theqa-service")
    await close_pool()


app = FastAPI(
    title="Bank Dhofar THEQA Service",
    description="SAML 2.0 Service Provider for MTCIT THEQA SAS — national digital "
    "identity verification (eKYC) for the Qantara Open Banking platform.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(saml.router)
