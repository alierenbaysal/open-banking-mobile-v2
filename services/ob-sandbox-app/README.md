# BD Sandbox — Open Banking Consent App

A mock mobile banking application built with Expo (React Native) that simulates Bank Dhofar's customer-facing consent authorization experience for the Qantara Open Banking platform.

## Purpose

This app acts as a simplified version of Bank Dhofar's DEH mobile banking app, used purely for sandbox and testing environments. It handles the consent authorization flow that Third Party Providers (TPPs) redirect to during the Open Banking OAuth2 flow.

## Features

- **Login**: Test customer authentication (sandbox credentials)
- **Consent Authorization**: OAuth2 redirect handler for TPP consent requests
- **Consent Management**: View, filter, and revoke active consents
- **Payment Approval**: SCA simulation for domestic payment consents
- **Bilingual**: English and Arabic text throughout

## Test Customers

| Customer | Username | Password | Accounts |
|----------|----------|----------|----------|
| Ahmed Al-Balushi (CUST-001) | `ahmed` | `ahmed` | 2 (Current + Savings) |
| Fatima Al-Rashdi (CUST-002) | `fatima` | `fatima` | 1 (Current) |

## Deep Link Flow

TPPs redirect customers to the sandbox app via deep link:

```
bdsandbox://consent/authorize?consent_id=<uuid>&redirect_uri=<tpp_callback>&state=<state>
```

The app fetches consent details from the consent service, displays the approval screen, and on approval/rejection redirects back to the TPP's `redirect_uri` with an authorization code or error.

## Project Structure

```
app/
  _layout.tsx              Root layout (Stack navigator, auth gating)
  login.tsx                Login screen with test credentials
  (tabs)/
    _layout.tsx            Tab navigator (Home, Consents, Settings)
    index.tsx              Home dashboard
    consents.tsx           Consent list with status filtering
    settings.tsx           User profile, app settings, logout
  consent/
    authorize.tsx          OAuth2 consent authorization flow
    [consentId].tsx        Consent detail with audit history
  payment/
    [consentId].tsx        Payment approval with SCA PIN entry
components/
  ConsentCard.tsx          Consent summary card
  AccountPicker.tsx        Multi-select account list
  PermissionList.tsx       OBIE permission display (EN + AR)
  PaymentSummary.tsx       Payment amount and creditor display
utils/
  api.ts                   HTTP client for consent service
  auth.ts                  Authentication state (AsyncStorage)
  permissions.ts           OBIE permission code translations
```

## API Integration

The app communicates with the consent service at `https://qantara.tnd.bankdhofar.com`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/consents/{id}` | GET | Fetch consent details |
| `/consents/{id}/authorize` | POST | Authorize a consent |
| `/consents/{id}/reject` | POST | Reject a consent |
| `/consents/{id}` | DELETE | Revoke an authorized consent |
| `/consents/{id}/history` | GET | Consent audit trail |
| `/tpp/{id}` | GET | TPP information |

## Development

```bash
# Start Expo development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android
```

## Tech Stack

- **Expo** ~51.0.0 with Expo Router ~3.5.0
- **React Native** 0.74.0
- **TypeScript** ~5.3.0
- **@expo/vector-icons** (Ionicons)
