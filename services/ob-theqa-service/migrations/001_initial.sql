-- 001_initial.sql
-- THEQA verification sessions.
--
-- One row per strong-auth verification initiated from a BD app. The `reference`
-- travels through the SAML flow as RelayState and is what the mobile app polls.

CREATE TABLE IF NOT EXISTS theqa_verifications (
    reference       UUID PRIMARY KEY,
    customer_id     VARCHAR(100) NOT NULL,
    purpose         VARCHAR(64)  NOT NULL DEFAULT 'onboarding',
    relay_state     VARCHAR(512),
    status          VARCHAR(16)  NOT NULL DEFAULT 'pending',  -- pending | verified | failed
    national_id     VARCHAR(64),
    name_id         VARCHAR(256),
    attributes      JSONB,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_theqa_verifications_customer
    ON theqa_verifications (customer_id);
CREATE INDEX IF NOT EXISTS idx_theqa_verifications_status
    ON theqa_verifications (status);
CREATE INDEX IF NOT EXISTS idx_theqa_verifications_created
    ON theqa_verifications (created_at);
