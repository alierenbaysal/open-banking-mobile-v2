"""Banking API — single source of truth for account data.

Internal service-to-service API. No auth required.
Reads from the ``qantara`` PostgreSQL database (customers, accounts, transactions tables).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.database import acquire

router = APIRouter(prefix="/banking", tags=["banking"])
logger = logging.getLogger(__name__)

_TZ_OMAN = timezone(timedelta(hours=4))


# ── Request / Response models ───────────────────────────────────────────

class TransferRequest(BaseModel):
    customer_id: str
    source_account_id: str
    target_account_id: str
    amount: float = Field(gt=0)
    currency: str = "OMR"
    reference: str = ""
    description: str = ""


class TransferResponse(BaseModel):
    transfer_id: str
    source_transaction_id: str
    target_transaction_id: str
    amount: float
    currency: str
    source_account_id: str
    target_account_id: str
    source_balance_after: float
    target_balance_after: float
    reference: str
    status: str
    created_at: str


class AddBeneficiaryRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    name_ar: str = Field("", max_length=200)
    iban: str = Field(..., min_length=15, max_length=34)
    bank_name: str = Field("", max_length=200)
    bank_code: str = Field("", max_length=20)
    nickname: str = Field("", max_length=100)


class MasroofiRegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)
    name: str = Field(..., min_length=1, max_length=100)


class MasroofiLoginRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


class MasroofiUpdateBankRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    consent_id: str = Field("", max_length=100)
    bank_token: str = Field("", max_length=500)


# ── Helpers ─────────────────────────────────────────────────────────────

def _row_to_dict(row) -> dict[str, Any]:
    """Convert an asyncpg Record to a plain dict, serialising Decimals."""
    d: dict[str, Any] = dict(row)
    for k, v in d.items():
        if isinstance(v, Decimal):
            d[k] = float(v)
        elif isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


# ── Customers ───────────────────────────────────────────────────────────

@router.get("/customers/{customer_id}")
async def get_customer(customer_id: str) -> dict[str, Any]:
    """Get customer info."""
    async with acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM customers WHERE customer_id = $1",
            customer_id,
        )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer {customer_id} not found")
    return _row_to_dict(row)


@router.get("/customers/{customer_id}/accounts")
async def get_customer_accounts(customer_id: str) -> list[dict[str, Any]]:
    """Get all accounts for a customer with balances."""
    async with acquire() as conn:
        # Verify customer exists
        cust = await conn.fetchrow(
            "SELECT customer_id FROM customers WHERE customer_id = $1",
            customer_id,
        )
        if not cust:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer {customer_id} not found")

        rows = await conn.fetch(
            """SELECT a.*, c.first_name, c.last_name, c.first_name_ar, c.last_name_ar
               FROM accounts a
               JOIN customers c ON c.customer_id = a.customer_id
               WHERE a.customer_id = $1
               ORDER BY a.account_id""",
            customer_id,
        )
    return [_row_to_dict(r) for r in rows]


# ── Accounts ────────────────────────────────────────────────────────────

@router.get("/accounts/by-ids")
async def get_accounts_by_ids(ids: str = Query(..., description="Comma-separated account IDs")) -> list[dict[str, Any]]:
    """Get multiple accounts by their IDs."""
    account_ids = [aid.strip() for aid in ids.split(",") if aid.strip()]
    if not account_ids:
        return []

    async with acquire() as conn:
        rows = await conn.fetch(
            """SELECT a.*, c.first_name, c.last_name, c.first_name_ar, c.last_name_ar
               FROM accounts a
               JOIN customers c ON c.customer_id = a.customer_id
               WHERE a.account_id = ANY($1)
               ORDER BY a.account_id""",
            account_ids,
        )
    return [_row_to_dict(r) for r in rows]


@router.get("/accounts/{account_id}")
async def get_account(account_id: str) -> dict[str, Any]:
    """Get a single account."""
    async with acquire() as conn:
        row = await conn.fetchrow(
            """SELECT a.*, c.first_name, c.last_name, c.first_name_ar, c.last_name_ar
               FROM accounts a
               JOIN customers c ON c.customer_id = a.customer_id
               WHERE a.account_id = $1""",
            account_id,
        )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account {account_id} not found")
    return _row_to_dict(row)


@router.get("/accounts/{account_id}/balances")
async def get_account_balances(account_id: str) -> dict[str, Any]:
    """Get account balance."""
    async with acquire() as conn:
        row = await conn.fetchrow(
            "SELECT account_id, balance, currency, status FROM accounts WHERE account_id = $1",
            account_id,
        )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account {account_id} not found")
    return _row_to_dict(row)


@router.get("/accounts/{account_id}/transactions")
async def get_account_transactions(
    account_id: str,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[dict[str, Any]]:
    """Get transactions for an account."""
    async with acquire() as conn:
        # Verify account exists
        acct = await conn.fetchrow(
            "SELECT account_id FROM accounts WHERE account_id = $1",
            account_id,
        )
        if not acct:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Account {account_id} not found")

        rows = await conn.fetch(
            """SELECT * FROM transactions
               WHERE account_id = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3""",
            account_id,
            limit,
            offset,
        )
    return [_row_to_dict(r) for r in rows]


# ── Beneficiaries ──────────────────────────────────────────────────────


@router.get("/customers/{customer_id}/beneficiaries")
async def list_beneficiaries(customer_id: str) -> list[dict[str, Any]]:
    """List all beneficiaries for a customer."""
    async with acquire() as conn:
        cust = await conn.fetchrow(
            "SELECT customer_id FROM customers WHERE customer_id = $1",
            customer_id,
        )
        if not cust:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer {customer_id} not found")

        rows = await conn.fetch(
            """SELECT beneficiary_id, customer_id, name, name_ar, iban,
                      bank_name, bank_code, nickname, created_at
               FROM beneficiaries
               WHERE customer_id = $1
               ORDER BY created_at DESC""",
            customer_id,
        )
    return [_row_to_dict(r) for r in rows]


@router.post("/customers/{customer_id}/beneficiaries", status_code=status.HTTP_201_CREATED)
async def add_beneficiary(customer_id: str, req: AddBeneficiaryRequest) -> dict[str, Any]:
    """Add a new beneficiary for a customer."""
    async with acquire() as conn:
        cust = await conn.fetchrow(
            "SELECT customer_id FROM customers WHERE customer_id = $1",
            customer_id,
        )
        if not cust:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer {customer_id} not found")

        beneficiary_id = f"BEN-{uuid.uuid4().hex[:12].upper()}"
        now = datetime.now(_TZ_OMAN)

        await conn.execute(
            """INSERT INTO beneficiaries
               (beneficiary_id, customer_id, name, name_ar, iban,
                bank_name, bank_code, nickname, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)""",
            beneficiary_id,
            customer_id,
            req.name,
            req.name_ar,
            req.iban.upper().replace(" ", ""),
            req.bank_name,
            req.bank_code,
            req.nickname,
            now,
        )

        row = await conn.fetchrow(
            "SELECT * FROM beneficiaries WHERE beneficiary_id = $1",
            beneficiary_id,
        )
    return _row_to_dict(row)


@router.delete("/beneficiaries/{beneficiary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_beneficiary(beneficiary_id: str) -> None:
    """Remove a beneficiary."""
    async with acquire() as conn:
        result = await conn.execute(
            "DELETE FROM beneficiaries WHERE beneficiary_id = $1",
            beneficiary_id,
        )
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Beneficiary {beneficiary_id} not found",
            )


# ── Masroofi Users ─────────────────────────────────────────────────────

_MASROOFI_TABLE_CREATED = False


async def _ensure_masroofi_table(conn) -> None:
    """Create the masroofi_users table if it doesn't exist (idempotent)."""
    global _MASROOFI_TABLE_CREATED
    if _MASROOFI_TABLE_CREATED:
        return
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS masroofi_users (
            email VARCHAR(255) PRIMARY KEY,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            consent_id VARCHAR(100),
            bank_token VARCHAR(500),
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    _MASROOFI_TABLE_CREATED = True


@router.post("/masroofi/register", status_code=status.HTTP_201_CREATED)
async def masroofi_register(req: MasroofiRegisterRequest) -> dict[str, Any]:
    """Register a new Masroofi user account."""
    async with acquire() as conn:
        await _ensure_masroofi_table(conn)

        existing = await conn.fetchrow(
            "SELECT email FROM masroofi_users WHERE email = $1",
            req.email,
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists",
            )

        now = datetime.now(_TZ_OMAN)
        await conn.execute(
            """INSERT INTO masroofi_users (email, password, name, created_at)
               VALUES ($1, $2, $3, $4)""",
            req.email,
            req.password,
            req.name,
            now,
        )

    return {
        "email": req.email,
        "name": req.name,
        "created_at": now.isoformat(),
    }


@router.post("/masroofi/login")
async def masroofi_login(req: MasroofiLoginRequest) -> dict[str, Any]:
    """Login to a Masroofi user account."""
    async with acquire() as conn:
        await _ensure_masroofi_table(conn)

        row = await conn.fetchrow(
            "SELECT email, password, name, consent_id, bank_token, created_at FROM masroofi_users WHERE email = $1",
            req.email,
        )

    if not row or row["password"] != req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    result = _row_to_dict(row)
    del result["password"]
    return result


@router.post("/masroofi/update-bank")
async def masroofi_update_bank(req: MasroofiUpdateBankRequest) -> dict[str, Any]:
    """Update a Masroofi user's bank connection details."""
    async with acquire() as conn:
        await _ensure_masroofi_table(conn)

        result = await conn.execute(
            """UPDATE masroofi_users
               SET consent_id = $1, bank_token = $2
               WHERE email = $3""",
            req.consent_id or None,
            req.bank_token or None,
            req.email,
        )

    if result == "UPDATE 0":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Masroofi user {req.email} not found",
        )

    return {"email": req.email, "status": "updated"}


