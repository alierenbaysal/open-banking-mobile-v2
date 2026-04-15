"""Prometheus metrics."""

from __future__ import annotations

from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

# ── Application lifecycle counters ─────────────────────────────────────
applications_created_total = Counter(
    "loan_applications_created_total",
    "Loan applications created",
    labelnames=("dealer_id", "environment"),
)
applications_decided_total = Counter(
    "loan_applications_decided_total",
    "Loan applications decided",
    labelnames=("dealer_id", "environment", "decision"),
)
applications_contracted_total = Counter(
    "loan_applications_contracted_total",
    "Loan applications contracted (signed)",
    labelnames=("dealer_id", "environment"),
)
applications_disbursed_total = Counter(
    "loan_applications_disbursed_total",
    "Loan applications disbursed",
    labelnames=("dealer_id", "environment"),
)

# ── Decision engine ────────────────────────────────────────────────────
decision_latency_seconds = Histogram(
    "loan_decision_latency_seconds",
    "Time spent computing a decision",
    labelnames=("decision",),
    buckets=(0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

# ── Webhook delivery ───────────────────────────────────────────────────
webhook_delivery_total = Counter(
    "loan_webhook_delivery_total",
    "Webhook deliveries attempted",
    labelnames=("dealer_id", "event_type", "outcome"),  # outcome=delivered|failed|dead_letter
)
webhook_pending_gauge = Gauge(
    "loan_webhook_pending",
    "Number of webhook deliveries pending in the queue",
)

# ── Disbursement ───────────────────────────────────────────────────────
disbursement_total = Counter(
    "loan_disbursement_total",
    "Disbursements executed",
    labelnames=("environment", "outcome"),
)


def render_metrics() -> tuple[bytes, str]:
    return generate_latest(), CONTENT_TYPE_LATEST
