"""Sandbox self-serve TPP onboarding."""

from __future__ import annotations

import re
import secrets

from fastapi import APIRouter, status

from app.core.database import acquire
from app.schemas.tpp import SandboxSignupRequest, SandboxSignupResponse

router = APIRouter(prefix="/tpp", tags=["TPP Onboarding"])

_SLUG = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    s = _SLUG.sub("-", name.lower()).strip("-")
    return s[:60] or "dealer"


@router.post(
    "/sandbox-signup",
    response_model=SandboxSignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Self-serve sandbox dealer registration",
)
async def sandbox_signup(req: SandboxSignupRequest) -> SandboxSignupResponse:
    base = _slugify(req.dealer_name)
    suffix = secrets.token_hex(2)
    tpp_id = f"sb-{base}-{suffix}"
    client_secret = secrets.token_urlsafe(48)
    webhook_secret = secrets.token_urlsafe(48)

    async with acquire() as conn:
        await conn.execute(
            """
            INSERT INTO tpp_registry (
                tpp_id, tpp_name, registration_number,
                is_aisp, is_pisp, is_cisp, is_auto_lender,
                client_id, client_secret, redirect_uris, status,
                cr_number, rop_dealer_code, webhook_url, webhook_secret, environment
            ) VALUES (
                $1, $2, NULL,
                FALSE, FALSE, FALSE, TRUE,
                $1, $3,
                ARRAY[$4]::text[], 'Active',
                $5, $6, $4, $7, 'sandbox'
            )
            """,
            tpp_id, req.dealer_name, client_secret,
            str(req.webhook_url), req.cr_number, req.rop_dealer_code, webhook_secret,
        )

    return SandboxSignupResponse(
        tpp_id=tpp_id,
        client_id=tpp_id,
        client_secret=client_secret,
        webhook_secret=webhook_secret,
    )