# ── Transfers ───────────────────────────────────────────────────────────

@router.post("/transfers", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def execute_transfer(req: TransferRequest) -> TransferResponse:
    """Execute a transfer between two accounts.

    In a single database transaction:
    1. Validate source account belongs to the customer
    2. Check sufficient balance
    3. Debit source, credit target
    4. Create two transaction records
    5. Update both balances
    """
    async with acquire() as conn:
        async with conn.transaction():
            # Lock both accounts (consistent order to avoid deadlock)
            ordered_ids = sorted([req.source_account_id, req.target_account_id])
            for aid in ordered_ids:
                await conn.fetchrow(
                    "SELECT account_id FROM accounts WHERE account_id = $1 FOR UPDATE",
                    aid,
                )

            # Validate source account belongs to customer
            source = await conn.fetchrow(
                "SELECT account_id, customer_id, balance, currency, iban FROM accounts WHERE account_id = $1",
                req.source_account_id,
            )
            if not source:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Source account {req.source_account_id} not found",
                )
            if source["customer_id"] != req.customer_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Source account does not belong to the specified customer",
                )

            # Validate target account exists
            target = await conn.fetchrow(
                "SELECT account_id, balance, currency, iban FROM accounts WHERE account_id = $1",
                req.target_account_id,
            )
            if not target:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Target account {req.target_account_id} not found",
                )

            # Check sufficient balance
            source_balance = float(source["balance"])
            if source_balance < req.amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient balance: {source_balance:.3f} {req.currency} available, {req.amount:.3f} requested",
                )

            # Calculate new balances
            new_source_balance = round(source_balance - req.amount, 3)
            new_target_balance = round(float(target["balance"]) + req.amount, 3)

            # Update balances
            await conn.execute(
                "UPDATE accounts SET balance = $1 WHERE account_id = $2",
                Decimal(str(new_source_balance)),
                req.source_account_id,
            )
            await conn.execute(
                "UPDATE accounts SET balance = $1 WHERE account_id = $2",
                Decimal(str(new_target_balance)),
                req.target_account_id,
            )

            # Create transaction records
            now = datetime.now(_TZ_OMAN)
            transfer_ref = req.reference or f"TRF-{uuid.uuid4().hex[:12].upper()}"

            source_txn_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
            await conn.execute(
                """INSERT INTO transactions
                   (transaction_id, account_id, amount, currency, direction,
                    description, reference, counterparty_name, counterparty_iban,
                    balance_after, transaction_type, status, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)""",
                source_txn_id,
                req.source_account_id,
                Decimal(str(req.amount)),
                req.currency,
                "Debit",
                req.description or f"Transfer to {req.target_account_id}",
                transfer_ref,
                "",  # counterparty_name
                target["iban"],
                Decimal(str(new_source_balance)),
                "Transfer",
                "Booked",
                now,
            )

            target_txn_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
            await conn.execute(
                """INSERT INTO transactions
                   (transaction_id, account_id, amount, currency, direction,
                    description, reference, counterparty_name, counterparty_iban,
                    balance_after, transaction_type, status, created_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)""",
                target_txn_id,
                req.target_account_id,
                Decimal(str(req.amount)),
                req.currency,
                "Credit",
                req.description or f"Transfer from {req.source_account_id}",
                transfer_ref,
                "",  # counterparty_name
                source["iban"],
                Decimal(str(new_target_balance)),
                "Transfer",
                "Booked",
                now,
            )

    return TransferResponse(
        transfer_id=transfer_ref,
        source_transaction_id=source_txn_id,
        target_transaction_id=target_txn_id,
        amount=req.amount,
        currency=req.currency,
        source_account_id=req.source_account_id,
        target_account_id=req.target_account_id,
        source_balance_after=new_source_balance,
        target_balance_after=new_target_balance,
        reference=transfer_ref,
        status="Completed",
        created_at=now.isoformat(),
    )
