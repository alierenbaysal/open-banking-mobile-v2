# ob-consent-service

OBIE-compliant consent lifecycle management service for Bank Dhofar's Qantara Open Banking platform.

## Overview

This FastAPI service manages the full consent lifecycle for all Open Banking operations: account access (AIS), payment initiation (PIS), variable recurring payments (VRP), and confirmation of funds (CoF).

Every API call from a TPP passes through consent validation. The service enforces the OBIE state machine, records a full audit trail, and automatically expires stale consents.

## Consent Types

| Type | Value | One-Time | Default Expiry |
|------|-------|----------|----------------|
| Account Access | `account-access` | No | 180 days |
| Domestic Payment | `domestic-payment` | Yes | None |
| Scheduled Payment | `scheduled-payment` | No | None |
| Standing Order | `standing-order` | No | None |
| Variable Recurring Payment | `domestic-vrp` | No | None |
| Funds Confirmation | `funds-confirmation` | No | 180 days |

## State Machine

```
AwaitingAuthorisation --> Authorised   (customer approves)
AwaitingAuthorisation --> Rejected     (customer rejects / timeout)
Authorised            --> Consumed     (one-time consent used, PIS only)
Authorised            --> Revoked      (customer or TPP revokes)
Authorised            --> Expired      (expiration_time reached)
```

Terminal states: Rejected, Consumed, Revoked, Expired.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/consents` | Create consent |
| GET | `/consents/{id}` | Get consent |
| DELETE | `/consents/{id}` | Revoke consent |
| POST | `/consents/{id}/authorize` | Customer authorizes |
| POST | `/consents/{id}/reject` | Customer rejects |
| POST | `/consents/{id}/consume` | Mark as consumed (PIS) |
| GET | `/consents/{id}/history` | Audit trail |
| GET | `/consents/{id}/validate` | Internal validation |
| POST | `/tpp` | Register TPP |
| GET | `/tpp/{id}` | Get TPP |
| PUT | `/tpp/{id}` | Update TPP |
| GET | `/tpp` | List TPPs |
| GET | `/health` | Health check |

## Configuration

| Env Var | Default | Description |
|---------|---------|-------------|
| `DATABASE_URL` | `postgresql://consent:consent@localhost:5432/consent` | PostgreSQL DSN |
| `SERVICE_PORT` | `8000` | Uvicorn listen port |
| `LOG_LEVEL` | `INFO` | Python log level |
| `CONSENT_DEFAULT_EXPIRY_DAYS` | `180` | Default AIS/CoF expiry |
| `CONSENT_CLEANUP_INTERVAL` | `3600` | Expiration sweep interval (seconds) |
| `DB_MIN_POOL_SIZE` | `5` | AsyncPG pool minimum |
| `DB_MAX_POOL_SIZE` | `20` | AsyncPG pool maximum |

## Database Setup

```bash
psql -U postgres -c "CREATE DATABASE consent;"
psql -U consent -d consent -f migrations/001_initial.sql
```

## Run Locally

```bash
pip install -r requirements.txt
DATABASE_URL=postgresql://consent:consent@localhost:5432/consent uvicorn app.main:app --port 8000
```

## Docker

```bash
docker build -t ob-consent-service .
docker run -p 8000:8000 -e DATABASE_URL=postgresql://... ob-consent-service
```

## Tests

```bash
pip install pytest
pytest tests/
```
