# Transport Security — mTLS and TLS Architecture

This document describes the transport security model for the Qantara Open Banking platform, covering TLS termination, re-encryption between clusters, mTLS for TPP authentication, and the certificate lifecycle.

## TLS Architecture Overview

```mermaid
flowchart TB
    subgraph Internet["Internet"]
        TPP["TPP Application"]
    end

    subgraph DMZ["oci-mct-tnd-dmz — DMZ Cluster"]
        direction TB
        LB["OCI Public Load Balancer\n79.76.22.216:443\nTCP passthrough"]
        GW["Istio Gateway\nTLS 1.3 Termination\n*.omtd.bankdhofar.com\ncert-manager auto-renewal"]
        WAF["Coraza WAF\nInspects decrypted request"]
        DR["DestinationRule\nTLS Re-Encryption\nSNI rewrite to TND hostname"]
        LB --> GW --> WAF --> DR
    end

    subgraph Internal["OCI Internal Network\n(no public exposure)"]
        direction LR
    end

    subgraph TND["oci-mct-tnd-rtz — TND Cluster"]
        ING["Ingress Controller\n10.0.130.195:443\nTLS terminated again"]
        APP["Application Pod\nPlaintext within mesh"]
        ING --> APP
    end

    TPP -->|"TLS 1.3\n(internet)"| LB
    DR -->|"TLS\n(internal re-encrypted)"| ING

    style DMZ fill:#1a1a2e,color:#e0e0e0
    style TND fill:#1e3a2e,color:#e0e0e0
```

## TLS Segments

There are **three distinct TLS segments** in the request path. At no point does traffic travel unencrypted between clusters.

```mermaid
flowchart LR
    subgraph Seg1["Segment 1\nInternet → DMZ"]
        S1["TLS 1.3\nClient → DMZ LB\nLet's Encrypt cert\n*.omtd.bankdhofar.com"]
    end
    subgraph Seg2["Segment 2\nDMZ → TND"]
        S2["TLS (re-encrypted)\nDMZ Envoy → TND Ingress\nSNI rewrite\nInternal network only"]
    end
    subgraph Seg3["Segment 3\nTND Internal"]
        S3["Ingress → Pod\nPlaintext within\ncluster network\n(pod-level trust)"]
    end

    Seg1 -->|"DMZ terminates\ninspects (WAF)\nre-encrypts"| Seg2
    Seg2 -->|"TND ingress\nterminates"| Seg3

    style Seg1 fill:#2980b9,color:#fff
    style Seg2 fill:#27ae60,color:#fff
    style Seg3 fill:#7f8c8d,color:#fff
```

### Segment 1 — Internet to DMZ (TLS 1.3)

| Property | Value |
|---|---|
| Protocol | TLS 1.3 |
| Certificate | `*.omtd.bankdhofar.com` (wildcard) |
| Issuer | Let's Encrypt (ACME) |
| Management | cert-manager with auto-renewal |
| Secret | `tls-omtd-bankdhofar-com` in `istio-ingress` namespace |
| Termination Point | Istio Gateway (`ingressgateway`) in DMZ cluster |

The Istio Gateway terminates TLS, allowing the Coraza WAF (running in-process as a Wasm plugin) to inspect the decrypted HTTP request against the full OWASP Core Rule Set.

### Segment 2 — DMZ to TND (TLS Re-Encryption)

| Property | Value |
|---|---|
| Protocol | TLS (SIMPLE mode) |
| Initiated by | Istio DestinationRule in DMZ cluster |
| SNI | Rewritten to target TND hostname (e.g., `banking.tnd.bankdhofar.com`) |
| Host Header | Rewritten via HTTPRoute RequestHeaderModifier |
| Target | TND `ingress-nginx-controller` at `10.0.130.195:443` |
| Network | OCI internal — not routable from the internet |

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

Traffic is re-encrypted before leaving the DMZ cluster. The DestinationRule establishes a new TLS connection to the TND ingress controller with the correct SNI, ensuring the TND ingress can route the request to the correct backend service.

### Segment 3 — TND Internal (Ingress to Pod)

Within the TND cluster, the ingress controller terminates TLS and forwards plaintext HTTP to the application pods over the internal cluster network. This is standard Kubernetes ingress behavior.

## mTLS — Mutual TLS for TPP Authentication

### Current State (Sandbox)

In the current sandbox deployment, TPP authentication uses **OAuth2 client credentials** (client_id + client_secret) via Keycloak. The Keycloak realm (`open-banking`) is configured with:

