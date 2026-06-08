# THEQA Integration — Traffic Flow (Intended vs Working)

**Date:** 2026-06-08 · **Issue:** #15 (builds on #4) · **App:** Bank Dhofar Online (`bd-online-mobile`)

THEQA = MTCIT national digital identity (SAS platform, SAML 2.0). Bank Dhofar is the SAML SP
(`ob-theqa-service`). This document shows the intended end-to-end flow with IPs, and marks
each leg ✅ working / ❌ broken / ❓ untested.

Legend: ✅ working &nbsp; ❌ broken &nbsp; ❓ untested (blocked upstream)

---

## 1. Intended end-to-end flow (SP-initiated SAML)

```mermaid
sequenceDiagram
    autonumber
    participant App as 📱 BD Online app
    participant ING as 🌐 DMZ ingress<br>158.179.3.104
    participant SP as 🔐 ob-theqa-service SP<br>RTZ ob-tnd
    participant EG as 🚪 theqa-egress-proxy<br>DMZ 10.150.69.x
    participant TUN as 🛡️ IPsec / OCI DRG<br>NAT 172.16.24.x
    participant IDP as 🇴🇲 MTCIT THEQA SAS<br>10.31.10.22 and .33
    participant CONS as 🏦 ob-consent-service<br>RTZ ob-tnd

    App->>ING: POST /auth/verifications ✅
    ING->>SP: cross-cluster to RTZ 10.150.18.18 ✅
    Note over SP: build and sign AuthnRequest<br>IdP cert now loaded ✅
    SP-->>App: reference and redirect_url ✅

    App->>EG: open redirect_url to IdP SSO
    rect rgb(255,224,224)
    EG->>TUN: proxy_pass to 10.31.10.22 port 443 ❌ NO ROUTE
    Note over EG,TUN: must target 172.16.24.x<br>NOT 10.31.10.22
    end
    TUN->>IDP: 172.16.0.0/12 to DRG then DNAT ❓

    Note over App,IDP: user approves in THEQA app<br>MTCIT national ID

    IDP->>TUN: SAML Response to ACS ❓
    TUN->>ING: inbound NAT 172.16.24.2 to DMZ LB 10.150.70.90 ❓
    ING->>SP: /auth/saml/acs validate assertion ❓
    Note over SP: store national_id vs reference

    App->>SP: poll /auth/verifications/ref ✅
    App->>CONS: POST /api/bank-auth/theqa reference ✅
    Note over CONS: read verified row, create-or-find<br>customer by national_id
    CONS-->>App: BankUser onboard or login ✅
```

---

## 2. Status by leg

| # | Leg | IPs / ports | Status |
|---|-----|-------------|--------|
| 1 | App → DMZ ingress → SP `/auth/verifications` | `158.179.3.104` → RTZ `10.150.18.18` | ✅ working |
| 1 | SP builds + signs AuthnRequest | SP key + **IdP cert now loaded** | ✅ working |
| 2 | SP/egress → MTCIT IdP **(outbound)** | proxy `:8443` → **`10.31.10.22:443`** | ❌ **BROKEN** |
| 3 | User auth in THEQA app | MTCIT side | — n/a to BD |
| 4 | MTCIT → ACS **(inbound)** | `172.16.24.2` → `10.150.70.90` → `/auth/saml/acs` | ❓ untested |
| 5 | App polls verification result | RTZ SP | ✅ ready |
| 6 | App → consent-svc `/bank-auth/theqa` → create-or-find customer | RTZ `ob-consent-service` | ✅ verified live |

---

## 3. Where it breaks — the egress destination

```mermaid
flowchart LR
    EG["theqa-egress-proxy nginx<br>listen 8443 -> theqa_idp<br>listen 8444 -> theqa_sas"]
    BAD["server 10.31.10.22:443<br>server 10.31.10.33:443<br>❌ MTCIT internal IPs, no route"]
    GOOD["should be 172.16.24.x:443<br>✅ routes over the tunnel"]
    RT["OCI route-table nat-route<br>172.16.0.0/12 -> DRG ✅<br>10.31.10.0/24 -> none ❌"]
    TUN["IPsec tunnel<br>SNAT 10.150.69.0/24 -> 172.16.24.1<br>DNAT -> MTCIT 10.31.10.x"]

    EG --> BAD
    EG -. fix .-> GOOD
    GOOD --> RT
    RT --> TUN
    TUN --> MTCIT["🇴🇲 MTCIT THEQA SAS IdP"]
```

---

## 4. IP / endpoint reference

| Component | Address | Role |
|---|---|---|
| BD Online app | client device | SP-initiated SAML start |
| DMZ public ingress (`ob-ingressgateway`) | `158.179.3.104` | host `qantara-api.omtd.bankdhofar.com` |
| RTZ ingress (cross-cluster) | `10.150.18.18` | DMZ → RTZ bridge |
| `ob-theqa-service` (SAML SP) | RTZ `oci-mct-tnd-rtz` / `ob-tnd` | AuthnRequest + ACS `/auth/saml/{acs,sls}` |
| `ob-consent-service` | RTZ `oci-mct-tnd-rtz` / `ob-tnd` | `/bank-auth/theqa` create-or-find customer |
| `theqa-egress-proxy` (nginx) | DMZ `oci-mct-tnd-dmz` / `theqa-egress`, nodes `10.150.69.x` | outbound to MTCIT, `:8443`→IdP, `:8444`→SAS |
| BD **source** NAT | `172.16.24.1` | how BD appears to MTCIT |
| BD **inbound** NAT | `172.16.24.2` | MTCIT → BD DMZ ingress LB |
| DMZ ingress LB (ACS inbound) | `10.150.70.90` | SAML Response POST target |
| OCI route (tunnel) | `172.16.0.0/12 → DRG` | the only path to MTCIT |
| MTCIT THEQA IdP (SSO) | `10.31.10.22:443` | `SingleSignOnService` |
| MTCIT THEQA SAS | `10.31.10.33:443` | metadata / additional SAS |
| MTCIT **destination** NAT | `172.16.24.X` ← **UNKNOWN** | what BD must dial for the two above |

---

## 5. The two unknowns blocking leg #2

1. **Exact `172.16.24.X`** the proxy must target for the IdP (`10.31.10.22`) and SAS (`10.31.10.33`).
   Probed `.1–.4 / .10–.12 / .22 / .33` from the DMZ — none answered.
2. Whether the **tunnel passes application traffic** yet (the 6-day-old "no return packets").

**Next action:** once the two `172.16.24.X` destination IPs are confirmed, repoint
`theqa-proxy-conf` upstreams, restart `theqa-egress-proxy`, and re-probe. If they answer →
leg #2 lights up; if not → tunnel issue (Network: Sudheer / MTCIT: Manal).
