# Qantara — High-Level Design

## 1. Overview

Qantara (قنطرة — Bridge) is Bank Dhofar's Open Banking platform, providing OBIE v4.0 compliant APIs to third-party providers (TPPs/fintechs). The platform is deployed across two Kubernetes clusters — a cloud-native DMZ for internet-facing security and a Restricted Trust Zone for application workloads — following zero-trust principles end to end.

## 2. Architecture

```mermaid
flowchart TB
    subgraph External["Internet"]
        TPP["TPP / Fintech App"]
        SandboxApp["BD Sandbox App\n(Mobile)"]
        Merchants["Merchant Apps\nBD Online, Hisab, Masroofi\nSadad, Salalah"]
    end

    subgraph DMZ["oci-mct-tnd-dmz — Cloud-Native DMZ"]
        direction TB
        IstioGW["Istio Gateway\n*.omtd.bankdhofar.com\nTLS 1.3 Termination"]
        WAF["Coraza WAF\nOWASP CRS (Full Ruleset)\nSecRuleEngine On"]
        Controls["Rate Limiting + IP Allowlisting\nPer-Hostname Policy"]
        ReEnc["TLS Re-Encryption\nSNI + Host Rewrite"]
        IstioGW --> WAF --> Controls --> ReEnc
    end

    subgraph TND["oci-mct-tnd-rtz — Restricted Trust Zone"]
        ING["Ingress Controller"]

        subgraph OBTND["Namespace: ob-tnd"]
            Portal["ob-portal\nReact + Mantine"]
            APIServer["ob-api-server\nFastAPI — 64 OBIE endpoints"]
            TPPMgr["ob-tpp-manager\nGo — TPP lifecycle"]
            EventSvc["ob-event-service\nFastAPI — Webhooks"]
            ConsentSvc["ob-consent-service\nFastAPI — Consent lifecycle"]
            BDOnline["bd-online"]
            Hisab["hisab"]
            Masroofi["masroofi"]
            Sadad["sadad"]
            SalalahEl["salalah-el"]
            PG[("PostgreSQL\nCNPG")]
            Redis[("Redis")]
        end

        subgraph Adapters["Backend Adapters (Pluggable)"]
            Mock["MockAdapter\nSynthetic data"]
            Corp["CorporateAdapter\nBD Corporate APIs"]
            EMand["EMandateAdapter\nBD E-Mandate APIs"]
        end
    end

    subgraph Keycloak["Keycloak (oci-mct-prod-rtz)"]
        KC["Realm: open-banking\nFAPI 2.0 profile"]
    end

    subgraph Backend["Bank Dhofar Backend (Phase 2)"]
        Finacle[("Finacle")]
        CBO[("CBO/ProgressSoft")]
    end

    External -->|"HTTPS 443"| IstioGW
    ReEnc -->|"TLS (internal)"| ING

    ING --> Portal
    ING --> APIServer
    ING --> TPPMgr
    ING --> BDOnline & Hisab & Masroofi & Sadad & SalalahEl

    APIServer --> ConsentSvc
    APIServer --> Mock
    APIServer -.-> Corp
    APIServer -.-> EMand
    TPPMgr --> KC
    TPPMgr --> ConsentSvc
    EventSvc --> PG
    ConsentSvc --> PG
    APIServer --> Redis

    Corp -.-> Finacle
    EMand -.-> CBO

    style DMZ fill:#1a1a2e,color:#e0e0e0
    style WAF fill:#c0392b,color:#fff
    style IstioGW fill:#2980b9,color:#fff
    style Controls fill:#8e44ad,color:#fff
    style Mock fill:#4D9134,color:#fff
    style Corp fill:#888,color:#fff
    style EMand fill:#888,color:#fff
```

## 3. Cloud-Native DMZ Architecture

The DMZ cluster (`oci-mct-tnd-dmz`) is a **dedicated, fully isolated Kubernetes cluster** serving as the sole internet-facing entry point. It replaces traditional appliance-based WAF/DMZ infrastructure with a programmable, policy-driven, cloud-native security boundary — provisioned entirely through Infrastructure as Code and continuously reconciled via GitOps.

### 3.1 Request Flow (Internet → Application)

