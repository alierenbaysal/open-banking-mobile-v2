# Qantara — قنطرة

**Bank Dhofar Open Banking Platform**

Qantara provides OBIE v4.0 compliant APIs to third-party providers (TPPs), enabling fintechs to access account information, initiate payments, and manage recurring payments through Bank Dhofar's infrastructure.

## Architecture

```
qantara.tnd.bankdhofar.com
├── /                        → ob-portal (Developer Portal)
├── /open-banking/v4.0/      → ob-api-server (OBIE APIs)
├── /portal-api/             → ob-tpp-manager (TPP Lifecycle)
└── /webhooks/               → ob-event-service (Event Delivery)
```

| Service | Stack | Purpose |
|---------|-------|---------|
| **ob-api-server** | Python/FastAPI | 64 OBIE v4.0 endpoints with pluggable adapter pattern |
| **ob-consent-service** | Python/FastAPI | Consent lifecycle, validation, audit trail |
| **ob-tpp-manager** | Go | TPP registration, Keycloak client provisioning |
| **ob-event-service** | Python/FastAPI | Event subscriptions, webhook delivery |
| **ob-portal** | React 18/Mantine | Qantara developer portal — API catalog, sandbox, apps |
| **ob-sandbox-app** | Expo/React Native | Mock banking app for consent flow testing |

## OBIE API Coverage (64 Endpoints)

| Specification | Endpoints | Prefix |
|--------------|-----------|--------|
| Account Information (AIS) | 23 | `/open-banking/v4.0/aisp/` |
| Payment Initiation (PIS) | 18 | `/open-banking/v4.0/pisp/` |
| Confirmation of Funds (CoF) | 4 | `/open-banking/v4.0/cbpii/` |
| Variable Recurring Payments (VRP) | 6 | `/open-banking/v4.0/pisp/` |
| Event Notifications | 7 | `/open-banking/v4.0/events/` |
| Event Subscriptions | 6 | `/open-banking/v4.0/events/` |

## Deployment

- **Cluster**: `oci-mct-tnd-rtz`
- **Namespace**: `ob-tnd`
- **Domain**: `qantara.tnd.bankdhofar.com`
- **Auth**: Keycloak FAPI 2.0 (`open-banking` realm)
- **Database**: PostgreSQL (CNPG)
- **Cache**: Redis

## Mock-First Strategy

Phase 1 deploys all endpoints with a `MockAdapter` returning synthetic Omani banking data. Fintechs integrate immediately against the sandbox. Backend adapters are swapped in per-endpoint in later phases:

| Phase | Adapter | Backend |
|-------|---------|---------|
| 1 (Current) | MockAdapter | Synthetic OBIE data |
| 2 | CorporateAdapter | Bank Dhofar Corporate Banking APIs |
| 2 | EMandateAdapter | Bank Dhofar E-Mandate APIs |
| 3 | DMZ Exposure | External fintech access via `oci-mct-tnd-dmz` |

## Documentation

- [High-Level Design](docs/HLD.md)
- [OBIE Coverage Analysis](api-catalog/docs/obie-coverage-analysis.md)
- [Consent Service Design](api-catalog/docs/consent-service-design.md)
- [API Mapping (BD → OBIE)](api-catalog/docs/api-mapping-obie.md)
- [Keycloak FAPI Realm](keycloak/open-banking-realm.json)

## Repository Structure

```
open-banking/
├── services/
│   ├── ob-api-server/       # OBIE API server (FastAPI)
│   ├── ob-consent-service/  # Consent management (FastAPI)
│   ├── ob-tpp-manager/      # TPP lifecycle (Go)
│   ├── ob-event-service/    # Event webhooks (FastAPI)
│   ├── ob-portal/           # Developer portal (React)
│   └── ob-sandbox-app/      # Mock banking app (Expo)
├── helm/                    # Helm chart for K8s deployment
├── keycloak/                # FAPI 2.0 realm configuration
├── api-catalog/             # OBIE specs and analysis docs
├── obie-specs/              # OBIE OpenAPI specifications
├── docs/                    # Architecture documentation
└── .gitlab-ci.yml           # CI/CD pipeline
```
