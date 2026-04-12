"""FastAPI application for the OBIE Event Subscription & Notification service."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.polling import router as events_router
from app.api.subscriptions import router as subscriptions_router
from app.config import settings
from app.core.database import close_pool, init_pool
from app.workers.webhook_dispatcher import start_dispatcher, stop_dispatcher

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifecycle — database pool and background workers."""
    logger.info("Starting ob-event-service")
    await init_pool()
    start_dispatcher()
    yield
    logger.info("Shutting down ob-event-service")
    await stop_dispatcher()
    await close_pool()


app = FastAPI(
    title="OB Event Service",
    description="OBIE-compliant event subscription and webhook notification service for Qantara Open Banking",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health_router)
app.include_router(subscriptions_router)
app.include_router(events_router)
