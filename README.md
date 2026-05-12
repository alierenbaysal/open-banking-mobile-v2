# Qantara — قنطرة

**Bank Dhofar Open Banking Platform**

Qantara provides OBIE v4.0 compliant APIs to third-party providers (TPPs), enabling fintechs to access account information, initiate payments, and manage recurring payments through Bank Dhofar's infrastructure.

## Architecture

### Network Topology

```
                              INTERNET
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  oci-mct-tnd-dmz  (OCI Muscat DMZ)       Public: 79.76.22.216  │
│                                                                 │
│  Istio Gateway (ingressgateway)                                 │
│  ├─ TLS termination (*.omtd.bankdhofar.com, Let's Encrypt)     │
│  ├─ Coraza WAF  (OWASP CRS, SecRuleEngine On)                  │
│  └─ HTTP → HTTPS redirect                                      │
│                                                                 │
│  HTTPRoutes:                                                    │
│    banking-api.omtd.bankdhofar.com  ──►─┐                      │
│    hisab-api.omtd.bankdhofar.com    ──►─┤                      │
│    masroofi-api.omtd.bankdhofar.com ──►─┤ Host rewrite         │
│    sadad-api.omtd.bankdhofar.com    ──►─┤ + TLS re-encrypt     │
│    salalah-api.omtd.bankdhofar.com  ──►─┼──► 10.0.130.195      │
│    qantara-api.omtd.bankdhofar.com  ──►─┤    (TND nginx LB)    │
│    llm-api.omtd.bankdhofar.com      ──►─┤                      │
│    mosambee.omtd.bankdhofar.com     ──►─┘──► 10.0.130.210      │
│                                              (TND Istio LB)    │
└─────────────────────────────────────┬───────────────────────────┘
                                      │ OCI internal network
                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  oci-mct-tnd-rtz  (OCI Muscat TND — Restricted Trust Zone)     │
│                                                                 │
│  ingress-nginx (10.0.130.195)    istio-ingressgateway           │
│  Routes by Host header:          (10.0.130.210, legacy)         │
│    banking.tnd  → ob-tnd           mosambee.sit → sit-mosambee  │
│    hisab.tnd    → ob-tnd                                        │
│    masroofi.tnd → ob-tnd                                        │
│    sadad.tnd    → ob-tnd                                        │
│    salalah.tnd  → ob-tnd                                        │
│    qantara.tnd  → ob-tnd                                        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ob-tnd namespace                                          │ │
│  │                                                            │ │
│  │  qantara.tnd.bankdhofar.com:                               │ │
│  │    /                → ob-portal       (React/Mantine :80)  │ │
│  │    /open-banking/   → ob-api-server   (FastAPI :8000)      │ │
│  │    /portal-api/     → ob-tpp-manager  (Go :8000)           │ │
│  │    /consents        → ob-consent-svc  (FastAPI :8000)      │ │
│  │    /api/tpp         → ob-consent-svc  (FastAPI :8000)      │ │
│  │    /docs, /redoc    → ob-api-server   (Swagger/ReDoc)      │ │
│  │                                                            │ │
│  │  Merchant sandbox storefronts:                             │ │
│  │    banking.tnd  → bd-online      (React mock storefront)   │ │
│  │    hisab.tnd    → hisab          (React mock storefront)   │ │
│  │    masroofi.tnd → masroofi       (React mock storefront)   │ │
│  │    sadad.tnd    → sadad          (React mock storefront)   │ │
│  │    salalah.tnd  → salalah-el     (React mock storefront)   │ │
│  │                                                            │ │
│  │  Data: qantara-postgres (CNPG), qantara-redis              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Keycloak realm: open-banking (FAPI 2.0)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Services

| Service | Stack | Purpose |
|---------|-------|---------|
| **ob-api-server** | Python/FastAPI | 64 OBIE v4.0 endpoints with pluggable adapter pattern |
| **ob-consent-service** | Python/FastAPI | Consent lifecycle, validation, audit trail |
| **ob-tpp-manager** | Go | TPP registration, Keycloak client provisioning |
| **ob-event-service** | Python/FastAPI | Event subscriptions, webhook delivery |
| **ob-portal** | React 18/Mantine | Qantara developer portal — API catalog, sandbox, apps |
| **ob-sandbox-app** | Expo/React Native | Mock banking app for consent flow testing |
| **bd-online** | React | BD Online Banking mock storefront |
| **hisab** | React | Hisab merchant mock storefront |
| **masroofi** | React | Masroofi merchant mock storefront |
| **sadad** | React | Sadad merchant mock storefront |
| **salalah-el** | React | Salalah Electronics merchant mock storefront |

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

| Layer | Resource |
|-------|----------|
| **DMZ Cluster** | `oci-mct-tnd-dmz` — internet-facing reverse proxy |
| **TND Cluster** | `oci-mct-tnd-rtz` — application workloads |
| **Namespace** | `ob-tnd` |
| **Public domain** | `qantara-api.omtd.bankdhofar.com` (via DMZ) |
| **Internal domain** | `qantara.tnd.bankdhofar.com` (TND direct) |
| **Auth** | Keycloak FAPI 2.0 (`open-banking` realm) |
| **Database** | PostgreSQL (CNPG) |
| **Cache** | Redis |
| **WAF** | Coraza (OWASP CRS) on DMZ Istio ingress |
| **TLS** | Let's Encrypt (DMZ termination), re-encrypted to TND |
| **Registry** | `harbor.cp.bankdhofar.com/qantara/` |

### DMZ Security Controls

| Control | Implementation |
|---------|----------------|
| WAF | Coraza WasmPlugin on Istio ingressgateway — full OWASP CRS, `SecRuleEngine On` |
| TLS termination | Istio Gateway, cert `tls-omtd-bankdhofar-com` (Let's Encrypt) |
| TLS re-encryption | DestinationRule SIMPLE TLS with SNI rewrite to TND ingress |
| HTTP redirect | All HTTP/80 → HTTPS/301 |
| Request body limit | 12.5 MB (`SecRequestBodyLimit 13107200`) |
| Audit logging | `SecAuditEngine RelevantOnly` → stdout → Vector → OpenSearch |
| IP allowlisting | AuthorizationPolicy per hostname (DENY + notIpBlocks) |
| Rate limiting | EnvoyFilter local rate-limit — 100 req/s per IP, 500 burst |
| Outbound lockdown | `outboundTrafficPolicy: REGISTRY_ONLY` — only registered ServiceEntries |

### Public Endpoints (via DMZ)

| Public URL | Host Rewrite | Backend |
|------------|-------------|---------|
| `banking-api.omtd.bankdhofar.com` | `banking.tnd.bankdhofar.com` | bd-online |
| `hisab-api.omtd.bankdhofar.com` | `hisab.tnd.bankdhofar.com` | hisab |
| `masroofi-api.omtd.bankdhofar.com` | `masroofi.tnd.bankdhofar.com` | masroofi |
| `sadad-api.omtd.bankdhofar.com` | `sadad.tnd.bankdhofar.com` | sadad |
| `salalah-api.omtd.bankdhofar.com` | `salalah.tnd.bankdhofar.com` | salalah-el |
| `qantara-api.omtd.bankdhofar.com` | `qantara.tnd.bankdhofar.com` | ob-api-server |
| `mosambee.omtd.bankdhofar.com` | `mosambee.sit.bankdhofar.com` | mosambee POS |

## Adapter Strategy

All endpoints use a pluggable adapter pattern. Backend adapters are swapped per-endpoint without API changes:

| Adapter | Backend | Status |
|---------|---------|--------|
| MockAdapter | Synthetic OBIE data | Active |
| CorporateAdapter | Bank Dhofar Corporate Banking APIs | Phase 2 |
| EMandateAdapter | Bank Dhofar E-Mandate APIs | Phase 2 |

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
│   ├── ob-api-server/        # OBIE API server (FastAPI)
│   ├── ob-consent-service/   # Consent management (FastAPI)
│   ├── ob-tpp-manager/       # TPP lifecycle (Go)
│   ├── ob-event-service/     # Event webhooks (FastAPI)
│   ├── ob-portal/            # Developer portal (React)
│   ├── ob-sandbox-app/       # Mock banking app (Expo)
│   ├── bd-online-mobile/     # BD Online Banking mobile (Expo)
│   ├── hisab-mobile/         # Hisab merchant mobile (Expo)
│   ├── masroofi-mobile/      # Masroofi merchant mobile (Expo)
│   ├── sadad-mobile/         # Sadad merchant mobile (Expo)
│   ├── salalah-mobile/       # Salalah Electronics mobile (Expo)
│   └── dealer-sdk/           # Shared merchant SDK
├── helm/                     # Helm chart for K8s deployment
├── keycloak/                 # FAPI 2.0 realm configuration
├── api-catalog/              # OBIE specs and analysis docs
├── obie-specs/               # OBIE OpenAPI specifications
├── docs/                     # Architecture documentation
└── .gitlab-ci.yml            # CI/CD pipeline
```

## Related Repositories

| Repo | Purpose |
|------|---------|
| `devops/infra` | DMZ overlay, Istio routing, Coraza WAF config (`overlays/oci-bankdhofar-muscat-dmz/`) |
| `devops/crossplane/platform` | Crossplane CRs for DMZ cluster cloud resources |
| `ea/open-banking` | This repo — application code + Helm chart |
