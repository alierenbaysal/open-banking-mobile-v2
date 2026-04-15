"""Disbursement orchestration.

When a contract is signed:
  1. Insert a loan_disbursements row (status=pending).
  2. (production env) Call ob-consent-service /banking/transfers to move
     OMR from the BD lending pool → dealer's BD account.
     (sandbox env) Skip the actual transfer, just mark complete.
  3. Insert auto_loans row + loan_standing_orders row for monthly repayment.
  4. Update application status to 'disbursed'.
  5. Queue dealer webhook.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from app.config import settings
from app.core import audit
from app.core.database import acquire
from app.core.errors import ApplicationStateConflict
from app.core.logging import get_logger
from app.core.metrics import (
    applications_disbursed_total,
    disbursement_total,
)
from app.services.banking_client import BankingClientError, execute_transfer, get_customer_primary_account

logger = get_logger(__name__)


async def disburse(*, application_id: UUID, dealer_account_id: str | None = None) -> UUID:
    """Execute disbursement for a contract that was just signed.

    Returns the disbursement_id. Idempotent — if a disbursement row already
    exists for the contract, returns the existing id.
    """
    async with acquire() as conn:
        ctx = await conn.fetchrow(
            """
            SELECT a.application_id, a.dealer_id, a.environment, a.customer_id,
                   a.requested_tenor_months, c.contract_id,
                   d.approved_amount, d.interest_rate, d.tenor_months, d.monthly_installment
              FROM loan_applications a
              JOIN loan_contracts c USING (application_id)
              JOIN loan_decisions d USING (application_id)
             WHERE a.application_id = $1
            """,
            application_id,
        )
        if ctx is None:
            raise ApplicationStateConflict("Application has no signed contract — cannot disburse")

        # Idempotency
        existing = await conn.fetchrow(
            "SELECT disbursement_id FROM loan_disbursements WHERE contract_id = $1",
            ctx["contract_id"],
        )
        if existing is not None:
            return existing["disbursement_id"]

    customer_id: str = ctx["customer_id"]
    dealer_id: str = ctx["dealer_id"]
    environment: str = ctx["environment"]
    contract_id: UUID = ctx["contract_id"]
    principal: Decimal = Decimal(str(ctx["approved_amount"]))
    monthly: Decimal = Decimal(str(ctx["monthly_installment"]))
    rate: Decimal = Decimal(str(ctx["interest_rate"]))
    tenor: int = int(ctx["tenor_months"])

    # If dealer_account_id wasn't passed, look it up from the dealer's TPP profile.
    if dealer_account_id is None:
        async with acquire() as conn:
            row = await conn.fetchrow(
                "SELECT account_id FROM accounts WHERE customer_id = (SELECT replace(tpp_id,'-','') "
                "FROM tpp_registry WHERE tpp_id = $1) LIMIT 1",
                dealer_id,
            )
        # Fallback: hard-coded mapping for muscat-motors → CUST-MMOT
        if row is None:
            async with acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT account_id FROM accounts WHERE customer_id = 'CUST-MMOT' LIMIT 1"
                )
        dealer_account_id = row["account_id"]

    disb_id = uuid4()
    txn_id: str | None = None
    status_out = "pending"
    err: str | None = None

    # Insert disbursement row first (state-tracking)
    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                INSERT INTO loan_disbursements (
                    disbursement_id, contract_id, application_id, amount, currency,
                    source_account_id, dealer_account_id, status, environment
                ) VALUES ($1, $2, $3, $4, 'OMR', $5, $6, 'pending', $7)
                """,
                disb_id, contract_id, application_id, principal,
                settings.lending_pool_account_id, dealer_account_id, environment,
            )
            await audit.record(
                application_id=application_id, event_type="disbursement.queued",
                actor_type="system", actor_id="disbursement-service",
                details={"disbursement_id": str(disb_id), "amount": str(principal)},
                conn=conn,
            )

    # Execute transfer (production) or simulate (sandbox)
    if environment == "production":
        try:
            result = await execute_transfer(
                customer_id="CUST-BDLEND",
                source_account_id=settings.lending_pool_account_id,
                target_account_id=dealer_account_id,
                amount=principal,
                reference=f"AUTO-LOAN-{application_id}",
                description=f"Auto-loan disbursement for application {application_id}",
            )
            txn_id = result.get("source_transaction_id") or result.get("transfer_id")
            status_out = "completed"
        except BankingClientError as e:
            err = str(e)
            status_out = "failed"
            disbursement_total.labels(environment=environment, outcome="failed").inc()
    else:
        # sandbox: log only
        txn_id = f"SANDBOX-{disb_id.hex[:12]}"
        status_out = "completed"

    # Update disbursement row + create auto_loans + standing order
    async with acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE loan_disbursements
                   SET status = $1, transaction_id = $2, executed_at = NOW(),
                       attempts = 1, last_error = $3
                 WHERE disbursement_id = $4
                """,
                status_out, txn_id, err, disb_id,
            )

            if status_out == "completed":
                # Get customer's primary account (where salary lands → repayments come from)
                cust_acct = await get_customer_primary_account(customer_id)
                if cust_acct is None:
                    cust_acct = await conn.fetchval(
                        "SELECT account_id FROM accounts WHERE customer_id = $1 ORDER BY balance DESC LIMIT 1",
                        customer_id,
                    )

                first_due = date.today() + timedelta(days=30)
                end_date = date.today() + timedelta(days=30 * tenor)

                so_id = uuid4()
                await conn.execute(
                    """
                    INSERT INTO loan_standing_orders (
                        standing_order_id, loan_id, source_account_id, destination_account_id,
                        amount, frequency, next_run_date, end_date, status
                    ) VALUES ($1, NULL, $2, $3, $4, 'monthly', $5, $6, 'active')
                    """,
                    so_id, cust_acct, settings.repayment_collection_account_id,
                    monthly, first_due, end_date,
                )

                loan_id = uuid4()
                await conn.execute(
                    """
                    INSERT INTO auto_loans (
                        loan_id, contract_id, customer_id, source_account_id,
                        principal, interest_rate, tenor_months, monthly_installment,
                        outstanding_principal, paid_installments, next_payment_date,
                        status, standing_order_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $5, 0, $9, 'active', $10)
                    """,
                    loan_id, contract_id, customer_id, cust_acct,
                    principal, rate, tenor, monthly, first_due, so_id,
                )
                await conn.execute(
                    "UPDATE loan_standing_orders SET loan_id = $1 WHERE standing_order_id = $2",
                    loan_id, so_id,
                )

                await conn.execute(
                    "UPDATE loan_applications SET status = 'disbursed' WHERE application_id = $1",
                    application_id,
                )

                await audit.record(
                    application_id=application_id, event_type="application.disbursed",
                    actor_type="system", actor_id="disbursement-service",
                    previous_state="contracted", new_state="disbursed",
                    details={
                        "disbursement_id": str(disb_id),
                        "loan_id": str(loan_id),
                        "standing_order_id": str(so_id),
                        "transaction_id": txn_id,
                        "first_payment_date": str(first_due),
                    },
                    conn=conn,
                )
                applications_disbursed_total.labels(dealer_id=dealer_id, environment=environment).inc()
                disbursement_total.labels(environment=environment, outcome="success").inc()

                # Queue webhook (drained by L6 worker)
                await conn.execute(
                    """
                    INSERT INTO dealer_webhooks (
                        dealer_id, event_type, resource_type, resource_id, application_id,
                        payload, target_url
                    )
                    SELECT $1, 'loan_application.disbursed', 'loan_application', $2, $2,
                           $3::jsonb, t.webhook_url
                      FROM tpp_registry t
                     WHERE t.tpp_id = $1 AND t.webhook_url IS NOT NULL
                    """,
                    dealer_id, application_id,
                    json.dumps({
                        "application_id": str(application_id),
                        "disbursement_id": str(disb_id),
                        "amount": str(principal),
                        "transaction_id": txn_id,
                        "dealer_account_id": dealer_account_id,
                    }),
                )

    logger.info(
        "disbursement.processed",
        application_id=str(application_id),
        disbursement_id=str(disb_id),
        environment=environment,
        status=status_out,
        amount=str(principal),
        error=err,
    )
    return disb_id
