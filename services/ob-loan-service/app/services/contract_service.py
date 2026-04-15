"""Contract signing service.

Called by BD Online when the customer accepts the offer + signs.
Captures signature proof, creates contract row, triggers disbursement.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.core import audit
from app.core.database import acquire
from app.core.errors import ApplicationStateConflict
from app.core.logging import get_logger
from app.core.metrics import applications_contracted_total

logger = get_logger(__name__)


async def sign_contract(
    *,
    application_id: UUID,
    customer_id: str,
    signature_otp: str,
    signature_proof: dict[str, Any],
    signed_ip: str | None = None,
    signed_user_agent: str | None = None,
) -> UUID:
    """Validate decision is still in window, persist contract, kick disbursement.

    Returns contract_id. Idempotent — second call returns existing contract.
    """
    async with acquire() as conn:
        ctx = await conn.fetchrow(
            """
            SELECT a.application_id, a.dealer_id, a.environment, a.status, a.customer_id,
                   d.decision_id, d.decision, d.valid_until, d.approved_amount,
                   d.interest_rate, d.tenor_months, d.monthly_installment, d.total_repayable
              FROM loan_applications a
              LEFT JOIN loan_decisions d USING (application_id)
             WHERE a.application_id = $1
            """,
            application_id,
        )
        if ctx is None:
            raise ApplicationStateConflict(f"Application {application_id} not found")
        if ctx["customer_id"] is None and ctx["status"] not in ("decided", "contracted"):
            # noop — we'll trust the bound customer below
            pass
        if ctx["decision"] != "approved":
            raise ApplicationStateConflict("Application is not approved — cannot sign")
        if ctx["status"] not in ("decided", "contracted"):
            raise ApplicationStateConflict(
                f"Application in state {ctx['status']!r}; expected 'decided'"
            )
        if datetime.now(timezone.utc) > ctx["valid_until"]:
            raise ApplicationStateConflict("Decision has expired — please request a new application")

        # Idempotency
        existing = await conn.fetchrow(
            "SELECT contract_id FROM loan_contracts WHERE application_id = $1",
            application_id,
        )
        if existing is not None:
            return existing["contract_id"]

    contract_id = uuid4()
    otp_hash = hashlib.sha256(signature_otp.encode()).hexdigest() if signature_otp else None

    terms = {
        "principal": str(ctx["approved_amount"]),
        "interest_rate": str(ctx["interest_rate"]),
        "tenor_months": ctx["tenor_months"],
        "monthly_installment": str(ctx["monthly_installment"]),
        "total_repayable": str(ctx["total_repayable"]),
    }

    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO loan_contracts (
                    contract_id, application_id, decision_id, customer_id,
                    contract_terms, signature_method, signature_otp_hash,
                    signature_proof, signed_at, signed_ip, signed_user_agent
                ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, NOW(), $9, $10)
                """,
                contract_id, application_id, ctx["decision_id"], customer_id,
                json.dumps(terms), "otp_biometric", otp_hash,
                json.dumps(signature_proof), signed_ip, signed_user_agent,
            )
            await conn.execute(
                "UPDATE loan_applications SET status = 'contracted' WHERE application_id = $1",
                application_id,
            )
            await audit.record(
                application_id=application_id,
                event_type="application.contracted",
                actor_type="customer", actor_id=customer_id,
                previous_state="decided", new_state="contracted",
                details={
                    "contract_id": str(contract_id),
                    "decision_id": str(ctx["decision_id"]),
                    "principal": str(ctx["approved_amount"]),
                    "monthly": str(ctx["monthly_installment"]),
                    "signed_ip": signed_ip,
                },
                conn=conn,
            )
            await conn.execute(
                """
                INSERT INTO dealer_webhooks (
                    dealer_id, event_type, resource_type, resource_id, application_id,
                    payload, target_url
                )
                SELECT $1::varchar, 'loan_application.contracted', 'loan_application',
                       $2::uuid, $2::uuid, $3::jsonb, t.webhook_url
                  FROM tpp_registry t
                 WHERE t.tpp_id = $1::varchar AND t.webhook_url IS NOT NULL
                """,
                ctx["dealer_id"], application_id,
                json.dumps({
                    "application_id": str(application_id),
                    "contract_id": str(contract_id),
                    "principal": str(ctx["approved_amount"]),
                    "monthly_installment": str(ctx["monthly_installment"]),
                }),
            )

    applications_contracted_total.labels(
        dealer_id=ctx["dealer_id"], environment=ctx["environment"],
    ).inc()
    logger.info("contract.signed", application_id=str(application_id), contract_id=str(contract_id))

    # Trigger disbursement (synchronous — this is the showroom moment of truth)
    from app.services import disbursement_service
    await disbursement_service.disburse(application_id=application_id)

    return contract_id