| Setting | Value | Purpose |
|---|---|---|
| `defaultSignatureAlgorithm` | PS256 | FAPI-compliant JWT signing |
| `pkce.code.challenge.method` | S256 | Proof Key for Code Exchange |
| `accessTokenLifespan` | 3600s | 1-hour token validity |

### mTLS Readiness (Production Path)

The platform is architecturally ready for mTLS enforcement at two levels:

```mermaid
flowchart TB
    subgraph Level1["Level 1 — Transport mTLS\n(TPP Client Certificate at DMZ)"]
        TPP["TPP presents\nclient certificate"]
        GW["Istio Gateway\nTLS mode: MUTUAL\nValidates TPP cert\nagainst trusted CA"]
        TPP -->|"mTLS handshake"| GW
    end

    subgraph Level2["Level 2 — Token Binding\n(Certificate-Bound Access Tokens)"]
        KC["Keycloak\ntls.client.certificate.\nbound.access.tokens=true"]
        API["ob-api-server\nValidates token thumbprint\nmatches presented cert"]
        KC --> API
    end

    Level1 --> Level2

    style Level1 fill:#2980b9,color:#fff
    style Level2 fill:#8e44ad,color:#fff
```

#### Level 1 — Transport mTLS (Client Certificate Verification)

The Istio Gateway in the DMZ cluster supports `tls.mode: MUTUAL`, which requires TPPs to present a valid client certificate during the TLS handshake. This is configured by changing the Gateway resource:

```yaml
# Gateway — mTLS mode (production)
spec:
  listeners:
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate          # current: server-only TLS
        # mode: Mutual           # production: requires client cert
        certificateRefs:
          - name: tls-omtd-bankdhofar-com
        # clientValidation:      # production: trusted CA for TPP certs
        #   caCertificateRefs:
        #     - name: tpp-trusted-ca
```

#### Level 2 — Certificate-Bound Access Tokens (FAPI)

When mTLS is enabled, access tokens are bound to the TPP's client certificate thumbprint. The OBIE/FAPI specification requires that:

1. The TPP authenticates to Keycloak using mTLS (certificate + client_id)
2. Keycloak binds the access token to the certificate thumbprint (`x5t#S256`)
3. On every API call, `ob-api-server` verifies the presented certificate matches the token's thumbprint

This prevents token theft — a stolen token is useless without the corresponding private key.

#### TPP Certificate Management

The `ob-tpp-manager` service already implements certificate handling:

| Endpoint | Purpose |
|---|---|
| `POST /portal-api/tpp/{id}/certificate` | Upload PEM-encoded X.509 client certificate |
| `GET /portal-api/tpp/{id}/certificate` | Retrieve certificate metadata |

The certificate manager (`internal/certs/manager.go`) performs:
- PEM block parsing and validation
- X.509 structure verification
- Expiry checking (notBefore / notAfter)
- SHA-256 thumbprint extraction (used for token binding)

## Certificate Lifecycle

```mermaid
flowchart LR
    subgraph TPP["TPP Side"]
        Gen["Generate keypair\n+ CSR"]
        Sign["Get cert signed\nby trusted CA"]
        Upload["Upload cert to\nQantara Portal"]
    end

    subgraph Platform["Qantara Platform"]
        Parse["ob-tpp-manager\nParse + Validate\nX.509 cert"]
        Store["Store metadata\n+ thumbprint\nin PostgreSQL"]
        Bind["Keycloak binds\ntoken to cert\nthumbprint"]
    end

    subgraph Runtime["API Runtime"]
        MTLS["DMZ Gateway\nverifies client cert\nin TLS handshake"]
        Check["ob-api-server\nverifies token x5t#S256\nmatches cert thumbprint"]
    end

    Gen --> Sign --> Upload --> Parse --> Store --> Bind
    Bind --> MTLS --> Check

    style TPP fill:#2980b9,color:#fff
    style Platform fill:#8e44ad,color:#fff
    style Runtime fill:#27ae60,color:#fff
```

## Summary of Transport Security Controls

| Layer | Current (Sandbox) | Production (Planned) |
|---|---|---|
| Internet → DMZ | TLS 1.3, server cert only | TLS 1.3 + mTLS (client cert required) |
| DMZ → TND | TLS re-encryption (SIMPLE) | TLS re-encryption (SIMPLE) |
| TND internal | Plaintext (cluster network) | Plaintext (cluster network) |
| Token auth | OAuth2 client_credentials (secret) | OAuth2 + certificate-bound tokens |
| JWT signing | PS256 | PS256 |
| PKCE | S256 | S256 |
| Token lifetime | 3600s | Configurable per TPP |
| Certificate upload | Supported (ob-tpp-manager) | Required for all TPPs |
