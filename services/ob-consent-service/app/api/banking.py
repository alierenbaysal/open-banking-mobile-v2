"""Banking API — single source of truth for account data.

Internal service-to-service API. No auth required.
Reads from the ``qantara`` PostgreSQL database (customers, accounts, transactions tables).
"""

from __future__ import annotations

import hashlib
import logging
import secrets
import time
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from app.core.database import acquire

router = APIRouter(prefix="/banking", tags=["banking"])
logger = logging.getLogger(__name__)

_TZ_OMAN = timezone(timedelta(hours=4))

# ── Password hashing ──────────────────────────────────────────────────

_PASSWORD_SALT = "bankdhofar-salt-2026"


def hash_password(password: str) -> str:
    """Hash a password using SHA-256 with a fixed salt."""
    return hashlib.sha256((password + _PASSWORD_SALT).encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plaintext password against a SHA-256 hash."""
    return hash_password(password) == hashed


# ── Brute-force protection ────────────────────────────────────────────

_login_attempts: dict[str, list[float]] = {}
_LOCKOUT_THRESHOLD = 5
_LOCKOUT_WINDOW = 900  # 15 minutes


def _check_brute_force(email: str) -> None:
    """Raise 429 if too many recent failed login attempts."""
    now = time.time()
    attempts = _login_attempts.get(email, [])
    recent = [t for t in attempts if now - t < _LOCKOUT_WINDOW]
    _login_attempts[email] = recent
    if len(recent) >= _LOCKOUT_THRESHOLD:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Try again in 15 minutes.",
        )


def _record_failed_attempt(email: str) -> None:
    """Record a failed login attempt timestamp."""
    now = time.time()
    _login_attempts.setdefault(email, []).append(now)


# ── Audit logging ─────────────────────────────────────────────────────

_AUDIT_TABLE_CREATED = False


async def _ensure_audit_table(conn) -> None:
    """Create the auth_audit_log table if it doesn't exist (idempotent)."""
    global _AUDIT_TABLE_CREATED
    if _AUDIT_TABLE_CREATED:
        return
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS auth_audit_log (
            id BIGSERIAL PRIMARY KEY,
            event_type VARCHAR(50) NOT NULL,
            email VARCHAR(255),
            customer_id VARCHAR(20),
            ip_address VARCHAR(50),
            user_agent TEXT,
            success BOOLEAN NOT NULL,
            details TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    _AUDIT_TABLE_CREATED = True


async def _audit_log(
    event_type: str,
    email: str | None = None,
    customer_id: str | None = None,
    success: bool = True,
    details: str | None = None,
) -> None:
    """Write an audit log entry. Silently ignores errors."""
    try:
        async with acquire() as conn:
            await _ensure_audit_table(conn)
            await conn.execute(
                "INSERT INTO auth_audit_log (event_type, email, customer_id, success, details) "
                "VALUES ($1, $2, $3, $4, $5)",
                event_type, email, customer_id, success, details,
            )
    except Exception:
        pass  # Don't fail the main operation if audit logging fails


# ── Rate-limit headers helper ─────────────────────────────────────────

def _set_rate_limit_headers(response: Response) -> None:
    """Add static rate-limit headers to a response."""
    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = "99"
    response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 60)


# ── Auth codes table ──────────────────────────────────────────────────

_AUTH_CODES_TABLE_CREATED = False


async def _ensure_auth_codes_table(conn) -> None:
    """Create the auth_codes table if it doesn't exist (idempotent)."""
    global _AUTH_CODES_TABLE_CREATED
    if _AUTH_CODES_TABLE_CREATED:
        return
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS auth_codes (
            code VARCHAR(64) PRIMARY KEY,
            consent_id UUID NOT NULL,
            customer_id VARCHAR(20) NOT NULL,
            client_id VARCHAR(100) NOT NULL,
            redirect_uri TEXT NOT NULL,
            used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '60 seconds'
        )
    """)
    _AUTH_CODES_TABLE_CREATED = True


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


class BankAuthLoginRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


class MasroofiLoginRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


class MasroofiUpdateBankRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    consent_id: str = Field("", max_length=100)
    bank_token: str = Field("", max_length=500)


class AuthCodeGenerateRequest(BaseModel):
    consent_id: str = Field(..., min_length=1)
    customer_id: str = Field(..., min_length=1, max_length=20)
    redirect_uri: str = Field(..., min_length=1)


class AuthCodeExchangeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=64)
    client_id: str = Field(..., min_length=1, max_length=100)
    client_secret: str = Field(..., min_length=1, max_length=255)


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


@router.delete("/beneficiaries/{beneficiary_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_beneficiary(beneficiary_id: str):
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


# ── Bank Auth (BD Online direct login) ─────────────────────────────────


@router.post("/bank-auth/login")
async def bank_auth_login(req: BankAuthLoginRequest, response: Response) -> dict[str, Any]:
    """Authenticate a bank customer directly (no Keycloak redirect).

    Validates email + password against the ``customers`` table and returns
    customer info with their account list.
    """
    _set_rate_limit_headers(response)
    _check_brute_force(req.email)

    async with acquire() as conn:
        row = await conn.fetchrow(
            "SELECT customer_id, email, first_name, last_name, password FROM customers WHERE email = $1",
            req.email,
        )

    if not row:
        _record_failed_attempt(req.email)
        await _audit_log("bank_login_failed", email=req.email, success=False, details="Unknown email")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    stored_password = row["password"]

    # On-the-fly migration: if stored password is not a hash (len != 64), hash it and UPDATE
    if len(stored_password) != 64:
        hashed = hash_password(stored_password)
        async with acquire() as conn:
            await conn.execute(
                "UPDATE customers SET password = $1 WHERE customer_id = $2",
                hashed, row["customer_id"],
            )
        stored_password = hashed

    if not verify_password(req.password, stored_password):
        _record_failed_attempt(req.email)
        await _audit_log("bank_login_failed", email=req.email, customer_id=row["customer_id"], success=False, details="Wrong password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    customer_id = row["customer_id"]
    await _audit_log("bank_login_success", email=req.email, customer_id=customer_id, success=True)

    # Fetch accounts for this customer
    async with acquire() as conn:
        acct_rows = await conn.fetch(
            "SELECT account_id FROM accounts WHERE customer_id = $1 ORDER BY account_id",
            customer_id,
        )

    return {
        "customer_id": customer_id,
        "email": row["email"],
        "first_name": row["first_name"],
        "last_name": row["last_name"],
        "accounts": [r["account_id"] for r in acct_rows],
    }


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
async def masroofi_register(req: MasroofiRegisterRequest, response: Response) -> dict[str, Any]:
    """Register a new Masroofi user account."""
    _set_rate_limit_headers(response)

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
        hashed_pw = hash_password(req.password)
        await conn.execute(
            """INSERT INTO masroofi_users (email, password, name, created_at)
               VALUES ($1, $2, $3, $4)""",
            req.email,
            hashed_pw,
            req.name,
            now,
        )

    await _audit_log("masroofi_register", email=req.email, success=True)

    return {
        "email": req.email,
        "name": req.name,
        "created_at": now.isoformat(),
    }


@router.post("/masroofi/login")
async def masroofi_login(req: MasroofiLoginRequest, response: Response) -> dict[str, Any]:
    """Login to a Masroofi user account."""
    _set_rate_limit_headers(response)
    _check_brute_force(req.email)

    async with acquire() as conn:
        await _ensure_masroofi_table(conn)

        row = await conn.fetchrow(
            "SELECT email, password, name, consent_id, bank_token, created_at FROM masroofi_users WHERE email = $1",
            req.email,
        )

    if not row:
        _record_failed_attempt(req.email)
        await _audit_log("masroofi_login_failed", email=req.email, success=False, details="Unknown email")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    stored_password = row["password"]

    # On-the-fly migration: if stored password is not a hash (len != 64), hash it and UPDATE
    if len(stored_password) != 64:
        hashed = hash_password(stored_password)
        async with acquire() as conn:
            await conn.execute(
                "UPDATE masroofi_users SET password = $1 WHERE email = $2",
                hashed, row["email"],
            )
        stored_password = hashed

    if not verify_password(req.password, stored_password):
        _record_failed_attempt(req.email)
        await _audit_log("masroofi_login_failed", email=req.email, success=False, details="Wrong password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    await _audit_log("masroofi_login_success", email=req.email, success=True)

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


# ── Authorization Code Flow ───────────────────────────────────────────


@router.post("/auth-codes/generate")
async def auth_code_generate(req: AuthCodeGenerateRequest, response: Response) -> dict[str, Any]:
    """Generate an authorization code for a consent.

    The code is single-use and expires in 60 seconds.
    """
    _set_rate_limit_headers(response)
    code = secrets.token_hex(16)  # 32-char hex string

    async with acquire() as conn:
        await _ensure_auth_codes_table(conn)

        # Determine the client_id from the consent's TPP
        consent_row = await conn.fetchrow(
            "SELECT tpp_id FROM consents WHERE consent_id = $1",
            uuid.UUID(req.consent_id),
        )
        client_id = consent_row["tpp_id"] if consent_row else "unknown"

        await conn.execute(
            """INSERT INTO auth_codes (code, consent_id, customer_id, client_id, redirect_uri)
               VALUES ($1, $2, $3, $4, $5)""",
            code,
            uuid.UUID(req.consent_id),
            req.customer_id,
            client_id,
            req.redirect_uri,
        )

    await _audit_log(
        "auth_code_generated",
        customer_id=req.customer_id,
        success=True,
        details=f"consent={req.consent_id}",
    )

    return {"code": code, "expires_in": 60}


@router.post("/auth-codes/exchange")
async def auth_code_exchange(req: AuthCodeExchangeRequest, response: Response) -> dict[str, Any]:
    """Exchange an authorization code for an access token.

    Validates: code exists, not used, not expired, client_id matches.
    Marks the code as used. Returns consent_id and a token.
    """
    _set_rate_limit_headers(response)

    async with acquire() as conn:
        await _ensure_auth_codes_table(conn)

        row = await conn.fetchrow(
            "SELECT code, consent_id, customer_id, client_id, redirect_uri, used, expires_at "
            "FROM auth_codes WHERE code = $1",
            req.code,
        )

    if not row:
        await _audit_log("auth_code_expired", success=False, details=f"code={req.code[:8]}... not found")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization code")

    if row["used"]:
        await _audit_log("auth_code_expired", success=False, details=f"code={req.code[:8]}... already used")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization code already used")

    now = datetime.now(timezone.utc)
    if now > row["expires_at"].replace(tzinfo=timezone.utc):
        await _audit_log("auth_code_expired", success=False, details=f"code={req.code[:8]}... expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization code expired")

    if row["client_id"] != req.client_id:
        await _audit_log("auth_code_expired", success=False, details=f"client_id mismatch: {req.client_id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Client ID mismatch")

    # Mark code as used
    async with acquire() as conn:
        await conn.execute("UPDATE auth_codes SET used = TRUE WHERE code = $1", req.code)

    consent_id = str(row["consent_id"])

    # Determine scope from the consent
    scope = "accounts"
    try:
        async with acquire() as conn:
            consent_row = await conn.fetchrow(
                "SELECT consent_type FROM consents WHERE consent_id = $1",
                row["consent_id"],
            )
        if consent_row:
            ct = consent_row["consent_type"]
            if "payment" in ct:
                scope = "payments"
    except Exception:
        pass

    await _audit_log(
        "auth_code_exchanged",
        customer_id=row["customer_id"],
        success=True,
        details=f"consent={consent_id}",
    )

    return {
        "access_token": consent_id,
        "token_type": "Bearer",
        "expires_in": 3600,
        "consent_id": consent_id,
        "scope": scope,
    }


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
