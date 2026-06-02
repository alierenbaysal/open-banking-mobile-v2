"""AsyncPG connection pool management."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_pool() -> asyncpg.Pool:
    """Create the connection pool. Called once at startup."""
    global _pool
    if _pool is not None:
        return _pool

    logger.info("Creating database connection pool")
    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=settings.db_min_pool_size,
        max_size=settings.db_max_pool_size,
    )
    logger.info("Database pool created (min=%d, max=%d)", settings.db_min_pool_size, settings.db_max_pool_size)
    return _pool


async def close_pool() -> None:
    """Close the connection pool. Called once at shutdown."""
    global _pool
    if _pool is not None:
        logger.info("Closing database connection pool")
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    """Return the active pool. Raises if not initialised."""
    if _pool is None:
        raise RuntimeError("Database pool not initialised — call init_pool() first")
    return _pool


@asynccontextmanager
async def acquire() -> AsyncIterator[asyncpg.Connection]:
    """Acquire a connection from the pool as an async context manager."""
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn
