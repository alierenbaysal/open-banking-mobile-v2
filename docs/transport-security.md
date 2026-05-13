# Transport Security — mTLS Authentication for Third-Party Providers

This document describes how Third-Party Providers (TPPs) authenticate to the Qantara Open Banking platform using mutual TLS (mTLS) client certificates, and how access tokens are cryptographically bound to those certificates to prevent token theft.

## TPP Authentication Architecture

Every TPP — whether a fintech in Dubai, a payment processor in Riyadh, or an e-commerce platform in Bahrain — authenticates to Qantara through the same security chain: **mTLS client certificate at the DMZ gateway, followed by Keycloak FAPI 2.0 OAuth2 token exchange with certificate-bound access tokens**.

```mermaid
flowchart TB
    subgraph TPPs["Third-Party Providers (External Networks)"]
        direction LR
        BD["BD Online\nOnline Banking\nMuscat"]
        HI["Hisab\nAccounting Platform\nDubai"]
        MA["Masroofi\nDigital Wallet\nRiyadh"]
        SA["Sadad\nBill Payments\nBahrain"]
        SL["Salalah Electronics\nE-Commerce\nSalalah"]
    end

    subgraph DMZ["oci-mct-tnd-dmz — Cloud-Native DMZ"]
        direction TB
        GW["Istio Gateway\ntls.mode: MUTUAL\nValidates TPP client certificate\nagainst trusted CA bundle"]
        WAF["Coraza WAF\nOWASP CRS Inspection"]
        RL["Rate Limiting\nIP Allowlisting"]
        REENC["TLS Re-Encryption\nto TND Cluster"]
        GW --> WAF --> RL --> REENC
    end

    subgraph TND["oci-mct-tnd-rtz — Restricted Trust Zone"]
        direction TB
        KC["Keycloak FAPI 2.0\nmTLS Token Exchange\nCertificate-Bound Tokens"]
        API["ob-api-server\nVerifies token thumbprint\nmatches presented certificate"]
        CS["ob-consent-service\nConsent-Scoped Access"]
        KC --> API --> CS
    end

    TPPs -->|"mTLS Handshake\nClient Cert + TLS 1.3"| GW
    REENC -->|"TLS Re-Encrypted\nInternal Network"| KC

    style TPPs fill:#2c3e50,color:#ecf0f1
    style DMZ fill:#1a1a2e,color:#e0e0e0
    style TND fill:#1e3a2e,color:#e0e0e0
```

## Registered TPP Applications

Each TPP is registered as an independent external entity with its own client certificate, OAuth2 credentials, and role-based permissions. The mock merchant storefronts demonstrate real-world TPP integration patterns:

| TPP Application | Role | Public Endpoint | Use Case |
|---|---|---|---|
| **BD Online** | PISP | `banking-api.omtd.bankdhofar.com` | Online banking payment initiation |
| **Hisab** | PISP | `hisab-api.omtd.bankdhofar.com` | Accounting platform payments |
| **Masroofi** | PISP | `masroofi-api.omtd.bankdhofar.com` | Digital wallet top-up |
| **Sadad** | PISP | `sadad-api.omtd.bankdhofar.com` | Bill payment processing |
| **Salalah Electronics** | PISP | `salalah-api.omtd.bankdhofar.com` | E-commerce checkout |

All TPP traffic enters exclusively through the DMZ cluster at `79.76.22.216:443`. There is no direct access to the application cluster from the internet.

## mTLS Authentication Flow

The complete authentication chain has three levels: transport-level mTLS, token exchange with certificate binding, and consent-scoped API access.

```mermaid
sequenceDiagram
    participant TPP as TPP Application<br/>(External Network)
    participant DMZ as DMZ Istio Gateway<br/>(mTLS Termination)
    participant WAF as Coraza WAF<br/>(Request Inspection)
    participant KC as Keycloak<br/>(FAPI 2.0)
    participant API as ob-api-server<br/>(Token Validation)

    Note over TPP,DMZ: Level 1 — mTLS Handshake
    TPP->>DMZ: TLS 1.3 ClientHello
    DMZ->>TPP: ServerHello + CertificateRequest
    TPP->>DMZ: Client Certificate + CertificateVerify
    DMZ->>DMZ: Validate cert against trusted CA bundle
    DMZ->>TPP: TLS Handshake Complete

    Note over TPP,WAF: Request passes through security layers
    TPP->>DMZ: HTTPS Request
    DMZ->>WAF: Decrypted request
    WAF->>WAF: OWASP CRS inspection

    Note over TPP,KC: Level 2 — Certificate-Bound Token Exchange
    TPP->>KC: POST /token<br/>grant_type=client_credentials<br/>client_id + mTLS cert authentication
    KC->>KC: Validate client certificate<br/>Extract thumbprint (x5t#S256)<br/>Bind token to thumbprint
    KC->>TPP: Access token (certificate-bound)

    Note over TPP,API: Level 3 — API Access with Token Verification
    TPP->>API: GET /open-banking/v4.0/aisp/accounts<br/>Authorization: Bearer token<br/>Client certificate presented
    API->>API: Extract cert thumbprint<br/>Compare with token x5t#S256<br/>Verify match
    API->>TPP: OBIE response (consent-scoped)
```

### Level 1 — mTLS at DMZ Gateway (Transport Authentication)

The Istio Gateway in the DMZ cluster operates in `tls.mode: MUTUAL`, requiring every TPP to present a valid X.509 client certificate during the TLS handshake. The connection is rejected before any HTTP traffic is processed if the certificate is missing, expired, or not signed by a trusted CA.

```yaml
# Istio Gateway — mTLS mode
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: qantara-gateway
  namespace: istio-ingress
spec:
  listeners:
    - name: https-mtls
      port: 443
      protocol: HTTPS
      tls:
        mode: Mutual
        certificateRefs:
          - name: tls-omtd-bankdhofar-com
        clientValidation:
          caCertificateRefs:
            - name: tpp-trusted-ca-bundle
```

