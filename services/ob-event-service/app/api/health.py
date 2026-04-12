"""Health check endpoint."""

from __future__ import annotations

import logging

from fastapi import APIRouter

from app.core.database import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    """Return service health status.

    Checks database connectivity by running a simple query.
    """
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "ok"
    except Exception:
        logger.exception("Health check database probe failed")
        db_status = "error"

    status = "healthy" if db_status == "ok" else "degraded"
    return {
        "status": status,
        "service": "ob-event-service",
        "checks": {
            "database": db_status,
        },
    }
