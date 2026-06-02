"""THEQA SAML 2.0 Service Provider endpoints.

Flow (SAML Web Browser SSO, SP-initiated):

  1. BD Online calls  POST /theqa/verifications {customer_id, purpose}
     -> we create a session (reference UUID) and return the IdP redirect URL
        carrying a signed AuthnRequest with RelayState = reference.
  2. The app opens that URL; the customer approves in the THEQA app.
  3. THEQA SAS POSTs the SAML Response to  POST /theqa/saml/acs.
  4. We validate the assertion, store the asserted national identity against
     the session, and 302 the browser back to the app deep link
        bdonline://verify/callback?ref=<reference>&status=verified|failed
  5. The app polls  GET /theqa/verifications/{reference}  for the result.
"""

from __future__ import annotations

import logging
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse, Response

from app.config import settings
from app.models.verification import (
    StartVerificationRequest,
    StartVerificationResponse,
    VerificationResult,
)
from app.services import saml_provider, verification_service

router = APIRouter(prefix="/theqa", tags=["theqa"])
logger = logging.getLogger(__name__)

# Attribute names THEQA SAS may use for the national/civil id. We probe these
# in order; the exact name is confirmed against the first live assertion.
_NATIONAL_ID_KEYS = (
    "civilId",
    "civil_id",
    "nationalId",
    "national_id",
    "CivilNumber",
    "urn:oid:civilId",
)


async def _request_payload(request: Request) -> tuple[dict, dict]:
    """Return (get_data, post_data) dicts from a FastAPI request."""
    get_data = dict(request.query_params)
    post_data: dict = {}
    if request.method == "POST":
        form = await request.form()
        post_data = {k: v for k, v in form.items()}
    return get_data, post_data


def _host(request: Request) -> str:
    # Prefer the public SP host so signature/destination checks line up,
    # regardless of the in-cluster Host header.
    return settings.saml_sp_base_url.split("://", 1)[-1].rstrip("/")


@router.get("/saml/metadata")
async def metadata() -> Response:
    """SP metadata XML — share with MTCIT, or self-serve for records."""
    xml, errors = saml_provider.sp_metadata()
    if errors:
        logger.error("SP metadata invalid: %s", errors)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Invalid SP metadata: {', '.join(errors)}",
        )
    return Response(content=xml, media_type="application/xml")


@router.post("/verifications", response_model=StartVerificationResponse,
             status_code=status.HTTP_201_CREATED)
async def start_verification(
    req: StartVerificationRequest, request: Request
) -> StartVerificationResponse:
    """Begin a strong-auth verification; returns the THEQA redirect URL."""
    reference = await verification_service.create_session(
        req.customer_id, req.purpose, req.relay_state
    )

    get_data, post_data = await _request_payload(request)
    request_data = saml_provider.prepare_request(
        http_host=_host(request),
        path=settings.saml_sp_acs_path,
        get_data=get_data,
        post_data=post_data,
    )
    auth = saml_provider.build_auth(request_data)
    # RelayState carries our reference back through the IdP to the ACS.
    redirect_url = auth.login(return_to=str(reference))

    return StartVerificationResponse(
        reference=reference, redirect_url=redirect_url, status="pending"
    )


@router.get("/saml/login")
async def saml_login(reference: UUID, request: Request) -> RedirectResponse:
    """Browser-driven alternative to POST /verifications — 302s to the IdP.

    Useful for a webview that opens this URL directly with an existing
    session reference.
    """
    sess = await verification_service.get_session(reference)
    if sess is None:
        raise HTTPException(status_code=404, detail="Unknown verification reference")

    get_data, post_data = await _request_payload(request)
    request_data = saml_provider.prepare_request(
        http_host=_host(request),
        path=settings.saml_sp_acs_path,
        get_data=get_data,
        post_data=post_data,
    )
    auth = saml_provider.build_auth(request_data)
    redirect_url = auth.login(return_to=str(reference))
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.post("/saml/acs")
async def assertion_consumer(request: Request) -> RedirectResponse:
    """Assertion Consumer Service — receives the SAML Response from THEQA."""
    get_data, post_data = await _request_payload(request)
    request_data = saml_provider.prepare_request(
        http_host=_host(request),
        path=settings.saml_sp_acs_path,
        get_data=get_data,
        post_data=post_data,
    )
    auth = saml_provider.build_auth(request_data)
    auth.process_response()
    errors = auth.get_errors()

    relay_state = post_data.get("RelayState") or get_data.get("RelayState")
    reference = _parse_reference(relay_state)

    if errors:
        reason = auth.get_last_error_reason() or ", ".join(errors)
        logger.warning("ACS validation failed (ref=%s): %s", reference, reason)
        if reference:
            await verification_service.fail_session(reference, reason)
        return _back_to_app(reference, "failed")

    if not auth.is_authenticated():
        logger.warning("ACS: not authenticated (ref=%s)", reference)
        if reference:
            await verification_service.fail_session(reference, "not_authenticated")
        return _back_to_app(reference, "failed")

    attributes = auth.get_attributes() or {}
    name_id = auth.get_nameid()
    national_id = _extract_national_id(attributes)

    if reference is None:
        logger.error("ACS: missing/invalid RelayState reference")
        raise HTTPException(status_code=400, detail="Missing verification reference")

    await verification_service.complete_session(
        reference,
        national_id=national_id,
        name_id=name_id,
        attributes={k: v for k, v in attributes.items()},
    )
    logger.info("THEQA verification %s completed (national_id present=%s)",
                reference, national_id is not None)
    return _back_to_app(reference, "verified")


@router.api_route("/saml/sls", methods=["GET", "POST"])
async def single_logout(request: Request) -> RedirectResponse:
    """Single Logout Service — parses logout request/response from THEQA."""
    get_data, post_data = await _request_payload(request)
    request_data = saml_provider.prepare_request(
        http_host=_host(request),
        path=settings.saml_sp_sls_path,
        get_data=get_data,
        post_data=post_data,
    )
    auth = saml_provider.build_auth(request_data)
    url = auth.process_slo(delete_session_cb=lambda: None)
    errors = auth.get_errors()
    if errors:
        logger.warning("SLS errors: %s", errors)
    target = url or settings.app_return_deeplink
    return RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)


@router.get("/verifications/{reference}", response_model=VerificationResult)
async def get_verification(reference: UUID) -> VerificationResult:
    """Poll the result of a verification session."""
    result = await verification_service.get_session(reference)
    if result is None:
        raise HTTPException(status_code=404, detail="Verification not found")
    return result


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _parse_reference(relay_state: str | None) -> UUID | None:
    if not relay_state:
        return None
    try:
        return UUID(relay_state)
    except (ValueError, AttributeError):
        return None


def _extract_national_id(attributes: dict) -> str | None:
    for key in _NATIONAL_ID_KEYS:
        if key in attributes:
            val = attributes[key]
            if isinstance(val, list):
                return str(val[0]) if val else None
            return str(val)
    return None


def _back_to_app(reference: UUID | None, status_value: str) -> RedirectResponse:
    params = {"status": status_value}
    if reference:
        params["ref"] = str(reference)
    url = f"{settings.app_return_deeplink}?{urlencode(params)}"
    return RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
