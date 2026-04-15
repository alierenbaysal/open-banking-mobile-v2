-- 001_initial.sql
-- Schema for ob-loan-service (Bank Dhofar Open Finance — Embedded Lending).
-- Idempotent: safe to re-run. All objects use IF NOT EXISTS where possible.
--
-- This migration extends the shared `qantara` database used by ob-consent-service.
-- It does not duplicate tpp_registry or customers; it references and extends them.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- TPP Registry extension: auto-lending role
-- =========================================================================
-- Extends the existing tpp_registry table with role + dealer-specific fields.
-- Non-destructive: ADD COLUMN IF NOT EXISTS keeps existing TPPs working.

ALTER TABLE tpp_registry ADD COLUMN IF NOT EXISTS is_auto_lender  BOOLEAN DEFAULT FALSE;
ALTER TABLE tpp_registry ADD COLUMN IF NOT EXISTS cr_number       VARCHAR(50);
ALTER TABLE tpp_registry ADD COLUMN IF NOT EXISTS rop_dealer_code VARCHAR(50);
ALTER TABLE tpp_registry ADD COLUMN IF NOT EXISTS webhook_url     TEXT;
ALTER TABLE tpp_registry ADD COLUMN IF NOT EXISTS webhook_secret  VARCHAR(128);
ALTER TABLE tpp_registry ADD COLUMN IF NOT EXISTS client_secret   VARCHAR(128);
ALTER TABLE tpp_registry ADD COLUMN IF NOT EXISTS environment     VARCHAR(20) DEFAULT 'sandbox';

-- =========================================================================
-- Loan applications
-- =========================================================================
-- State machine:
--   pending_consent → pending_decision → decided | declined
--   decided → contracted | expired | cancelled
--   contracted → disbursed
--   disbursed → (creates auto_loans row, loan lifecycle continues there)

CREATE TABLE IF NOT EXISTS loan_applications (
    application_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id             VARCHAR(100) NOT NULL REFERENCES tpp_registry(tpp_id),
    dealer_reference      VARCHAR(100),                     -- dealer's own order/quote ID
    branch_code           VARCHAR(50),
    salesperson_email     VARCHAR(255),
    consent_id            UUID,                             -- populated when customer scans + consents
    customer_id           VARCHAR(20),                      -- populated at consent approval
    -- Vehicle
    vehicle_vin           VARCHAR(50),
    vehicle_make          VARCHAR(50) NOT NULL,
    vehicle_model         VARCHAR(100) NOT NULL,
    vehicle_year          INT NOT NULL,
    vehicle_condition     VARCHAR(20) DEFAULT 'new',        -- new | used
    vehicle_price         NUMERIC(18,3) NOT NULL,
    vehicle_currency      VARCHAR(3) DEFAULT 'OMR',
    -- Request parameters
    requested_amount      NUMERIC(18,3) NOT NULL,
    down_payment          NUMERIC(18,3) NOT NULL,
    requested_tenor_months INT NOT NULL,
    -- State
    status                VARCHAR(30) NOT NULL DEFAULT 'pending_consent',
    -- QR handshake
    qr_payload            TEXT NOT NULL,
    qr_expires_at         TIMESTAMPTZ NOT NULL,
    -- Environment
    environment           VARCHAR(20) NOT NULL DEFAULT 'sandbox',
    -- Lifecycle
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at          TIMESTAMPTZ,
    cancellation_reason   TEXT,

    CONSTRAINT valid_app_status CHECK (status IN (
        'pending_consent', 'pending_decision', 'decided', 'declined',
        'contracted', 'disbursed', 'expired', 'cancelled'
    )),
    CONSTRAINT valid_vehicle_condition CHECK (vehicle_condition IN ('new', 'used')),
    CONSTRAINT valid_environment CHECK (environment IN ('sandbox', 'production')),
    CONSTRAINT valid_tenor CHECK (requested_tenor_months BETWEEN 12 AND 84),
    CONSTRAINT valid_amounts CHECK (
        requested_amount > 0 AND
        down_payment >= 0 AND
        vehicle_price > 0 AND
        requested_amount <= vehicle_price
    )
);

