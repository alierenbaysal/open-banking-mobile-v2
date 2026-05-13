# Fintech Developer Journey

This document describes the end-to-end journey for a fintech developer (TPP) integrating with Bank Dhofar's Open Banking APIs through the Qantara platform.

## Journey Overview

```mermaid
flowchart LR
    subgraph Phase1["1. Discover"]
        Portal["Visit Qantara\nDeveloper Portal"]
        Catalog["Browse\nAPI Catalog"]
        Docs["Read\nDocumentation"]
    end

    subgraph Phase2["2. Register"]
        Account["Create Developer\nAccount"]
        App["Register TPP\nApplication"]
        Roles["Select Roles\nAISP / PISP / CBPII"]
    end

    subgraph Phase3["3. Integrate"]
        Creds["Receive\nCredentials"]
        Cert["Upload mTLS\nCertificate"]
        Token["Obtain\nAccess Token"]
    end

    subgraph Phase4["4. Build"]
        Consent["Create\nConsent"]
        Auth["Customer\nAuthorises"]
        API["Call OBIE\nEndpoints"]
    end

    subgraph Phase5["5. Go Live"]
        Test["Sandbox\nTesting"]
        Review["Security\nReview"]
        Prod["Production\nAccess"]
    end

    Phase1 --> Phase2 --> Phase3 --> Phase4 --> Phase5

    style Phase1 fill:#2980b9,color:#fff
    style Phase2 fill:#8e44ad,color:#fff
    style Phase3 fill:#d35400,color:#fff
    style Phase4 fill:#27ae60,color:#fff
    style Phase5 fill:#c0392b,color:#fff
```

## Step 1 — Discover

The developer starts at the **Qantara Developer Portal**:

| Resource | URL | What It Provides |
|---|---|---|
| Developer Portal | `https://qantara.tnd.bankdhofar.com/` | Landing page, overview, navigation |
| API Catalog | `https://qantara.tnd.bankdhofar.com/apis` | All 64 OBIE endpoints, OpenAPI specs, try-it console |
| Getting Started | `https://qantara.tnd.bankdhofar.com/getting-started` | Step-by-step integration guide with code samples |
| Sandbox Console | `https://qantara.tnd.bankdhofar.com/sandbox` | Interactive API testing without writing code |
| API Docs (Swagger) | `https://qantara.tnd.bankdhofar.com/docs` | Auto-generated OpenAPI documentation |
| API Docs (ReDoc) | `https://qantara.tnd.bankdhofar.com/redoc` | Alternative API documentation format |

## Step 2 — Register as a TPP

```mermaid
sequenceDiagram
    participant Dev as Fintech Developer
    participant Portal as Qantara Portal
    participant TPPMgr as ob-tpp-manager
    participant KC as Keycloak
    participant Consent as ob-consent-service
    participant DB as PostgreSQL

    Dev->>Portal: Sign up / Sign in
    Dev->>Portal: Register New Application
    Portal->>TPPMgr: POST /portal-api/tpp/register
    Note over TPPMgr: Validate application details<br/>and TPP roles

    TPPMgr->>KC: Create OAuth2 Client<br/>(client_id, redirect URIs, roles)
    KC-->>TPPMgr: Client created

    TPPMgr->>Consent: Register TPP in consent service
    Consent->>DB: Store TPP record
    Consent-->>TPPMgr: TPP registered

    TPPMgr-->>Portal: client_id + client_secret
    Portal-->>Dev: Credentials displayed (one-time)

    Note over Dev: Developer securely stores<br/>client_id and client_secret
```

### TPP Roles

| Role | Full Name | What It Allows |
|---|---|---|
| **AISP** | Account Information Service Provider | Read account data, balances, transactions, beneficiaries, standing orders |
| **PISP** | Payment Initiation Service Provider | Initiate domestic payments, scheduled payments, international payments |
| **CBPII** | Card Based Payment Instrument Issuer | Confirm whether funds are available in a customer's account |

### TPP Management API

| Endpoint | Method | Purpose |
|---|---|---|
| `/portal-api/tpp/register` | POST | Register a new TPP application |
| `/portal-api/tpp/` | GET | List all registered TPPs |
| `/portal-api/tpp/{id}` | GET | Get TPP details |
| `/portal-api/tpp/{id}` | PUT | Update TPP details |
| `/portal-api/tpp/{id}` | DELETE | Suspend a TPP |
| `/portal-api/tpp/{id}/credentials` | POST | Regenerate client credentials |
| `/portal-api/tpp/{id}/certificate` | POST | Upload mTLS client certificate |
| `/portal-api/tpp/{id}/certificate` | GET | Get certificate metadata |
| `/portal-api/tpp/{id}/sandbox-token` | POST | Generate a sandbox access token |

## Step 3 — Authenticate and Obtain Tokens

