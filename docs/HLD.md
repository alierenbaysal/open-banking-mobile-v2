# Qantara — High-Level Design

## 1. Overview

Qantara (قنطرة — Bridge) is Bank Dhofar's Open Banking platform, providing OBIE v4.0 compliant APIs to third-party providers (TPPs/fintechs).

## 2. Architecture

```mermaid
flowchart TB
    subgraph External["External — Internet"]
        TPP[TPP / Fintech App]
        SandboxApp[BD Sandbox App<br/>Mobile]
        Merchants[Merchant Apps<br/>BD Online, Hisab, Masroofi,<br/>Sadad, Salalah]
    end

    subgraph DMZ["oci-mct-tnd-dmz — DMZ Cluster (79.76.22.216)"]
        IstioGW["Istio Gateway<br/>*.omtd.bankdhofar.com<br/>TLS termination (Let's Encrypt)"]
        WAF["Coraza WAF<br/>OWASP CRS<br/>SecRuleEngine On"]
        IstioGW --> WAF
    end

    subgraph TND["oci-mct-tnd-rtz — TND Cluster (Restricted Trust Zone)"]
        NGINX["ingress-nginx<br/>10.0.130.195"]
        IstioLegacy["istio-ingressgateway<br/>10.0.130.210 (legacy)"]

        subgraph OBTND["Namespace: ob-tnd"]
            Portal[ob-portal<br/>React + Mantine<br/>Port 80]
            APIServer[ob-api-server<br/>FastAPI<br/>64 OBIE endpoints]
            TPPMgr[ob-tpp-manager<br/>Go<br/>TPP lifecycle]
            EventSvc[ob-event-service<br/>FastAPI<br/>Webhooks]
            ConsentSvc[ob-consent-service<br/>FastAPI<br/>Consent lifecycle]
            BDOnline[bd-online<br/>React storefront]
            Hisab[hisab<br/>React storefront]
            Masroofi[masroofi<br/>React storefront]
            Sadad[sadad<br/>React storefront]
            SalalahEl[salalah-el<br/>React storefront]
            PG[(PostgreSQL CNPG)]
            Redis[(Redis)]
        end

        subgraph Adapters["Backend Adapters"]
            Mock[MockAdapter<br/>Synthetic data]
            Corp[CorporateAdapter<br/>BD Corporate APIs]
            EMand[EMandateAdapter<br/>BD E-Mandate APIs]
        end
    end

    subgraph Keycloak["Keycloak (oci-mct-prod-rtz)"]
        KC[Realm: open-banking<br/>FAPI 2.0 profile]
    end

    subgraph Backend["Bank Dhofar Backend (Phase 2)"]
        Finacle[(Finacle)]
        CBO[(CBO/ProgressSoft)]
    end

    External -->|HTTPS 443| IstioGW
    WAF -->|"TLS re-encrypt<br/>Host rewrite"| NGINX
    WAF -->|"mosambee.omtd"| IstioLegacy

    NGINX -->|qantara.tnd| Portal
    NGINX -->|qantara.tnd/open-banking| APIServer
    NGINX -->|qantara.tnd/portal-api| TPPMgr
    NGINX -->|banking.tnd| BDOnline
    NGINX -->|hisab.tnd| Hisab
    NGINX -->|masroofi.tnd| Masroofi
    NGINX -->|sadad.tnd| Sadad
    NGINX -->|salalah.tnd| SalalahEl

    APIServer --> ConsentSvc
    APIServer --> Mock
    APIServer -.-> Corp
    APIServer -.-> EMand
    TPPMgr --> KC
    TPPMgr --> ConsentSvc
    EventSvc --> PG
    ConsentSvc --> PG

    Corp -.-> Finacle
    EMand -.-> CBO

    style Mock fill:#4D9134,color:#fff
    style Corp fill:#888,color:#fff
    style EMand fill:#888,color:#fff
    style WAF fill:#c0392b,color:#fff
    style IstioGW fill:#2980b9,color:#fff
```

## 3. OBIE API Coverage

| Spec | Endpoints | Status |
|------|-----------|--------|
| Account Information (AIS) | 23 | Mock |
| Payment Initiation (PIS) | 18 | Mock |
| Confirmation of Funds (CoF) | 4 | Mock |
| Variable Recurring Payments (VRP) | 6 | Mock |
| Event Notifications | 7 | Mock |
| Event Subscriptions | 6 | Mock |
| **Total** | **64** | **All Mock (Phase 1)** |

## 4. Consent Flow

