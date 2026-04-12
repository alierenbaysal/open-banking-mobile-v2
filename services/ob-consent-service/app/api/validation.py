"""Internal consent validation endpoint.

Called by ob-api-server on every incoming TPP request to verify that
the consent is still valid, has the required permission, and covers
the requested account.
"""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Query

from app.models.consent import ConsentValidationResponse
from app.services import consent_service

router = APIRouter(tags=["validation"])
logger = logging.getLogger(__name__)


@router.get("/consents/{consent_id}/validate", response_model=ConsentValidationResponse)
async def validate_consent(
    consent_id: UUID,
    permission: str | None = Query(None, description="Required OBIE permission code"),
    account_id: str | None = Query(None, description="Account being accessed"),
) -> ConsentValidationResponse:
    """Validate a consent for an incoming API request.

    Returns a JSON payload with ``valid: true/false`` and a ``reason``
    if validation fails. The ob-api-server uses this to gate every
    resource request.
    """
    result = await consent_service.validate_consent(
        consent_id=consent_id,
        required_permission=permission,
        account_id=account_id,
    )
    return result
