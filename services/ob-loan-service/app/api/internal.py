"""Internal endpoints — called by BD Online (the customer-facing bank app), not by TPPs.

These are not in the public OpenAPI catalog. They live behind the cluster network
boundary and authenticate via a shared internal-services token.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, status

from app.core.database import acquire
from app.core.errors import ApplicationNotFound, Unauthorized

router = APIRouter(prefix="/internal/v1", tags=["Internal"], include_in_schema=False)

# In production this would be a JWT signed by an internal IDP. For MVP a shared
# secret pulled from settings is enough.
_INTERNAL_TOKEN = "bd-internal-loan-svc-token-CHANGE-ME"


def _check_internal_auth(token: str | None) -> None:
    if not token or token != _INTERNAL_TOKEN:
        raise Unauthorized("Invalid internal-services token")


@router.get("/loan-applications/{application_id}/scan-info")
async def scan_info(
    application_id: UUID,
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
) -> dict[str, object]:
    """Called by BD Online when a customer scans a QR — returns the info needed
    to render the consent screen."""
    _check_internal_auth(x_internal_token)
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT a.application_id, a.status, a.dealer_id, a.qr_expires_at,
                   a.vehicle_make, a.vehicle_model, a.vehicle_year,
                   a.vehicle_price, a.requested_amount, a.down_payment,
                   a.requested_tenor_months, a.environment,
                   t.tpp_name AS dealer_name
              FROM loan_applications a
              JOIN tpp_registry t ON t.tpp_id = a.dealer_id
             WHERE a.application_id = $1
            """,
            application_id,
        )
    if row is None:
        raise ApplicationNotFound()

    expired = datetime.now(row["qr_expires_at"].tzinfo) > row["qr_expires_at"]
    return {
        "application_id": str(row["application_id"]),
        "status": row["status"],
        "expired": expired,
        "dealer": {"id": row["dealer_id"], "name": row["dealer_name"]},
        "vehicle": {
            "make": row["vehicle_make"],
            "model": row["vehicle_model"],
            "year": row["vehicle_year"],
            "price": str(row["vehicle_price"]),
        },
        "request": {
            "amount": str(row["requested_amount"]),
            "down_payment": str(row["down_payment"]),
            "tenor_months": row["requested_tenor_months"],
        },
        "environment": row["environment"],
    }


@router.post("/loan-applications/{application_id}/customer-consent", status_code=status.HTTP_200_OK)
async def customer_consent(
    application_id: UUID,
    body: dict[str, object],
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
) -> dict[str, str]:
    """Customer has consented in BD Online. Bind the consent_id + customer_id
    to the application and trigger the decision engine.

    The actual decision-engine wiring lands in L4."""
    _check_internal_auth(x_internal_token)
    customer_id = body.get("customer_id")
    consent_id = body.get("consent_id")
    if not isinstance(customer_id, str) or not isinstance(consent_id, str):
        raise Unauthorized("customer_id and consent_id required")

    async with acquire() as conn:
        async with conn.transaction():
            res = await conn.execute(
                """
                UPDATE loan_applications
                   SET customer_id = $1, consent_id = $2::uuid, status = 'pending_decision'
                 WHERE application_id = $3 AND status = 'pending_consent'
                """,
                customer_id, consent_id, application_id,
            )
            if res.endswith(" 0"):
                raise ApplicationNotFound("Application not found or not in pending_consent state")

    # Run the decision engine synchronously — keeps the showroom UX snappy
    # (typically <500 ms) and avoids extra moving parts vs. background jobs.
    from app.services import decision_engine
    decision = await decision_engine.decide(application_id)
    decision_outcome = decision.get("decision")

    # Queue a webhook to the dealer (delivery worker drains in L6).
    await _enqueue_decision_webhook(application_id, decision_outcome)

    return {"status": "decided", "decision": decision_outcome or "unknown"}


