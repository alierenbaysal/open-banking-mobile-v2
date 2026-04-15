"""Loan-application endpoints (POST/GET/list/cancel)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Query, Request, status

from app.core import idempotency, rate_limit
from app.core.auth import AuthedDealer
from app.core.errors import IdempotencyKeyConflict, ValidationError
from app.core.metrics import applications_created_total
from app.schemas.application import (
    Application,
    ApplicationListPage,
    CancelRequest,
    CreateApplicationRequest,
)
from app.services import application_service
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/loan-applications", tags=["Applications"])


def _normalise_environment(env_header: str | None, principal_env: str) -> str:
    if env_header is None:
        return principal_env
    if env_header not in ("sandbox", "production"):
        raise ValidationError(
            "X-BD-Environment must be 'sandbox' or 'production'",
            errors=[{"field": "X-BD-Environment", "message": "must be sandbox or production"}],
        )
    return env_header


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=Application,
    summary="Create a loan application and return a QR for the customer",
)
async def create_application(
    request: Request,
    body: CreateApplicationRequest,
    principal: AuthedDealer,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)],
    bd_environment: Annotated[str | None, Header(alias="X-BD-Environment")] = None,
) -> JSONResponse:
    await rate_limit.consume(principal.tpp_id)
    env = _normalise_environment(bd_environment, principal.environment)

    raw = await request.body()
    req_hash = idempotency.hash_request(request.method, request.url.path, raw)
    try:
        cached = await idempotency.lookup(key=idempotency_key, tpp_id=principal.tpp_id, request_hash=req_hash)
    except ValueError:
        raise IdempotencyKeyConflict()
    if cached is not None:
        cached_status, cached_body = cached
        return JSONResponse(status_code=cached_status, content=cached_body)

    app = await application_service.create_application(
        dealer_id=principal.tpp_id,
        environment=env,
        req=body,
    )
    applications_created_total.labels(dealer_id=principal.tpp_id, environment=env).inc()

    body_out = app.model_dump(mode="json")
    await idempotency.store(
        key=idempotency_key, tpp_id=principal.tpp_id, request_hash=req_hash,
        response_status=201, response_body=body_out,
    )
    return JSONResponse(status_code=201, content=body_out)


@router.get(
    "",
    response_model=ApplicationListPage,
    summary="List the dealer's own applications",
)
async def list_applications(
    principal: AuthedDealer,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> ApplicationListPage:
    items = await application_service.list_applications(
        dealer_id=principal.tpp_id,
        status=status_filter,
        limit=limit,
    )
    return ApplicationListPage(items=items)


@router.get(
    "/{application_id}",
    response_model=Application,
    summary="Get an application by ID",
)
async def get_application(application_id: UUID, principal: AuthedDealer) -> Application:
    return await application_service.get_application(application_id, dealer_id=principal.tpp_id)


@router.post(
    "/{application_id}/cancel",
    response_model=Application,
    summary="Cancel a pending application",
)
async def cancel_application(
    application_id: UUID,
    body: CancelRequest,
    principal: AuthedDealer,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)],
) -> Application:
    await rate_limit.consume(principal.tpp_id)
    return await application_service.cancel_application(
        application_id=application_id,
        dealer_id=principal.tpp_id,
        reason=body.reason,
    )
