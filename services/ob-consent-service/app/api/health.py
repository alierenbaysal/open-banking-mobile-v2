"""Health check endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.core.database import get_pool

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    status: str
    database: str


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check() -> HealthResponse:
    """Liveness / readiness probe.

    Returns 200 if the service is up and can reach the database.
    Returns 503 if the database is unreachable.
    """
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return HealthResponse(status="healthy", database="connected")
    except Exception as exc:
        logger.warning("Health check failed: %s", exc)
        return HealthResponse(status="degraded", database=f"error: {exc}")