```mermaid
sequenceDiagram
    participant TPP
    participant API as ob-api-server
    participant CS as ob-consent-service
    participant App as BD Sandbox App
    participant KC as Keycloak
    participant Customer

    TPP->>API: POST /account-access-consents
    API->>CS: Create consent
    CS-->>API: ConsentId (AwaitingAuth)
    API-->>TPP: ConsentId + redirect

    TPP->>App: Redirect to authorize
    Customer->>App: Login
    App->>KC: Authenticate
    KC-->>App: Session

    App->>CS: GET /consents/{id}
    CS-->>App: Consent details
    App->>Customer: Show permissions + account picker
    Customer->>App: Approve

    App->>CS: POST /consents/{id}/authorize
    CS-->>App: Authorization code
    App-->>TPP: Redirect with code

    TPP->>KC: Exchange code for token
    KC-->>TPP: Access token (consent-scoped)

    TPP->>API: GET /accounts (Bearer token)
    API->>CS: Validate consent
    CS-->>API: Valid
    API-->>TPP: Account data (OBIE format)
```

## 5. Deployment

### Clusters

| Cluster | Context | Role |
|---------|---------|------|
| **OCI Muscat DMZ** | `oci-mct-tnd-dmz` | Internet-facing reverse proxy, WAF, TLS termination |
| **OCI Muscat TND** | `oci-mct-tnd-rtz` | Application workloads, namespace `ob-tnd` |

### Request Flow (Internet → Application)

```
Mobile/TPP → 79.76.22.216:443
  → Istio Gateway (TLS termination, *.omtd.bankdhofar.com)
    → Coraza WAF (OWASP CRS inspection)
      → HTTPRoute (host-based routing + Host header rewrite)
        → DestinationRule (TLS re-encryption + SNI rewrite)
          → TND ingress-nginx 10.0.130.195
            → Kubernetes Ingress → ob-tnd pods
```

### Public Endpoints (DMZ)

| Public URL | Host Rewrite | Target Service |
|------------|-------------|----------------|
| `banking-api.omtd.bankdhofar.com` | `banking.tnd.bankdhofar.com` | bd-online |
| `hisab-api.omtd.bankdhofar.com` | `hisab.tnd.bankdhofar.com` | hisab |
| `masroofi-api.omtd.bankdhofar.com` | `masroofi.tnd.bankdhofar.com` | masroofi |
| `sadad-api.omtd.bankdhofar.com` | `sadad.tnd.bankdhofar.com` | sadad |
| `salalah-api.omtd.bankdhofar.com` | `salalah.tnd.bankdhofar.com` | salalah-el |
| `qantara-api.omtd.bankdhofar.com` | `qantara.tnd.bankdhofar.com` | qantara platform |
| `mosambee.omtd.bankdhofar.com` | `mosambee.sit.bankdhofar.com` | mosambee POS |

### Phases

| Phase | What |
|-------|------|
| **1 (Current)** | All services deployed, mock adapters, DMZ internet exposure active |
| **2** | Corporate Banking + E-Mandate adapter swap |
| **3** | Production (`oci-mct-prod-rtz`) |

## 6. Security

### DMZ Layer (oci-mct-tnd-dmz)

| Control | Implementation | Config Location |
|---------|----------------|-----------------|
| WAF | Coraza WasmPlugin, OWASP CRS, `SecRuleEngine On` | `infra` repo: `overlays/oci-bankdhofar-muscat-dmz/istio/gateways/ingress.yaml` |
| TLS termination | Istio Gateway, Let's Encrypt cert | Same file — Gateway resource |
| TLS re-encryption | DestinationRule SIMPLE TLS + SNI rewrite to TND | Per-app routing YAML in `infra` repo |
| HTTP redirect | HTTPRoute `tls-redirect`, 301 to HTTPS | `overlays/oci-bankdhofar-muscat-dmz/istio/gateways/http-redirect.yaml` |
| Request body limit | 12.5 MB (`SecRequestBodyLimit 13107200`) | WasmPlugin directives |
| IP allowlisting | AuthorizationPolicy DENY + notIpBlocks per hostname | Per-app routing YAML |
| Rate limiting | EnvoyFilter local rate-limit, 100 req/s per IP, 500 burst | Per-app routing YAML |
| Outbound lockdown | `outboundTrafficPolicy: REGISTRY_ONLY` | Istio mesh config |
| Audit logging | `SecAuditEngine RelevantOnly` → stdout → Vector → OpenSearch | WasmPlugin directives |

### Application Layer (oci-mct-tnd-rtz)

| Control | Implementation |
|---------|----------------|
| API Auth | OAuth2 + PKCE (Keycloak FAPI 2.0) |
| Consent | Per-request validation (consent-scoped tokens) |
| FAPI headers | `x-fapi-interaction-id` on every response |
| Error format | OBIE standard `{ Code, Id, Message, Errors[] }` |
| Audit | Full consent history + API access logs |