```mermaid
sequenceDiagram
    participant Client as Mobile App / TPP
    participant LB as OCI Public LB<br/>79.76.22.216:443
    participant GW as Istio Gateway<br/>(DMZ Cluster)
    participant WAF as Coraza WAF<br/>OWASP CRS
    participant RL as Rate Limiter<br/>+ IP Allowlist
    participant DR as DestinationRule<br/>TLS Re-Encrypt
    participant ING as Ingress Controller<br/>(TND Cluster)
    participant App as Application Pod<br/>(ob-tnd namespace)

    Client->>LB: HTTPS request<br/>banking-api.omtd.bankdhofar.com
    LB->>GW: TLS 1.3 termination<br/>Wildcard cert *.omtd
    GW->>WAF: Request inspection<br/>(13 CRS rule groups)
    
    alt WAF blocks request
        WAF-->>Client: 403 Forbidden
    end
    
    WAF->>RL: Rate limit check<br/>+ IP allowlist validation
    
    alt Rate exceeded or IP denied
        RL-->>Client: 429 / 403
    end
    
    RL->>DR: Host rewrite:<br/>banking.tnd.bankdhofar.com<br/>TLS re-encryption + SNI
    DR->>ING: Encrypted internal traffic<br/>10.0.130.195:443
    ING->>App: Route by Host header<br/>→ bd-online pod
    App-->>Client: Response
```

### 3.2 Defense in Depth — Five Security Layers

```mermaid
flowchart LR
    subgraph L1["Layer 1\nCloud Network"]
        NSG["OCI Network\nSecurity Group\nPort 443 only\ninbound"]
    end
    subgraph L2["Layer 2\nTransport"]
        TLS["TLS 1.3\nTermination\ncert-manager\nAuto-Renewal"]
    end
    subgraph L3["Layer 3\nApplication\nFirewall"]
        CRS["Coraza WAF\nOWASP CRS\n13 Rule Groups\nEnforcing Mode"]
    end
    subgraph L4["Layer 4\nAccess\nControl"]
        ACL["IP Allowlisting\nRate Limiting\nPer-Hostname\nGranularity"]
    end
    subgraph L5["Layer 5\nRe-Encryption"]
        REENC["TLS Re-Encrypt\nSNI Rewrite\nHost Rewrite\nNo Plaintext\nBetween Clusters"]
    end

    L1 --> L2 --> L3 --> L4 --> L5

    style L1 fill:#2c3e50,color:#ecf0f1
    style L2 fill:#2980b9,color:#fff
    style L3 fill:#c0392b,color:#fff
    style L4 fill:#8e44ad,color:#fff
    style L5 fill:#27ae60,color:#fff
```

### 3.3 OWASP Top 10 Coverage

The Coraza WAF runs as a Wasm plugin inside the Istio Envoy proxy at the ingress gateway — zero additional network hops. It loads the complete OWASP Core Rule Set (CRS):

| OWASP Top 10 | CRS Rule Groups | Protection |
|---|---|---|
| **A01** Broken Access Control | REQUEST-911-METHOD-ENFORCEMENT, REQUEST-930-LFI | HTTP method restriction, path traversal blocking |
| **A02** Cryptographic Failures | TLS 1.3 at gateway, re-encryption to TND | No plaintext on the wire, automated cert rotation |
| **A03** Injection | REQUEST-932-RCE, REQUEST-941-XSS, REQUEST-942-SQLI, REQUEST-933-PHP, REQUEST-934-GENERIC, REQUEST-944-JAVA | SQL injection, XSS, command injection, code injection |
| **A04** Insecure Design | FAPI 2.0, consent-scoped tokens | OAuth2+PKCE, per-resource consent validation |
| **A05** Security Misconfiguration | REQUEST-920-PROTOCOL-ENFORCEMENT, SecRequestBodyLimit | Protocol validation, body size limits (12.5 MB) |
| **A06** Vulnerable Components | CI-built images only, Harbor registry | No manual builds, no runtime modification |
| **A07** Authentication Failures | REQUEST-913-SCANNER-DETECTION, REQUEST-943-SESSION-FIXATION | Scanner detection, session fixation prevention |
| **A08** Data Integrity Failures | GitOps pipeline (Git → CI → ArgoCD) | Immutable artifacts, continuous reconciliation |
| **A09** Logging & Monitoring | SecAuditEngine → Vector → OpenSearch | Real-time WAF event streaming, centralized SIEM |
| **A10** SSRF | REQUEST-931-RFI, REGISTRY_ONLY outbound | Remote inclusion blocking, outbound traffic lockdown |