```mermaid
sequenceDiagram
    participant TPP as TPP Application
    participant KC as Keycloak<br/>FAPI 2.0 Realm
    participant API as ob-api-server

    Note over TPP,KC: Client Credentials Grant (machine-to-machine)
    TPP->>KC: POST /token<br/>grant_type=client_credentials<br/>client_id + client_secret<br/>scope=accounts payments
    KC-->>TPP: access_token (1 hour TTL)

    Note over TPP,API: API calls with Bearer token
    TPP->>API: GET /open-banking/v4.0/aisp/accounts<br/>Authorization: Bearer {token}<br/>x-fapi-interaction-id: {uuid}<br/>x-fapi-financial-id: bankdhofar-sandbox
    API-->>TPP: OBIE-format response
```

### Authentication Endpoints

| Endpoint | Value |
|---|---|
| Token URL | `https://auth.qantara.tnd.bankdhofar.com/realms/open-banking/protocol/openid-connect/token` |
| Grant Type | `client_credentials` |
| Scopes | `accounts`, `payments`, `fundsconfirmations` |
| Token Validity | 3600 seconds (1 hour) |

### Required FAPI Headers

| Header | Purpose | Value |
|---|---|---|
| `Authorization` | Bearer token | `Bearer {access_token}` |
| `x-fapi-financial-id` | Financial institution identifier | `bankdhofar-sandbox` |
| `x-fapi-interaction-id` | Unique request correlation ID | UUID (generated per request) |
| `Content-Type` | Request format | `application/json` |

## Step 4 — Consent and API Access

The consent flow follows the OBIE standard. No data is accessible without explicit customer authorization.

```mermaid
sequenceDiagram
    participant TPP as TPP Application
    participant API as ob-api-server
    participant CS as ob-consent-service
    participant App as BD Sandbox App<br/>(Customer's Bank App)
    participant KC as Keycloak
    participant Customer as Bank Customer

    rect rgb(240, 248, 255)
        Note over TPP,CS: Phase A — Consent Creation
        TPP->>API: POST /account-access-consents<br/>(Permissions, ExpirationDateTime)
        API->>CS: Create consent record
        CS-->>API: ConsentId (status: AwaitingAuthorisation)
        API-->>TPP: ConsentId + redirect URL
    end

    rect rgb(255, 248, 240)
        Note over TPP,Customer: Phase B — Customer Authorisation
        TPP->>App: Redirect customer to authorize
        Customer->>App: Open bank app, login
        App->>KC: Authenticate customer (FAPI 2.0)
        KC-->>App: Authenticated session

        App->>CS: GET /consents/{id}
        CS-->>App: Consent details (permissions, TPP name)
        App->>Customer: Display: "App X wants to read your accounts"
        Customer->>App: Select accounts, approve consent

        App->>CS: POST /consents/{id}/authorize<br/>(selected account IDs)
        CS-->>App: Authorization code
        App-->>TPP: Redirect with authorization code
    end

    rect rgb(240, 255, 240)
        Note over TPP,API: Phase C — Token Exchange and Data Access
        TPP->>KC: Exchange code for access token (PKCE)
        KC-->>TPP: Consent-scoped access token

        TPP->>API: GET /accounts<br/>Authorization: Bearer {consent-scoped-token}
        API->>CS: Validate consent (check status, expiry, permissions, accounts)
        CS-->>API: Valid — scoped to selected accounts only
        API-->>TPP: Account data (OBIE format, filtered to consented accounts)
    end
```

### Consent Lifecycle States

```mermaid
stateDiagram-v2
    [*] --> AwaitingAuthorisation: TPP creates consent
    AwaitingAuthorisation --> Authorised: Customer approves
    AwaitingAuthorisation --> Rejected: Customer rejects
    Authorised --> Revoked: Customer revokes via bank app
    Authorised --> Expired: ExpirationDateTime reached
    Rejected --> [*]
    Revoked --> [*]
    Expired --> [*]
```

## Step 5 — Sandbox Testing

The sandbox environment provides pre-seeded test data for immediate integration testing:

### Sandbox Test Customers

| Customer | ID | Accounts | Purpose |
|---|---|---|---|
| Ahmed Al-Balushi | CUST-001 | Current + Savings | Standard account holder |
| Fatima Al-Rashdi | CUST-002 | Current + Credit Card | Multi-product holder |

### Sandbox Merchant Storefronts

Mock merchant applications that demonstrate real-world payment flows:

| Storefront | URL | Use Case |
|---|---|---|
| BD Online Banking | `https://banking.tnd.bankdhofar.com/` | Online banking payments |
| Hisab | `https://hisab.tnd.bankdhofar.com/` | Accounting platform payments |
| Masroofi | `https://masroofi.tnd.bankdhofar.com/` | Digital wallet top-up |
| Sadad | `https://sadad.tnd.bankdhofar.com/` | Bill payments |
| Salalah Electronics | `https://salalah.tnd.bankdhofar.com/` | E-commerce checkout |
| Muscat Motors | `https://muscatmotors.tnd.bankdhofar.com/` | Automotive finance |

### Mobile Testing

The **ob-sandbox-app** (Expo/React Native) simulates the customer's banking app for testing the consent authorization flow on mobile devices. Distributed via TestFlight.
