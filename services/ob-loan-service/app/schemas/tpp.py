"""Sandbox TPP self-signup schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, HttpUrl


class SandboxSignupRequest(BaseModel):
    dealer_name: str = Field(min_length=2, max_length=255)
    cr_number: str = Field(min_length=1, max_length=50)
    rop_dealer_code: str | None = Field(default=None, max_length=50)
    webhook_url: HttpUrl
    contact_email: EmailStr


class SandboxSignupResponse(BaseModel):
    tpp_id: str
    client_id: str
    client_secret: str
    webhook_secret: str
    note: str = "Store secrets immediately — they are not retrievable."
