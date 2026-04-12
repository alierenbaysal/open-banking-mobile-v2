"""Background task that periodically expires stale consents."""

from __future__ import annotations

import asyncio
import logging

from app.config import settings
from app.services.consent_service import expire_stale_consents

logger = logging.getLogger(__name__)


async def expiration_loop() -> None:
    """Run forever, expiring stale consents on a configurable interval."""
    interval = settings.consent_cleanup_interval
    logger.info("Consent expiration worker started (interval=%ds)", interval)

    while True:
        try:
            count = await expire_stale_consents()
            if count:
                logger.info("Expiration sweep: expired %d consents", count)
        except asyncio.CancelledError:
            logger.info("Expiration worker cancelled — shutting down")
            raise
        except Exception:
            logger.exception("Expiration sweep failed")

        await asyncio.sleep(interval)
