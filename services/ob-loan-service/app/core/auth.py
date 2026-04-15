"""TPP authentication.

Two equivalent paths are accepted (per OAuth2 RFC 6749 §2.3.1):

  1. **HTTP Basic** — `Authorization: Basic base64(client_id:client_secret)`
     — simplest, used by most SDKs.
  2. **Bearer token** — `Authorization: Bearer <jwt>` issued by `/oauth/token`
     using the `client_credentials` grant.

For MVP we only implement (1) end-to-end and stub (2) — JWT issuance is
trivial to add later without changing endpoints.
"""

from __future__ import annotations

import base64
import secrets
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request

from app.core.database import acquire
from app.core.errors import DealerNotAutoLender, Unauthorized
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class Principal:
    """Authenticated TPP context bound to the request."""
    tpp_id: str
    client_id: str
    is_auto_lender: bool
    environment: str            # configured env in tpp_registry
    webhook_url: str | None
    webhook_secret: str | None


async def _decode_basic_auth(header: str) -> tuple[str, str]:
    if not header.lower().startswith("basic "):
        raise Unauthorized("Authorization header must use Basic scheme for client_credentials")
    try:
        decoded = base64.b64decode(header.split(" ", 1)[1]).decode("utf-8")
        client_id, client_secret = decoded.split(":", 1)
    except Exception as e:
        raise Unauthorized("Malformed Basic credentials") from e
    return client_id, client_secret


async def authenticate_tpp(request: Request) -> Principal:
    auth = request.headers.get("Authorization")
    if not auth:
        raise Unauthorized("Missing Authorization header")

    client_id, client_secret = await _decode_basic_auth(auth)

    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT tpp_id, client_id, client_secret, is_auto_lender, environment,
                   webhook_url, webhook_secret, status
              FROM tpp_registry
             WHERE client_id = $1
            """,
            client_id,
        )

    if row is None:
        logger.warning("auth.unknown_client_id", client_id=client_id)
        raise Unauthorized("Invalid client credentials")

    if row["status"] != "Active":
        raise Unauthorized(f"TPP is in status {row['status']!r}")

    expected = row["client_secret"]
    if expected is None or not secrets.compare_digest(expected, client_secret):
        logger.warning("auth.bad_secret", client_id=client_id)
        raise Unauthorized("Invalid client credentials")

    return Principal(
        tpp_id=row["tpp_id"],
        client_id=row["client_id"],
        is_auto_lender=row["is_auto_lender"],
        environment=row["environment"] or "sandbox",
        webhook_url=row["webhook_url"],
        webhook_secret=row["webhook_secret"],
    )


async def require_auto_lender(
    principal: Annotated[Principal, Depends(authenticate_tpp)],
) -> Principal:
    if not principal.is_auto_lender:
        raise DealerNotAutoLender(
            f"TPP {principal.tpp_id!r} is not registered as an auto-lender. "
            "Contact openbanking@bankdhofar.com to enrol."
        )
    return principal


AuthedDealer = Annotated[Principal, Depends(require_auto_lender)]