| Property | Value |
|---|---|
| TLS Version | 1.3 (minimum enforced) |
| Server Certificate | `*.omtd.bankdhofar.com` (Let's Encrypt, auto-renewed) |
| Client Certificate | Required — TPP must present valid X.509 cert |
| CA Validation | TPP cert must chain to a CA in `tpp-trusted-ca-bundle` |
| Termination Point | Istio Gateway in DMZ cluster |
| Failure Mode | Connection rejected at TLS layer (no HTTP response) |

### Level 2 — Certificate-Bound Access Tokens (FAPI 2.0)

After the mTLS handshake succeeds, the TPP authenticates to Keycloak to obtain an access token. Keycloak binds the token to the TPP's certificate thumbprint, creating a cryptographic link between the transport credential and the bearer token.

```mermaid
flowchart LR
    subgraph Step1["1. Certificate Upload"]
        TPP1["TPP uploads\nX.509 certificate\nvia Qantara Portal"]
        MGR["ob-tpp-manager\nParses PEM\nValidates X.509\nExtracts SHA-256\nthumbprint"]
        KC1["Keycloak stores\ncertificate on\nOIDC client"]
        TPP1 --> MGR --> KC1
    end

    subgraph Step2["2. Token Exchange"]
        TPP2["TPP authenticates\nwith mTLS cert\n+ client_id"]
        KC2["Keycloak validates cert\nBinds token to\nthumbprint (x5t#S256)"]
        TOK["Access token issued\nwith cnf.x5t#S256 claim"]
        TPP2 --> KC2 --> TOK
    end

    subgraph Step3["3. API Call"]
        TPP3["TPP calls API\nwith Bearer token\n+ mTLS cert"]
        API["ob-api-server\nExtracts cert thumbprint\nCompares with token\nx5t#S256 claim"]
        OK["Match: request proceeds\nMismatch: 401 Unauthorized"]
        TPP3 --> API --> OK
    end

    Step1 ~~~ Step2 ~~~ Step3

    style Step1 fill:#2980b9,color:#fff
    style Step2 fill:#8e44ad,color:#fff
    style Step3 fill:#27ae60,color:#fff
```

The Keycloak OIDC client for each TPP is configured with FAPI 2.0 security profile:

| Setting | Value | Purpose |
|---|---|---|
| `tls.client.certificate.bound.access.tokens` | `true` | Binds every token to the presenting cert |
| `pkce.code.challenge.method` | `S256` | PKCE with SHA-256 challenge |
| `token.endpoint.auth.signing.alg` | `PS256` | RSA-PSS with SHA-256 |
| `id.token.signed.response.alg` | `PS256` | Signed ID tokens |
| `require.pushed.authorization.requests` | `true` | PAR required |
| Token lifetime | 3600 seconds | 1 hour maximum |

This means **a stolen access token is useless** — the attacker cannot present the matching client certificate because they do not possess the TPP's private key.

### Level 3 — Consent-Scoped API Access

Even with a valid certificate-bound token, the TPP can only access data the customer has explicitly consented to. The `ob-api-server` validates three things on every request:

```mermaid
flowchart TB
    REQ["Incoming API Request\nBearer token + mTLS cert"]

    subgraph Validation["Three-Layer Validation"]
        V1["1. Certificate Match\nToken x5t#S256 ==\nPresented cert thumbprint"]
        V2["2. Consent Valid\nConsent status == Authorised\nNot expired, not revoked"]
        V3["3. Scope Check\nRequested resource within\nconsented permissions\nand selected accounts"]
    end

    PASS["200 OK\nOBIE Response"]
    FAIL["401 / 403\nRejected"]

    REQ --> V1
    V1 -->|"Match"| V2
    V1 -->|"Mismatch"| FAIL
    V2 -->|"Valid"| V3
    V2 -->|"Invalid"| FAIL
    V3 -->|"In scope"| PASS
    V3 -->|"Out of scope"| FAIL

    style Validation fill:#1a1a2e,color:#e0e0e0
    style PASS fill:#27ae60,color:#fff
    style FAIL fill:#c0392b,color:#fff
```

## TPP Certificate Lifecycle

The `ob-tpp-manager` service manages the full lifecycle of TPP client certificates, from upload through validation to Keycloak binding.

```mermaid
sequenceDiagram
    participant Dev as TPP Developer
    participant Portal as Qantara Portal
    participant MGR as ob-tpp-manager
    participant KC as Keycloak
    participant DB as PostgreSQL

    Note over Dev,Portal: Step 1 — Generate and Upload Certificate
    Dev->>Dev: Generate RSA/EC keypair
    Dev->>Dev: Obtain X.509 cert from trusted CA
    Dev->>Portal: Upload PEM-encoded certificate

    Note over Portal,DB: Step 2 — Validate and Store
    Portal->>MGR: POST /portal-api/tpp/{id}/certificate
    MGR->>MGR: Decode PEM block
    MGR->>MGR: Parse X.509 structure
    MGR->>MGR: Verify notBefore / notAfter
    MGR->>MGR: Extract SHA-256 thumbprint
    MGR->>DB: Store certificate metadata + thumbprint
    MGR->>KC: Upload cert to OIDC client
    KC-->>MGR: Certificate bound
    MGR-->>Portal: Certificate accepted

    Note over Dev,KC: Step 3 — Runtime Authentication
    Dev->>KC: Token request with mTLS cert
    KC->>KC: Match presented cert to stored cert
    KC->>KC: Bind token to x5t#S256 thumbprint
    KC-->>Dev: Certificate-bound access token
```

### Certificate Validation (ob-tpp-manager)

The certificate manager (`internal/certs/manager.go`) performs strict validation on every uploaded certificate:

| Check | Failure Condition | Error |
|---|---|---|
| PEM decode | No valid PEM block found | Rejected |
| Block type | Type is not `CERTIFICATE` | Rejected |
| X.509 parse | Malformed ASN.1 structure | Rejected |
| Not before | Current time before `notBefore` | Rejected — cert not yet valid |
| Not after | Current time after `notAfter` | Rejected — cert expired |
| Thumbprint | SHA-256 of DER-encoded cert | Extracted and stored |

### Certificate Management API

| Endpoint | Method | Purpose |
|---|---|---|
| `/portal-api/tpp/{id}/certificate` | `POST` | Upload PEM-encoded X.509 client certificate |
| `/portal-api/tpp/{id}/certificate` | `GET` | Retrieve certificate metadata and thumbprint |

## End-to-End Request Path

A complete API request from a TPP traverses the following security layers:

```mermaid
flowchart TB
    subgraph External["External Network (Internet)"]
        TPP["TPP Application\n(e.g. Hisab in Dubai)"]
    end

    subgraph DMZ["oci-mct-tnd-dmz — DMZ Cluster"]
        direction TB
        LB["OCI Load Balancer\n79.76.22.216:443\nTCP Passthrough"]
        MTLS["Istio Gateway\nmTLS Termination\nClient cert validated\nagainst trusted CA"]
        WAF["Coraza WAF\nOWASP CRS\n13 Rule Groups"]
        RL["Rate Limiting\n100 req/s per IP"]
        IPAL["IP Allowlisting\nPer-Hostname ACL"]
        REENC["DestinationRule\nTLS Re-Encryption\nSNI Rewrite"]
        LB --> MTLS --> WAF --> RL --> IPAL --> REENC
    end

    subgraph TND["oci-mct-tnd-rtz — Application Cluster"]
        direction TB
        ING["Ingress Controller\n10.0.130.195:443"]
        API["ob-api-server\nToken thumbprint verification\nConsent validation"]
        ING --> API
    end

    TPP -->|"mTLS 1.3\nClient cert + request"| LB
    REENC -->|"TLS re-encrypted\nInternal network only"| ING

    style External fill:#2c3e50,color:#ecf0f1
    style DMZ fill:#1a1a2e,color:#e0e0e0
    style TND fill:#1e3a2e,color:#e0e0e0
    style MTLS fill:#2980b9,color:#fff
    style WAF fill:#c0392b,color:#fff
```

### TLS Segments

There are three distinct TLS segments in the request path. At no point does traffic travel unencrypted between clusters.

| Segment | From | To | Protocol | Purpose |
|---|---|---|---|---|
| 1 | TPP (internet) | DMZ Istio Gateway | mTLS 1.3 | Client certificate authentication |
| 2 | DMZ DestinationRule | TND Ingress Controller | TLS (re-encrypted) | Secure internal forwarding |
| 3 | TND Ingress | Application pods | Istio auto-mTLS | Encrypted mesh traffic |

**Segment 1 — mTLS from TPP to DMZ**: The TPP presents its client certificate. The Istio Gateway validates the certificate chain against the trusted CA bundle and terminates TLS. The Coraza WAF inspects the decrypted HTTP request.

**Segment 2 — Re-encryption to TND**: The DMZ DestinationRule establishes a new TLS connection to the TND ingress controller with SNI rewrite, ensuring traffic between clusters is always encrypted.

```yaml
# DestinationRule — TLS re-encryption from DMZ to TND
apiVersion: networking.istio.io/v1
kind: DestinationRule
spec:
  host: tnd-nginx-ingress-banking.istio-ingress.svc.cluster.local
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: banking.tnd.bankdhofar.com
```

**Segment 3 — Mesh encryption within TND**: All application pods run with Istio sidecar proxy. Pod-to-pod traffic is automatically encrypted with mTLS using short-lived, auto-rotated certificates issued by Istiod (mesh CA), enforcing TLS 1.3 as the minimum protocol version.

## Security Properties Summary

| Property | Implementation |
|---|---|
| **TPP Identity** | X.509 client certificate, validated at DMZ gateway |
| **Token Binding** | Access token bound to cert thumbprint (x5t#S256 via FAPI 2.0) |
| **Token Theft Protection** | Stolen token unusable without corresponding private key |
| **Transport Encryption** | TLS 1.3 enforced on all segments, no plaintext anywhere |
| **Request Inspection** | Coraza WAF with full OWASP CRS after mTLS termination |
| **Consent Enforcement** | Every API call validated against customer consent scope |
| **Certificate Validation** | PEM parsing, X.509 verification, expiry checking, thumbprint extraction |
| **Key Algorithm** | PS256 (RSA-PSS with SHA-256) for all token signatures |
| **PKCE** | S256 challenge method required |
| **Certificate Rotation** | TPP uploads new cert via portal, Keycloak binding updated |
| **Mesh Encryption** | Istio auto-mTLS with TLS 1.3, 24h certificate rotation |
