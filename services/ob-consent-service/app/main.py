"""FastAPI application entry point."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import banking, consents, health, tpp, validation
from app.config import settings
from app.core.database import close_pool, init_pool
from app.workers.expiration import expiration_loop

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown lifecycle.

    1. Create the database connection pool.
    2. Launch the background expiration worker.
    3. On shutdown, cancel the worker and close the pool.
    """
    logger.info("Starting ob-consent-service")
    await init_pool()

    expiration_task = asyncio.create_task(expiration_loop())

    yield

    logger.info("Shutting down ob-consent-service")
    expiration_task.cancel()
    try:
        await expiration_task
    except asyncio.CancelledError:
        pass

    await close_pool()


app = FastAPI(
    title="Bank Dhofar Open Banking Consent Service",
    description="OBIE-compliant consent lifecycle management for Qantara Open Banking platform.",
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

# Mount routers
app.include_router(health.router)
app.include_router(consents.router)
app.include_router(validation.router)
app.include_router(tpp.router)
app.include_router(banking.router)
