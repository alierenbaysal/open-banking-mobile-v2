"""Consent CRUD endpoints."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.state_machine import InvalidTransitionError
from app.models.consent import (
    AuthorizeConsentRequest,
    ConsentHistoryEntry,
    ConsentResponse,
    CreateConsentRequest,
    RejectConsentRequest,
)
from app.services import audit_service, consent_service

router = APIRouter(prefix="/consents", tags=["consents"])
logger = logging.getLogger(__name__)


@router.post("", response_model=ConsentResponse, status_code=status.HTTP_201_CREATED)
async def create_consent(req: CreateConsentRequest) -> ConsentResponse:
    """Create a new consent request (all types).

    The consent starts in AwaitingAuthorisation status.
    """
    try:
        return await consent_service.create_consent(req)
    except Exception as exc:
        logger.exception("Failed to create consent")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("", response_model=list[ConsentResponse])
async def list_consents(
    customer_id: str | None = Query(None),
    tpp_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
) -> list[ConsentResponse]:
    """List consents, optionally filtered."""
    return await consent_service.list_consents(customer_id, tpp_id, status_filter)


@router.get("/{consent_id}", response_model=ConsentResponse)
async def get_consent(consent_id: UUID) -> ConsentResponse:
    """Retrieve a consent by its ID."""
    consent = await consent_service.get_consent(consent_id)
    if consent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent not found")
    return consent


@router.delete("/{consent_id}", response_model=ConsentResponse)
async def revoke_consent(
    consent_id: UUID,
    reason: str | None = Query(None, description="Revocation reason"),
) -> ConsentResponse:
    """Revoke (delete) an authorised consent.

    This is the OBIE DELETE endpoint. The consent transitions to Revoked.
    """
    try:
        return await consent_service.revoke_consent(
            consent_id,
            actor_type="TPP",
            reason=reason or "Revoked by TPP",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/{consent_id}/authorize", response_model=ConsentResponse)
async def authorize_consent(consent_id: UUID, req: AuthorizeConsentRequest) -> ConsentResponse:
    """Customer authorizes a consent (called from DEH mobile app)."""
    try:
        return await consent_service.authorize_consent(consent_id, req)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/{consent_id}/reject", response_model=ConsentResponse)
async def reject_consent(consent_id: UUID, req: RejectConsentRequest) -> ConsentResponse:
    """Customer rejects a consent (called from DEH mobile app or on timeout)."""
    try:
        return await consent_service.reject_consent(consent_id, req)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post("/{consent_id}/consume", response_model=ConsentResponse)
async def consume_consent(consent_id: UUID) -> ConsentResponse:
    """Mark a one-time consent as consumed (PIS only, called internally)."""
    try:
        return await consent_service.consume_consent(consent_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except InvalidTransitionError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get("/{consent_id}/history", response_model=list[ConsentHistoryEntry])
async def get_consent_history(consent_id: UUID) -> list[ConsentHistoryEntry]:
    """Return the full audit trail for a consent."""
    # Verify consent exists first.
    consent = await consent_service.get_consent(consent_id)
    if consent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent not found")
    rows = await audit_service.get_history(consent_id)
    return [ConsentHistoryEntry(**r) for r in rows]