@router.get("/loan-applications/{application_id}/customer-view")
async def customer_view(
    application_id: UUID,
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
) -> dict[str, object]:
    """BD Online polls this while customer is on /loan/offer/:id.
    Returns app + decision in customer-friendly shape."""
    _check_internal_auth(x_internal_token)
    async with acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT a.*, d.decision AS d_decision, d.approved_amount, d.interest_rate,
                   d.tenor_months AS d_tenor, d.monthly_installment, d.total_repayable,
                   d.total_interest, d.decline_reasons, d.decided_at, d.valid_until
              FROM loan_applications a
              LEFT JOIN loan_decisions d USING (application_id)
             WHERE a.application_id = $1
            """,
            application_id,
        )
    if row is None:
        raise ApplicationNotFound()

    decision = None
    if row["d_decision"]:
        decision = {
            "decision": row["d_decision"],
            "approved_amount": {"amount": f"{row['approved_amount']:.3f}", "currency": "OMR"} if row["approved_amount"] is not None else None,
            "interest_rate": float(row["interest_rate"]) if row["interest_rate"] is not None else None,
            "tenor_months": row["d_tenor"],
            "monthly_installment": {"amount": f"{row['monthly_installment']:.3f}", "currency": "OMR"} if row["monthly_installment"] is not None else None,
            "total_repayable": {"amount": f"{row['total_repayable']:.3f}", "currency": "OMR"} if row["total_repayable"] is not None else None,
            "total_interest": {"amount": f"{row['total_interest']:.3f}", "currency": "OMR"} if row["total_interest"] is not None else None,
            "decline_reasons": row["decline_reasons"],
            "decided_at": row["decided_at"].isoformat() if row["decided_at"] else None,
            "valid_until": row["valid_until"].isoformat() if row["valid_until"] else None,
        }

    return {
        "application_id": str(row["application_id"]),
        "status": row["status"],
        "customer_id": row["customer_id"],
        "vehicle": {
            "make": row["vehicle_make"],
            "model": row["vehicle_model"],
            "year": row["vehicle_year"],
        },
        "requested_amount": {"amount": f"{row['requested_amount']:.3f}", "currency": "OMR"},
        "down_payment": {"amount": f"{row['down_payment']:.3f}", "currency": "OMR"},
        "requested_tenor_months": row["requested_tenor_months"],
        "decision": decision,
        "environment": row["environment"],
    }


@router.post("/loan-applications/{application_id}/sign", status_code=status.HTTP_200_OK)
async def sign_contract(
    application_id: UUID,
    body: dict[str, object],
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
) -> dict[str, str]:
    """Customer accepted offer + signed in BD Online — persist contract and disburse."""
    _check_internal_auth(x_internal_token)

    customer_id = body.get("customer_id")
    signature_otp = body.get("signature_otp", "")
    signature_proof = body.get("signature_proof", {})
    signed_ip = body.get("signed_ip")
    signed_user_agent = body.get("signed_user_agent")

    if not isinstance(customer_id, str):
        raise Unauthorized("customer_id required")
    if not isinstance(signature_otp, str) or not signature_otp:
        raise Unauthorized("signature_otp required")
    if not isinstance(signature_proof, dict):
        raise Unauthorized("signature_proof must be an object")

    from app.services import contract_service
    contract_id = await contract_service.sign_contract(
        application_id=application_id,
        customer_id=customer_id,
        signature_otp=signature_otp,
        signature_proof=signature_proof,
        signed_ip=signed_ip if isinstance(signed_ip, str) else None,
        signed_user_agent=signed_user_agent if isinstance(signed_user_agent, str) else None,
    )
    return {"status": "disbursed", "contract_id": str(contract_id)}


async def _enqueue_decision_webhook(application_id: UUID, outcome: object) -> None:
    import json

    from app.core.database import acquire as _acq
    event = "loan_application.decided" if outcome == "approved" else "loan_application.declined"
    async with _acq() as conn:
        row = await conn.fetchrow(
            "SELECT a.dealer_id, t.webhook_url FROM loan_applications a "
            "JOIN tpp_registry t ON t.tpp_id = a.dealer_id WHERE a.application_id = $1",
            application_id,
        )
        if not row or not row["webhook_url"]:
            return
        await conn.execute(
            """
            INSERT INTO dealer_webhooks (
                dealer_id, event_type, resource_type, resource_id, application_id,
                payload, target_url
            ) VALUES ($1, $2, 'loan_application', $3, $3, $4::jsonb, $5)
            """,
            row["dealer_id"], event, application_id,
            json.dumps({"application_id": str(application_id), "decision": outcome}),
            row["webhook_url"],
        )
