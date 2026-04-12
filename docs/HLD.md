# Qantara — High-Level Design

## 1. Overview

Qantara (قنطرة — Bridge) is Bank Dhofar's Open Banking platform, providing OBIE v4.0 compliant APIs to third-party providers (TPPs/fintechs).

## 2. Architecture

```mermaid
flowchart TB
    subgraph External["External (Future — DMZ)"]
        TPP[TPP / Fintech App]
        SandboxApp[BD Sandbox App<br/>Expo Go]
    end

    subgraph Gateway["Istio Ingress Gateway"]
        GW["qantara.tnd.bankdhofar.com<br/>TLS + FAPI Headers"]
    end

    subgraph K8s["oci-mct-tnd-rtz — Namespace: ob-tnd"]
        subgraph Frontend
            Portal[ob-portal<br/>React + Mantine<br/>Port 80]
        end

        subgraph API["API Layer"]
            APIServer[ob-api-server<br/>FastAPI<br/>64 OBIE endpoints]
            TPPMgr[ob-tpp-manager<br/>Go<br/>TPP lifecycle]
            EventSvc[ob-event-service<br/>FastAPI<br/>Webhooks]
        end

        subgraph Core["Core Services"]
            ConsentSvc[ob-consent-service<br/>FastAPI<br/>Consent lifecycle]
        end

        subgraph Adapters["Backend Adapters (Pluggable)"]
            Mock[MockAdapter<br/>Synthetic data]
            Corp[CorporateAdapter<br/>BD Corporate APIs]
            EMand[EMandateAdapter<br/>BD E-Mandate APIs]
        end

        subgraph Data["Data Layer"]
            PG[(PostgreSQL CNPG<br/>consents, tpp, events, payments)]
            Redis[(Redis<br/>Token cache)]
        end
    end

    subgraph Keycloak["Keycloak (oci-mct-prod-rtz)"]
        KC[Realm: open-banking<br/>FAPI 2.0 profile]
    end

    subgraph Backend["Bank Dhofar Backend (Phase 2)"]
        Finacle[(Finacle<br/>Core Banking)]
        CBO[(CBO/ProgressSoft<br/>E-Mandate)]
        EasyBiz[(EasyBiz<br/>Payment Collection)]
    end

    TPP --> GW
    SandboxApp --> GW

    GW -->|/| Portal
    GW -->|/open-banking/*| APIServer
    GW -->|/portal-api/*| TPPMgr
    GW -->|/webhooks/*| EventSvc

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

## 5. Deployment Phases

| Phase | Where | What |
|-------|-------|------|
| **1 (Current)** | oci-mct-tnd-rtz / ob-tnd | All services, mock adapters, internal testing |
| **2** | Same + real adapters | Corporate Banking + E-Mandate adapter swap |
| **3** | oci-mct-tnd-dmz | DMZ exposure, OPTIONAL_MUTUAL TLS, real fintech onboarding |
| **4** | oci-mct-prod-rtz | Production, CBO compliance |

## 6. Security

| Layer | Mechanism |
|-------|-----------|
| Transport | TLS 1.3 (Istio mesh) |
| API Auth | OAuth2 + PKCE (Keycloak FAPI 2.0) |
| Consent | Per-request validation (consent-scoped tokens) |
| mTLS | OPTIONAL_MUTUAL on DMZ (Phase 3) |
| Rate Limiting | Per-TPP via Envoy (Phase 3) |
| Audit | Full consent history + API access logs |
