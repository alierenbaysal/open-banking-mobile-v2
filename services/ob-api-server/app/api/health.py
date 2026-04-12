"""Health and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ob-api-server"}


@router.get("/ready")
async def ready():
    return {"status": "ready", "service": "ob-api-server"}