### 3.4 DMZ Security Controls

| Control | Technology | Detail |
|---------|-----------|--------|
| **WAF** | Coraza WasmPlugin v0.6.0 | In-process inside Envoy (zero network hop). Full OWASP CRS. `SecRuleEngine On` (enforcing). Request body inspection enabled. |
| **TLS Termination** | Istio Gateway + cert-manager | Wildcard `*.omtd.bankdhofar.com`. Let's Encrypt ACME, auto-renewal. TLS 1.3. |
| **TLS Re-Encryption** | Istio DestinationRule | SNI rewrite to TND hostnames. No plaintext between clusters. |
| **IP Allowlisting** | Istio AuthorizationPolicy | DENY + `notIpBlocks` per hostname. Per-app granularity. |
| **Rate Limiting** | Envoy Local Rate Limit | 100 req/s per source IP, 500 burst. Per virtual host. |
| **Outbound Lockdown** | `REGISTRY_ONLY` mesh policy | No implicit outbound. Every upstream explicitly registered. Prevents exfiltration / C2. |
| **HTTP Redirect** | HTTPRoute `tls-redirect` | All HTTP/80 → HTTPS/301. No plaintext API access. |
| **Request Size Limit** | `SecRequestBodyLimit` | 12.5 MB max. Prevents oversized payload abuse. |
| **Audit Logging** | Coraza → stdout → Vector → OpenSearch | Real-time WAF event streaming for SIEM integration. |

### 3.5 Cloud-Native DMZ vs Traditional Appliance WAF

| Capability | Traditional Appliance WAF | Qantara Cloud-Native DMZ |
|---|---|---|
| **Deployment model** | Physical/virtual appliance, manual config | Kubernetes-native, declarative YAML, GitOps-driven |
| **Scaling** | Vertical (larger appliance) | Horizontal auto-scaling (HPA, 1–N replicas) |
| **Rule updates** | Manual vendor patches, change windows | Git commit → ArgoCD sync, OWASP CRS versioned |
| **Configuration drift** | Common, difficult to detect | Impossible — ArgoCD continuously reconciles desired state |
| **Observability** | Vendor-proprietary dashboard | OpenSearch + Vector pipeline, open standard log format |
| **Multi-tenancy** | Shared appliance, blast radius = all apps | Per-hostname policies, per-app rate limits and ACLs |
| **TLS management** | Manual cert rotation, outage risk | cert-manager auto-renewal, zero-downtime rotation |
| **Infrastructure as Code** | Rarely or partially | 100% — every resource is a versioned, auditable Git artifact |
| **Disaster recovery** | Active-passive, manual failover | Redeploy entire DMZ from Git to any cluster in minutes |
| **Cost model** | CapEx licensing + annual support contracts | Open source stack (Coraza, Istio, CRS), OpEx only |
| **Vendor lock-in** | High (F5, Imperva, Fortinet, etc.) | None — entirely CNCF-standard components |

## 4. OBIE API Coverage

| Spec | Endpoints | Status |
|------|-----------|--------|
| Account Information (AIS) | 23 | Mock |
| Payment Initiation (PIS) | 18 | Mock |
| Confirmation of Funds (CoF) | 4 | Mock |
| Variable Recurring Payments (VRP) | 6 | Mock |
| Event Notifications | 7 | Mock |
| Event Subscriptions | 6 | Mock |
| **Total** | **64** | **All Mock (Phase 1)** |

## 5. Consent Flow

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
    App->>KC: Authenticate (FAPI 2.0)
    KC-->>App: Session

    App->>CS: GET /consents/{id}
    CS-->>App: Consent details
    App->>Customer: Show permissions + account picker
    Customer->>App: Approve

    App->>CS: POST /consents/{id}/authorize
    CS-->>App: Authorization code
    App-->>TPP: Redirect with code

    TPP->>KC: Exchange code for token (PKCE)
    KC-->>TPP: Access token (consent-scoped)

    TPP->>API: GET /accounts (Bearer token)
    API->>CS: Validate consent
    CS-->>API: Valid + scoped accounts
    API-->>TPP: Account data (OBIE format)
