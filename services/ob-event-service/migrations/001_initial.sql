-- Event Subscription & Notification schema
-- Designed for the OBIE event subscription model (v4.0)

BEGIN;

-- ---------------------------------------------------------------------------
-- Event subscriptions — one per TPP callback registration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tpp_id          VARCHAR(100) NOT NULL,
    callback_url    TEXT         NOT NULL,
    event_types     TEXT[]       NOT NULL,
    version         VARCHAR(10)  DEFAULT '4.0',
    status          VARCHAR(20)  DEFAULT 'Active',
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tpp
    ON event_subscriptions(tpp_id);

-- ---------------------------------------------------------------------------
-- Events — individual notification records queued for delivery or polling
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tpp_id            VARCHAR(100) NOT NULL,
    event_type        TEXT         NOT NULL,
    subject           TEXT         NOT NULL,
    resource_id       VARCHAR(100),
    resource_type     VARCHAR(50),
    payload           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status            VARCHAR(20)  DEFAULT 'pending',
    delivery_attempts INT          DEFAULT 0,
    last_attempt_at   TIMESTAMPTZ,
    delivered_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_tpp_status
    ON events(tpp_id, status);

CREATE INDEX IF NOT EXISTS idx_events_created
    ON events(created_at);

-- Partial index for the webhook dispatcher: only pending events
CREATE INDEX IF NOT EXISTS idx_events_pending_delivery
    ON events(created_at ASC)
    WHERE status = 'pending';

COMMIT;
