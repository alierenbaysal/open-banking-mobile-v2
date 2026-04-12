-- 001_initial.sql
-- Full schema for the Open Banking Consent Service.
-- Run against the consent database before first deployment.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================================
-- TPP Registry
-- =========================================================================

CREATE TABLE tpp_registry (
    tpp_id              VARCHAR(100) PRIMARY KEY,
    tpp_name            VARCHAR(255) NOT NULL,
    tpp_name_ar         VARCHAR(255),
    registration_number VARCHAR(100),
    is_aisp             BOOLEAN DEFAULT FALSE,
    is_pisp             BOOLEAN DEFAULT FALSE,
    is_cisp             BOOLEAN DEFAULT FALSE,
    client_id           VARCHAR(100) UNIQUE NOT NULL,
    redirect_uris       TEXT[] NOT NULL,
    jwks_uri            TEXT,
    software_statement  TEXT,
    logo_uri            TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'Active',
    onboarded_at        TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_tpp_status CHECK (status IN ('Active', 'Suspended', 'Revoked'))
);

-- =========================================================================
-- Consents
-- =========================================================================

CREATE TABLE consents (
    consent_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_type        VARCHAR(50) NOT NULL,
    tpp_id              VARCHAR(100) NOT NULL REFERENCES tpp_registry(tpp_id),
    customer_id         VARCHAR(100),
    permissions         JSONB NOT NULL DEFAULT '[]',
    selected_accounts   JSONB,
    payment_details     JSONB,
    control_parameters  JSONB,
    status              VARCHAR(30) NOT NULL DEFAULT 'AwaitingAuthorisation',
    status_update_time  TIMESTAMPTZ DEFAULT NOW(),
    creation_time       TIMESTAMPTZ DEFAULT NOW(),
    expiration_time     TIMESTAMPTZ,
    authorization_time  TIMESTAMPTZ,
    revocation_time     TIMESTAMPTZ,
    revocation_reason   VARCHAR(255),
    risk_data           JSONB,
    CONSTRAINT valid_consent_type CHECK (consent_type IN (
        'account-access', 'domestic-payment', 'scheduled-payment',
        'standing-order', 'domestic-vrp', 'funds-confirmation'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'AwaitingAuthorisation', 'Authorised', 'Rejected',
        'Consumed', 'Revoked', 'Expired'
    ))
);

CREATE INDEX idx_consents_tpp ON consents(tpp_id);
CREATE INDEX idx_consents_customer ON consents(customer_id);
CREATE INDEX idx_consents_status ON consents(status);
CREATE INDEX idx_consents_expiration ON consents(expiration_time) WHERE status = 'Authorised';

-- =========================================================================
-- Consent History (audit trail)
-- =========================================================================

CREATE TABLE consent_history (
    id                  BIGSERIAL PRIMARY KEY,
    consent_id          UUID NOT NULL REFERENCES consents(consent_id),
    event_type          VARCHAR(50) NOT NULL,
    event_time          TIMESTAMPTZ DEFAULT NOW(),
    actor_type          VARCHAR(20) NOT NULL,
    actor_id            VARCHAR(100),
    previous_status     VARCHAR(30),
    new_status          VARCHAR(30),
    details             JSONB,
    ip_address          INET,
    user_agent          TEXT
);

CREATE INDEX idx_consent_history_consent ON consent_history(consent_id);
CREATE INDEX idx_consent_history_time ON consent_history(event_time);

-- =========================================================================
-- Audit Log (service-level events beyond consent state changes)
-- =========================================================================

CREATE TABLE audit_log (
    id                  BIGSERIAL PRIMARY KEY,
    event_time          TIMESTAMPTZ DEFAULT NOW(),
    service             VARCHAR(50) NOT NULL DEFAULT 'ob-consent-service',
    event_type          VARCHAR(50) NOT NULL,
    actor_type          VARCHAR(20),
    actor_id            VARCHAR(100),
    resource_type       VARCHAR(50),
    resource_id         VARCHAR(200),
    details             JSONB,
    ip_address          INET,
    user_agent          TEXT
);

CREATE INDEX idx_audit_log_time ON audit_log(event_time);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