```

## 6. Public Endpoints

### DMZ-Exposed Services (*.omtd.bankdhofar.com)

```mermaid
flowchart LR
    subgraph DMZ["DMZ Gateway\n*.omtd.bankdhofar.com"]
        A["banking-api.omtd"]
        B["hisab-api.omtd"]
        C["masroofi-api.omtd"]
        D["sadad-api.omtd"]
        E["salalah-api.omtd"]
        F["qantara-api.omtd"]
        G["mosambee.omtd"]
    end

    subgraph TND["TND Cluster\n*.tnd.bankdhofar.com"]
        A1["bd-online"]
        B1["hisab"]
        C1["masroofi"]
        D1["sadad"]
        E1["salalah-el"]
        F1["ob-portal\nob-api-server\nob-tpp-manager"]
        G1["mosambee"]
    end

    A -->|"Host: banking.tnd"| A1
    B -->|"Host: hisab.tnd"| B1
    C -->|"Host: masroofi.tnd"| C1
    D -->|"Host: sadad.tnd"| D1
    E -->|"Host: salalah.tnd"| E1
    F -->|"Host: qantara.tnd"| F1
    G -->|"Host: mosambee.sit"| G1

    style DMZ fill:#1a1a2e,color:#e0e0e0
    style TND fill:#1e3a2e,color:#e0e0e0
```

## 7. Application Security (TND Layer)

| Control | Implementation |
|---------|----------------|
| **API Authentication** | OAuth2 + PKCE (Keycloak FAPI 2.0) |
| **Consent Validation** | Per-request consent check, consent-scoped tokens |
| **FAPI Compliance** | `x-fapi-interaction-id` on every response, financial-grade security profile |
| **Error Handling** | OBIE standard format `{ Code, Id, Message, Errors[] }` |
| **Audit Trail** | Full consent history, API access logs, immutable event records |
| **Data Layer** | PostgreSQL (CNPG) with automated backups, Redis for token cache |

## 8. Deployment Phases

```mermaid
gantt
    title Qantara Deployment Roadmap
    dateFormat YYYY-MM
    axisFormat %b %Y

    section Phase 1 — Sandbox
    All 64 OBIE endpoints (Mock)       :done, p1a, 2025-10, 2026-03
    Cloud-Native DMZ build             :done, p1b, 2026-01, 2026-04
    Merchant mock storefronts          :done, p1c, 2026-02, 2026-04
    FAPI 2.0 Keycloak realm            :done, p1d, 2025-11, 2026-01
    ISD security review                :active, p1e, 2026-05, 2026-06

    section Phase 2 — Real Backends
    CorporateAdapter (Finacle)         :p2a, 2026-06, 2026-09
    EMandateAdapter (CBO)              :p2b, 2026-07, 2026-09
    Theqa eKYC integration             :p2c, 2026-07, 2026-10

    section Phase 3 — Production
    Production deployment              :p3a, 2026-10, 2026-12
```

## 9. IaC and GitOps Pipeline

```mermaid
flowchart LR
    subgraph Dev["Developer"]
        Code["Git Commit"]
    end
    subgraph CI["GitLab CI"]
        Build["Kaniko Build"]
        Push["Harbor Push"]
        Helm["Helm Package"]
    end
    subgraph CD["ArgoCD"]
        Sync["Continuous\nReconciliation"]
    end
    subgraph K8s["Kubernetes"]
        DMZCluster["DMZ Cluster\nCoraza + Istio"]
        TNDCluster["TND Cluster\nApplication Pods"]
    end

    Code --> Build --> Push --> Helm --> Sync
    Sync --> DMZCluster & TNDCluster

    style CI fill:#e67e22,color:#fff
    style CD fill:#3498db,color:#fff
    style DMZCluster fill:#1a1a2e,color:#e0e0e0
    style TNDCluster fill:#1e3a2e,color:#e0e0e0
```
