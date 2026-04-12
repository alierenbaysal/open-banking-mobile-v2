"""TPP registry endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.models.tpp import CreateTPPRequest, TPPResponse, UpdateTPPRequest
from app.services import tpp_service

router = APIRouter(prefix="/tpp", tags=["tpp"])
logger = logging.getLogger(__name__)


@router.post("", response_model=TPPResponse, status_code=status.HTTP_201_CREATED)
async def register_tpp(req: CreateTPPRequest) -> TPPResponse:
    """Register a new Third Party Provider."""
    try:
        return await tpp_service.create_tpp(req)
    except Exception as exc:
        logger.exception("Failed to register TPP %s", req.tpp_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{tpp_id}", response_model=TPPResponse)
async def get_tpp(tpp_id: str) -> TPPResponse:
    """Retrieve a TPP by ID."""
    tpp = await tpp_service.get_tpp(tpp_id)
    if tpp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TPP not found")
    return tpp


@router.put("/{tpp_id}", response_model=TPPResponse)
async def update_tpp(tpp_id: str, req: UpdateTPPRequest) -> TPPResponse:
    """Update an existing TPP record. Only provided fields are changed."""
    tpp = await tpp_service.update_tpp(tpp_id, req)
    if tpp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TPP not found")
    return tpp


@router.get("", response_model=list[TPPResponse])
async def list_tpps(
    status_filter: str | None = Query(None, alias="status", description="Filter by TPP status"),
) -> list[TPPResponse]:
    """List all registered TPPs, optionally filtered by status."""
    return await tpp_service.list_tpps(status=status_filter)
