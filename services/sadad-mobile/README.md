# Sadad Mobile

Expo (React Native) companion to the Sadad merchant payment gateway
(`https://sadad.tnd.bankdhofar.com`). One app ships **two distinct surfaces**:

1. **Customer checkout** — opened via deep-link `sadad://pay?session_id=...` from
   a merchant app (e.g. Salalah Souq). Multi-bank picker, payment summary,
   redirects to BD Online via `bdonline://consent/approve?...` for OAuth,
   returns with success or failure.
2. **Merchant dashboard** — login-gated B2B app for the merchant to monitor
   live transactions, success rate, throughput, and settlements.

## Two themes, one app

| Surface | Theme | Palette |
|---------|-------|---------|
| Customer checkout | Light | Clean white + Sadad brand orange (`#F57C00`) |
| Merchant dashboard | Dark | Near-black with neon cyan / lime / magenta accents |

Theme tokens live in `theme/index.ts` (`CUSTOMER_THEME` and `MERCHANT_THEME`).

## Deep linking

`app.json` registers the `sadad://` scheme and the `sadad.tnd.bankdhofar.com`
associated domain (iOS universal links + Android app links).

Entry route: `sadad://pay/<session_id>`

After BD Online approval:
```
bdonline://consent/approve?session_id=...&consent_id=...&state=...&redirect_uri=sadad://pay/callback
```
BD Online then calls back `sadad://pay/callback?status=...` which the router
resolves to the `success` or `failure` screen.

## Demo merchants

| Merchant | Username | Password |
|----------|----------|----------|
| Salalah Electronics | `salalah` | `salalah` |
| Salalah Souq | `souq` | `souq` |
| Muscat Fuel Co. | `muscat` | `muscat` |

## Project structure

```
app/
  _layout.tsx                 Root gate — auth redirect between (public) and (merchant)
  index.tsx                   Redirects to /welcome or /dashboard
  (public)/
    _layout.tsx               Light-theme stack
    welcome.tsx               Marketing landing
    login.tsx                 Merchant login
    pay/
      [session_id].tsx        Customer checkout (deep-link entry)
      success.tsx             Confetti + receipt
      failure.tsx             Retry UX with reason copy
  (merchant)/
    _layout.tsx               Dark-theme bottom tabs
    dashboard.tsx             KPI strip + gauge + area chart + live ticker
    transactions.tsx          Searchable list with status filters
    settlements.tsx           Timeline of settlement batches
    settings.tsx              Webhooks, API keys (masked), profile, logout
components/
  Badge.tsx                   Status pill (light/dark)
  BankOption.tsx              Selectable bank row for checkout
  Confetti.tsx                Animated particles on success
  KpiCard.tsx                 Dark KPI tile with sparkline
  MerchantHeader.tsx          Checkout summary card
  SettlementTimeline.tsx      Vertical settlement timeline
  TxTicker.tsx                Live polling transaction feed
  charts/
    SuccessGauge.tsx          Radial success-rate gauge (react-native-svg)
    ThroughputArea.tsx        Hourly area chart (victory-native)
utils/
  api.ts                      Sadad backend + mock fallbacks
  auth.ts                     Merchant login / AsyncStorage session
  format.ts                   OMR / percent / relative-time helpers
theme/
  index.ts                    CUSTOMER_THEME + MERCHANT_THEME tokens
```

## Live data

- **Ticker** polls `GET /api/merchants/<id>/ticker` every 4 s.
- **KPIs**, **throughput**, **transactions**, and **settlements** load once
  (pull-to-refresh on dashboard).
- When the backend is unreachable, each helper returns rich mock data so the
  UI remains demoable offline.

Replace the polling in `dashboard.tsx` with a websocket when the backend ships
`GET /ws/merchants/<id>`.

## Tech

- Expo ~51.0 + expo-router ~3.5 (typed routes)
- react-native-svg 15.2 (KPI sparklines + gauge)
- victory-native ^36.9 (throughput area chart)
- AsyncStorage for session persistence

## Develop

```bash
npx expo start        # start dev server
npx expo start --ios
npx expo start --android
npm run typecheck     # tsc --noEmit
```

## English only

All copy is English. No Arabic text anywhere in this app.
