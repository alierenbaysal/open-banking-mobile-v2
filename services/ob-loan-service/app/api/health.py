"""Liveness and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app import __version__
from app.core.database import get_pool
from app.core.metrics import render_metrics
from app.core.redis import get_redis

router = APIRouter(tags=["Health"])


@router.get("/healthz", summary="Liveness probe", status_code=200)
async def healthz() -> dict[str, str]:
    return {"status": "ok", "version": __version__}


@router.get("/readyz", summary="Readiness probe")
async def readyz(response: Response) -> dict[str, object]:
    """Verifies DB + Redis are reachable."""
    db_ok = redis_ok = False
    db_err = redis_err = None
    try:
        async with get_pool().acquire() as c:
            await c.fetchval("SELECT 1")
        db_ok = True
    except Exception as e:
        db_err = str(e)
    try:
        await get_redis().ping()
        redis_ok = True
    except Exception as e:
        redis_err = str(e)

    if db_ok and redis_ok:
        response.status_code = status.HTTP_200_OK
    else:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if (db_ok and redis_ok) else "not_ready",
        "checks": {
            "database": {"ok": db_ok, "error": db_err},
            "redis": {"ok": redis_ok, "error": redis_err},
        },
    }


@router.get("/metrics", summary="Prometheus metrics")
async def metrics() -> Response:
    body, media = render_metrics()
    return Response(content=body, media_type=media)