CREATE INDEX IF NOT EXISTS idx_loan_apps_dealer           ON loan_applications(dealer_id);
CREATE INDEX IF NOT EXISTS idx_loan_apps_customer         ON loan_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_loan_apps_consent          ON loan_applications(consent_id);
CREATE INDEX IF NOT EXISTS idx_loan_apps_status           ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_apps_qr_expiry        ON loan_applications(qr_expires_at) WHERE status = 'pending_consent';
CREATE INDEX IF NOT EXISTS idx_loan_apps_created          ON loan_applications(created_at DESC);

-- =========================================================================
-- Loan decisions
-- =========================================================================
-- One decision per application (an application may have one approve or one decline).

CREATE TABLE IF NOT EXISTS loan_decisions (
    decision_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id        UUID NOT NULL UNIQUE REFERENCES loan_applications(application_id) ON DELETE CASCADE,
    decision              VARCHAR(20) NOT NULL,            -- approved | declined | conditional
    approved_amount       NUMERIC(18,3),
    interest_rate         NUMERIC(5,3),                    -- annual percentage, e.g. 5.500 = 5.5%
    tenor_months          INT,
    monthly_installment   NUMERIC(18,3),
    total_repayable       NUMERIC(18,3),
    total_interest        NUMERIC(18,3),
    -- Risk factors (stored as JSONB for observability + audit)
    income_monthly        NUMERIC(18,3),
    existing_debt_monthly NUMERIC(18,3),
    dbr_before            NUMERIC(5,4),                    -- debt burden ratio BEFORE this loan
    dbr_after             NUMERIC(5,4),                    -- DBR AFTER adding this loan
    credit_score          INT,                             -- Mala'a stub score 300–900
    score_band            VARCHAR(20),                     -- prime | near_prime | sub_prime
    -- Outcome details
    decline_reasons       JSONB,                           -- e.g. ["dbr_exceeded", "insufficient_income"]
    conditions            JSONB,                           -- conditional-approval requirements
    -- Validity
    decided_at            TIMESTAMPTZ DEFAULT NOW(),
    valid_until           TIMESTAMPTZ NOT NULL,            -- pre-approval shelf-life (default 10 min during showroom)
    -- Decision engine version (for auditability across future model changes)
    engine_version        VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',

    CONSTRAINT valid_decision CHECK (decision IN ('approved', 'declined', 'conditional')),
    CONSTRAINT valid_score_band CHECK (score_band IS NULL OR score_band IN ('prime', 'near_prime', 'sub_prime')),
    CONSTRAINT approved_has_numbers CHECK (
        decision <> 'approved' OR (
            approved_amount IS NOT NULL AND
            interest_rate IS NOT NULL AND
            monthly_installment IS NOT NULL AND
            tenor_months IS NOT NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_decisions_decided ON loan_decisions(decided_at DESC);

-- =========================================================================
-- Loan contracts
-- =========================================================================
-- Signed agreements. One contract per approved decision.

CREATE TABLE IF NOT EXISTS loan_contracts (
    contract_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id        UUID NOT NULL UNIQUE REFERENCES loan_applications(application_id) ON DELETE RESTRICT,
    decision_id           UUID NOT NULL UNIQUE REFERENCES loan_decisions(decision_id) ON DELETE RESTRICT,
    customer_id           VARCHAR(20) NOT NULL,
    -- Contract content (rendered at signing time)
    contract_pdf_hash     VARCHAR(64),                     -- SHA-256 of the generated PDF bytes
    contract_terms        JSONB NOT NULL,                  -- full terms snapshot (rate, amount, tenor, schedule)
    -- Signature
    signature_method      VARCHAR(30) NOT NULL,            -- otp_biometric | theqa (future)
    signature_otp_hash    VARCHAR(64),                     -- SHA-256 of the OTP we sent (proof)
    signature_proof       JSONB NOT NULL,                  -- webauthn assertion / theqa response bundle
    signed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signed_ip             INET,
    signed_user_agent     TEXT,
    -- Post-sign
    created_at            TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_signature_method CHECK (signature_method IN ('otp_biometric', 'theqa'))
);

CREATE INDEX IF NOT EXISTS idx_contracts_customer ON loan_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signed   ON loan_contracts(signed_at DESC);

-- =========================================================================
-- Loan disbursements
-- =========================================================================
-- Records the actual money movement from BD Lending account to dealer account.

CREATE TABLE IF NOT EXISTS loan_disbursements (
    disbursement_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id           UUID NOT NULL UNIQUE REFERENCES loan_contracts(contract_id) ON DELETE RESTRICT,
    application_id        UUID NOT NULL REFERENCES loan_applications(application_id),
    amount                NUMERIC(18,3) NOT NULL,
    currency              VARCHAR(3) DEFAULT 'OMR',
    -- Accounts
    source_account_id     VARCHAR(20) NOT NULL,            -- BD lending account
    dealer_account_id     VARCHAR(20) NOT NULL,            -- dealer's merchant BD account
    -- Execution
    status                VARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_id        VARCHAR(50),                     -- references transactions.transaction_id when executed
    -- Retry / failure handling
    attempts              INT NOT NULL DEFAULT 0,
    last_error            TEXT,
    -- Lifecycle
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    executed_at           TIMESTAMPTZ,
    -- Sandbox flag (sandbox = logged only, no real transfer)
    environment           VARCHAR(20) NOT NULL DEFAULT 'sandbox',

    CONSTRAINT valid_disb_status CHECK (status IN ('pending', 'sent', 'completed', 'failed')),
    CONSTRAINT valid_disb_env CHECK (environment IN ('sandbox', 'production'))
);

CREATE INDEX IF NOT EXISTS idx_disbursements_status ON loan_disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursements_created ON loan_disbursements(created_at DESC);

-- =========================================================================
-- Auto loans
-- =========================================================================
-- The "live" loan record once disbursed. Tracks repayment lifecycle.

CREATE TABLE IF NOT EXISTS auto_loans (
    loan_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id           UUID NOT NULL UNIQUE REFERENCES loan_contracts(contract_id),
    customer_id           VARCHAR(20) NOT NULL,
    source_account_id     VARCHAR(20) NOT NULL,            -- customer's salary/current account — repayments come from here
    -- Terms snapshot
    principal             NUMERIC(18,3) NOT NULL,
    interest_rate         NUMERIC(5,3) NOT NULL,
    tenor_months          INT NOT NULL,
    monthly_installment   NUMERIC(18,3) NOT NULL,
    -- Repayment state
    outstanding_principal NUMERIC(18,3) NOT NULL,
    paid_installments     INT NOT NULL DEFAULT 0,
    next_payment_date     DATE NOT NULL,
    status                VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Linked resources
    standing_order_id     UUID,                            -- references loan_standing_orders below
    -- Lifecycle
    opened_at             TIMESTAMPTZ DEFAULT NOW(),
    closed_at             TIMESTAMPTZ,

    CONSTRAINT valid_loan_status CHECK (status IN ('active', 'delinquent', 'settled', 'defaulted', 'written_off'))
);

CREATE INDEX IF NOT EXISTS idx_auto_loans_customer ON auto_loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_auto_loans_status   ON auto_loans(status);
CREATE INDEX IF NOT EXISTS idx_auto_loans_next_pay ON auto_loans(next_payment_date) WHERE status = 'active';

-- =========================================================================
-- Loan standing orders (repayment schedule)
-- =========================================================================
-- A lightweight standing-order record specific to loan repayments. The
-- actual scheduled execution logic is handled by ob-consent-service's
-- banking module via the existing /transfers endpoint.

CREATE TABLE IF NOT EXISTS loan_standing_orders (
    standing_order_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id               UUID REFERENCES auto_loans(loan_id),
    source_account_id     VARCHAR(20) NOT NULL,            -- customer's account
    destination_account_id VARCHAR(20) NOT NULL,           -- BD lending / loan-repayment collection account
    amount                NUMERIC(18,3) NOT NULL,
    frequency             VARCHAR(20) NOT NULL DEFAULT 'monthly',
    next_run_date         DATE NOT NULL,
    end_date              DATE,                            -- computed from tenor
    status                VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at            TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_so_status CHECK (status IN ('active', 'paused', 'cancelled', 'completed')),
    CONSTRAINT valid_frequency CHECK (frequency IN ('monthly'))
);

CREATE INDEX IF NOT EXISTS idx_loan_so_next_run ON loan_standing_orders(next_run_date) WHERE status = 'active';

-- =========================================================================
-- Dealer webhooks queue
-- =========================================================================
-- Webhooks to dispatch to dealer TPPs with retries + DLQ.

CREATE TABLE IF NOT EXISTS dealer_webhooks (
    webhook_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id             VARCHAR(100) NOT NULL REFERENCES tpp_registry(tpp_id),
    event_type            VARCHAR(50) NOT NULL,            -- loan_application.decided, .contracted, .disbursed, .declined, .expired, .cancelled
    resource_type         VARCHAR(50) NOT NULL DEFAULT 'loan_application',
    resource_id           UUID,
    application_id        UUID REFERENCES loan_applications(application_id),
    payload               JSONB NOT NULL,
    target_url            TEXT NOT NULL,
    -- Delivery state
    status                VARCHAR(20) NOT NULL DEFAULT 'pending',
    delivery_attempts     INT NOT NULL DEFAULT 0,
    max_attempts          INT NOT NULL DEFAULT 8,
    first_attempted_at    TIMESTAMPTZ,
    last_attempted_at     TIMESTAMPTZ,
    delivered_at          TIMESTAMPTZ,
    last_error            TEXT,
    last_response_code    INT,
    next_retry_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_webhook_status CHECK (status IN ('pending', 'delivered', 'failed', 'dead_letter'))
);

CREATE INDEX IF NOT EXISTS idx_dealer_webhooks_pending ON dealer_webhooks(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dealer_webhooks_dealer  ON dealer_webhooks(dealer_id, created_at DESC);

-- =========================================================================
-- Loan audit log
-- =========================================================================
-- Every state transition gets an audit row. Keep it separate from the
-- consent service's audit_log so queries stay fast.

CREATE TABLE IF NOT EXISTS loan_audit_log (
    id                    BIGSERIAL PRIMARY KEY,
    occurred_at           TIMESTAMPTZ DEFAULT NOW(),
    application_id        UUID,
    event_type            VARCHAR(60) NOT NULL,
    actor_type            VARCHAR(20) NOT NULL,            -- dealer | customer | system
    actor_id              VARCHAR(100),
    previous_state        VARCHAR(30),
    new_state             VARCHAR(30),
    details               JSONB,
    correlation_id        VARCHAR(64)                      -- request correlation ID (trace)
);

CREATE INDEX IF NOT EXISTS idx_loan_audit_app ON loan_audit_log(application_id);
CREATE INDEX IF NOT EXISTS idx_loan_audit_time ON loan_audit_log(occurred_at DESC);

-- =========================================================================
-- Idempotency keys (for POST deduplication)
-- =========================================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    idempotency_key       VARCHAR(128) NOT NULL,
    tpp_id                VARCHAR(100) NOT NULL,
    request_hash          VARCHAR(64) NOT NULL,            -- SHA-256 of (method, path, body)
    response_status       INT NOT NULL,
    response_body         JSONB,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    expires_at            TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    PRIMARY KEY (idempotency_key, tpp_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON idempotency_keys(expires_at);

-- =========================================================================
-- Seed data
-- =========================================================================

-- Register Muscat Motors as an auto-lending TPP (sandbox only initially).
INSERT INTO tpp_registry (
    tpp_id, tpp_name, registration_number, is_aisp, is_pisp, is_cisp, is_auto_lender,
    client_id, client_secret, redirect_uris, status,
    cr_number, rop_dealer_code, webhook_url, webhook_secret, environment
) VALUES (
    'muscat-motors',
    'Muscat Motors',
    'TPP-OM-2026-0005',
    FALSE, FALSE, FALSE, TRUE,
    'muscat-motors',
    'mm-sandbox-secret-do-not-use-in-prod',
    ARRAY['https://muscatmotors.tnd.bankdhofar.com/callback'],
    'Active',
    'CR-1234567',
    'ROP-DLR-0042',
    'https://muscatmotors.tnd.bankdhofar.com/api/bd-webhook',
    'mm-webhook-secret-change-me',
    'sandbox'
) ON CONFLICT (tpp_id) DO UPDATE SET
    is_auto_lender = EXCLUDED.is_auto_lender,
    cr_number = EXCLUDED.cr_number,
    rop_dealer_code = EXCLUDED.rop_dealer_code,
    webhook_url = EXCLUDED.webhook_url,
    webhook_secret = COALESCE(tpp_registry.webhook_secret, EXCLUDED.webhook_secret),
    client_secret = COALESCE(tpp_registry.client_secret, EXCLUDED.client_secret);

-- BD Lending pool account (synthetic customer that holds the money pool the bank lends from).
-- Uses a special customer_id 'CUST-BDLEND' with a single high-balance account.
INSERT INTO customers (customer_id, email, first_name, last_name, password)
VALUES ('CUST-BDLEND', 'lending@bankdhofar.internal', 'BD', 'Lending', NULL)
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO accounts (account_id, customer_id, iban, account_type, description, currency, balance, status)
VALUES (
    'DHOF-99001', 'CUST-BDLEND', 'OM02DHOF0001099999900001',
    'BusinessAccount', 'BD Lending Pool',
    'OMR', 50000000.000, 'Enabled'
) ON CONFLICT (account_id) DO NOTHING;

-- Loan repayment collection account (monies collected from customers flow here).
INSERT INTO accounts (account_id, customer_id, iban, account_type, description, currency, balance, status)
VALUES (
    'DHOF-99002', 'CUST-BDLEND', 'OM02DHOF0001099999900002',
    'BusinessAccount', 'BD Loan Repayment Collection',
    'OMR', 0.000, 'Enabled'
) ON CONFLICT (account_id) DO NOTHING;

-- Muscat Motors dealer customer account (disbursements land here).
INSERT INTO customers (customer_id, email, first_name, last_name, password)
VALUES ('CUST-MMOT', 'treasury@muscatmotors.com', 'Muscat', 'Motors', NULL)
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO accounts (account_id, customer_id, iban, account_type, description, currency, balance, status)
VALUES (
    'DHOF-30001', 'CUST-MMOT', 'OM02DHOF0001030000100001',
    'BusinessAccount', 'Muscat Motors Operating Account',
    'OMR', 0.000, 'Enabled'
) ON CONFLICT (account_id) DO NOTHING;

-- =========================================================================
-- Trigger: update updated_at on loan_applications changes
-- =========================================================================

CREATE OR REPLACE FUNCTION _touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loan_apps_touch ON loan_applications;
CREATE TRIGGER trg_loan_apps_touch
    BEFORE UPDATE ON loan_applications
    FOR EACH ROW EXECUTE FUNCTION _touch_updated_at();
