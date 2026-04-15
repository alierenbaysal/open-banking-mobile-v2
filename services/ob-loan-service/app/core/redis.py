"""Redis client (idempotency cache + rate-limit token buckets)."""

from __future__ import annotations

import redis.asyncio as aredis

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_client: aredis.Redis | None = None


async def init_redis() -> aredis.Redis:
    global _client
    if _client is None:
        logger.info("redis.init", url=settings.redis_url.split("@")[-1])
        _client = aredis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
        # Verify connection
        await _client.ping()
    return _client


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


def get_redis() -> aredis.Redis:
    if _client is None:
        raise RuntimeError("Redis client not initialised — call init_redis() first")
    return _client
