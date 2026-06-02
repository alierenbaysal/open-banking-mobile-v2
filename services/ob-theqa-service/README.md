# ob-theqa-service

SAML 2.0 Service Provider for **MTCIT THEQA SAS** (Strong Authentication Service)
— national digital identity verification (eKYC) for the Qantara Open Banking
platform.

## Role

When a BD app (BD Online / a TPP onboarding flow) needs to verify a customer's
national identity, it starts a THEQA verification. The customer approves in the
THEQA app, THEQA SAS returns a signed SAML assertion with the national identity,
and we bind that identity to the customer.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/health` | Liveness/readiness |
| `GET`  | `/theqa/saml/metadata` | SP metadata XML (share with MTCIT) |
| `POST` | `/theqa/verifications` | Start a verification → returns IdP redirect URL |
| `GET`  | `/theqa/saml/login?reference=<uuid>` | Browser-driven 302 to the IdP |
| `POST` | `/theqa/saml/acs` | Assertion Consumer Service (THEQA → us) |
| `GET/POST` | `/theqa/saml/sls` | Single Logout Service |
| `GET`  | `/theqa/verifications/{reference}` | Poll verification result |

External path routing (via Istio): `qantara.tnd.bankdhofar.com/theqa/...`
Public SP base (DMZ, for MTCIT callbacks): `https://theqa.omtd.bankdhofar.com`

## Flow

```
BD app ──POST /theqa/verifications──▶ ob-theqa-service
   ◀── {reference, redirect_url} ───┘
   │ open redirect_url (signed AuthnRequest, RelayState=reference)
   ▼
THEQA SAS IdP  (stg-idp-pki.mtcit.gov.om)  ── customer approves in THEQA app
   │ SAML Response (POST)
   ▼
ob-theqa-service /theqa/saml/acs ── validate, store national id, 302 ─▶
   bdonline://verify/callback?ref=<reference>&status=verified
   │
BD app ──GET /theqa/verifications/{reference}──▶ result
```

## Configuration (env)

IdP values are pre-filled from MTCIT's staging profile. Secrets come from the
`qantara-theqa-saml` K8s secret.

| Env | Default / source |
|-----|------------------|
| `SAML_SP_ENTITY_ID` | `36f54cb6-f700-46b0-81d3-5caa4ad322f0` (MTCIT profile id) |
| `SAML_SP_BASE_URL` | `https://theqa.omtd.bankdhofar.com` |
| `SAML_SP_X509CERT` | secret — leaf cert MTCIT issued against our CSR |
| `SAML_SP_PRIVATE_KEY` | secret — our RSA 3072 private key |
| `SAML_IDP_ENTITY_ID` | `https://SASIdp` |
| `SAML_IDP_SSO_URL` | `https://stg-idp-pki.mtcit.gov.om/Idp/SingleSignOnService` |
| `SAML_IDP_SLO_URL` | `https://stg-idp-pki.mtcit.gov.om/Idp/SingleLogoutService` |
| `SAML_IDP_X509CERT` | **pending from MTCIT** (IdP signing cert) |
| `APP_RETURN_DEEPLINK` | `bdonline://verify/callback` |
| `DATABASE_URL` | secret `qantara-db-credentials` |

## Open items

- **IdP signing certificate** (`SAML_IDP_X509CERT`) — required before assertions
  validate. To be provided by MTCIT or fetched from IdP metadata once the
  IPsec tunnel return path is up.
- **National-id attribute name** — `_NATIONAL_ID_KEYS` in `app/api/saml.py`
  probes common names; confirm against the first live assertion.
- **Crypto Token Agent (CTA)** — THEQA SAS is "secured by CTA". This service
  implements the standards-based SAML SP; any CTA-specific wrapper is layered
  on once we review MTCIT's SDK.
- **Network** — outbound to `10.31.10.22/33` currently has no return path
  (`decaps: 0` on the tunnel); tracked with the network team.
