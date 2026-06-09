# THEQA Integration — Traffic Flow

**Date:** 2026-06-09 · **Issue:** #15 (builds on #4) · **App:** Bank Dhofar Online (`bd-online-mobile`)
**Authoritative source:** full email chain `RE_ Introductory Discussion - THEQA.msg`, latest =
**Manal Al-Ajmi (MTCIT), 2026-06-03**.

> **Network facts confirmed by MTCIT (2026-06-03):** the IPsec S2S tunnel
> (BD `212.72.7.195` ↔ MTCIT `188.65.26.226`) is **operational, one-way** (BD initiates).
> **All three Theqa destinations are now reachable.** BD's source is NAT'd to `172.16.24.1`.
>
> **BD only ever touches `172.16.24.x` (the NAT).** `10.31.10.x` live on MTCIT's side, beyond the
> tunnel — they are **not routed for BD** and cannot be dialed/tested from BD directly.

| MTCIT service (far side, beyond tunnel) | IP | BD touch point (NAT) |
|---|---|---|
| **SAS** — Strong Authentication Service (the SAML **IdP**) | `10.31.10.22:443` | outbound, src NAT **`172.16.24.1`** |
| **DSS** — Digital Signature Service | `10.31.10.31:443` | outbound, src NAT **`172.16.24.1`** |
| **Self-Service** | `10.31.10.33:443` | outbound, src NAT **`172.16.24.1`** |
| **ACS** — SAML Response POST back to BD | (MTCIT `10.31.10.0/24`) | inbound, dst NAT **`172.16.24.2:443`** |

Three channels: **Public** (mobile ↔ BD), **Tunnel/NAT s2s** (BD NAT ↔ MTCIT), **Out-of-band**
(THEQA app ↔ MTCIT). The mobile never touches MTCIT or `10.31.10.x`.

---

## 1. Intended end-to-end flow

```mermaid
sequenceDiagram
    autonumber
    participant App as 📱 BD Online app
    participant THQ as 📲 THEQA app<br>same device
    participant ING as 🌐 BD ingress<br>158.179.3.104 public
    participant SP as 🔐 ob-theqa-service SP<br>RTZ ob-tnd
    participant NAT as 🔁 BD NAT + IPsec edge<br>212.72.7.195, NAT 172.16.24.x
    participant IDP as 🇴🇲 MTCIT SAS IdP<br>10.31.10.22 far side

    rect rgb(223,238,255)
    Note over App,ING: CHANNEL 1 — PUBLIC, mobile talks ONLY to BD
    App->>ING: POST /auth/verifications + identifier ✅
    ING->>SP: cross-cluster to RTZ ✅
    Note over SP: build and sign AuthnRequest, IdP cert loaded ✅
    end

    rect rgb(223,247,223)
    Note over SP,IDP: CHANNEL 2 — BD initiates over the ONE-WAY tunnel
    SP->>NAT: AuthnRequest to SAS
    NAT->>IDP: src SNAT to 172.16.24.1, dst 10.31.10.22 port 443 ✅ reachable
    end

    rect rgb(255,247,219)
    Note over THQ,IDP: CHANNEL 3 — OUT-OF-BAND, MTCIT own channel
    IDP-->>THQ: challenge to THEQA app
    THQ->>IDP: user approves national ID
    end

    rect rgb(223,247,223)
    Note over IDP,SP: SAML Response back to ACS — dst NAT 172.16.24.2 (see open item on one-way)
    IDP->>NAT: SAML Response, dst 172.16.24.2 port 443 NATed
    NAT->>SP: DNAT to BD ingress then /auth/saml/acs, store national_id
    end

    rect rgb(223,238,255)
    Note over App,SP: CHANNEL 1 — mobile polls BD then logs in
    App->>SP: poll /auth/verifications/ref until verified ✅
    App->>SP: then POST /api/bank-auth/theqa to ob-consent-service ✅
    end
```

---

## 2. Network topology — who touches what

```mermaid
flowchart LR
    subgraph BD["BankDhofar side — touches only 172.16.24.x"]
        APP["📱 BD Online app"]
        ING["🌐 DMZ ingress 158.179.3.104"]
        SP["🔐 ob-theqa-service SP RTZ"]
        NAT["🔁 NAT + IPsec edge 212.72.7.195<br>out src to 172.16.24.1<br>in dst 172.16.24.2"]
    end
    subgraph TUN["IPsec tunnel — one-way, operational"]
        T["BD 212.72.7.195 to MTCIT 188.65.26.226"]
    end
    subgraph MTCIT["MTCIT side — 10.31.10.x, beyond tunnel, NOT routed for BD"]
        SAS["SAS IdP 10.31.10.22"]
        DSS["DSS 10.31.10.31"]
        SS["Self-Service 10.31.10.33"]
    end
    APP --> ING --> SP --> NAT
    NAT --> T
    T --> SAS
    T --> DSS
    T --> SS
```

---

## 3. Status by leg

| # | Channel | Leg | Address | Status |
|---|---------|-----|---------|--------|
| 1 | Public | App → DMZ ingress → SP `/auth/verifications` | `158.179.3.104` | ✅ working |
| 1 | Public | SP builds + signs AuthnRequest | SP key + IdP cert loaded | ✅ working |
| 2 | Tunnel | BD → SAS IdP (outbound, NAT) | src `172.16.24.1` → SAS `10.31.10.22:443` | ✅ MTCIT: reachable |
| 3 | Out-of-band | THEQA app ↔ MTCIT, user approves | device ↔ MTCIT | — MTCIT side |
| 4 | Tunnel | MTCIT → BD ACS (inbound, NAT) | dst `172.16.24.2:443` → ACS | ⚠️ see open item (one-way) |
| 5 | Public | App polls result, then `/bank-auth/theqa` | RTZ SP + `ob-consent-service` | ✅ ready / verified |

**I am not claiming any connection failure.** MTCIT confirmed all 3 destinations reachable
(2026-06-03). Earlier "timeouts" I reported were invalid tests — I dialed `10.31.10.x` from an
OKE pod that is **not** NAT'd to `172.16.24.1`, so it could never reach MTCIT. Only properly-NAT'd
traffic does.

---

## 4. Open items (application / config — not network)

1. **One-way tunnel vs inbound ACS.** The tunnel is **BD-initiated one-way**. The outbound
   AuthnRequest to SAS (`10.31.10.22`) works. The **SAML Response to ACS** is drawn as an inbound
   POST to `172.16.24.2` — confirm with MTCIT whether the assertion returns **synchronously on the
   BD-initiated connection** (works over one-way) or needs the **reverse direction** enabled
   (MTCIT asked BD for "the correct source IP/subnet" for `10.31.10.0/24 → 172.16.24.2`).
2. **ACS hostname.** SP advertises `qantara-api.omtd.bankdhofar.com/auth/saml/acs` (config +
   registration email); the matrix names `theqa.omtd.bankdhofar.com`. Confirm which MTCIT uses, and
   that `172.16.24.2` DNATs to the BD ingress serving it.
3. **SP egress must source via the NAT.** The SP's MTCIT-bound traffic has to leave BD through the
   path that SNATs to `172.16.24.1` — verify the SP/egress routing actually takes that path.
4. **CTA.** MTCIT SAML is "secured by Crypto Token Agent (CTA)" — confirm whether the SP must
   integrate the CTA in addition to standard SAML 2.0.
5. **Other Theqa services available on the tunnel:** **DSS** (`10.31.10.31`, digital signing) and
   **Self-Service** (`10.31.10.33`) — both reachable; candidates for later phases.
