"""Pydantic models for TPP registry."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class TPPStatus(str, Enum):
    ACTIVE = "Active"
    SUSPENDED = "Suspended"
    REVOKED = "Revoked"


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class CreateTPPRequest(BaseModel):
    """Body for POST /tpp."""

    tpp_id: str = Field(..., min_length=1, max_length=100)
    tpp_name: str = Field(..., min_length=1, max_length=255)
    tpp_name_ar: str | None = Field(None, max_length=255)
    registration_number: str | None = Field(None, max_length=100)
    is_aisp: bool = False
    is_pisp: bool = False
    is_cisp: bool = False
    client_id: str = Field(..., min_length=1, max_length=100)
    redirect_uris: list[str] = Field(..., min_length=1)
    jwks_uri: str | None = None
    software_statement: str | None = None
    logo_uri: str | None = None
    status: TPPStatus = TPPStatus.ACTIVE


class UpdateTPPRequest(BaseModel):
    """Body for PUT /tpp/{tpp_id}. All fields optional."""

    tpp_name: str | None = Field(None, max_length=255)
    tpp_name_ar: str | None = Field(None, max_length=255)
    registration_number: str | None = Field(None, max_length=100)
    is_aisp: bool | None = None
    is_pisp: bool | None = None
    is_cisp: bool | None = None
    redirect_uris: list[str] | None = None
    jwks_uri: str | None = None
    software_statement: str | None = None
    logo_uri: str | None = None
    status: TPPStatus | None = None


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class TPPResponse(BaseModel):
    """Full TPP record."""

    tpp_id: str
    tpp_name: str
    tpp_name_ar: str | None = None
    registration_number: str | None = None
    is_aisp: bool
    is_pisp: bool
    is_cisp: bool
    client_id: str
    redirect_uris: list[str]
    jwks_uri: str | None = None
    software_statement: str | None = None
    logo_uri: str | None = None
    status: TPPStatus
    onboarded_at: datetime
