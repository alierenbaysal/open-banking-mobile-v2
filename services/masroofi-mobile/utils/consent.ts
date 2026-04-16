/**
 * Consent / OAuth flow helpers for the mobile app.
 *
 * Flow on mobile:
 *   1. POST /api/consent to create an account-access consent.
 *   2. Launch BD Online via the `bdonline://consent/approve?...` deep link
 *      (falls back to https://banking-api.omtd.bankdhofar.com/consent/approve
 *      via WebBrowser if the bank app is not installed).
 *   3. BD Online approves/rejects and redirects back to `masroofi://callback?code=...&state=...`.
 *   4. We exchange the code at /api/auth-codes/exchange for an access
 *      token and consent_id, then store them via utils/auth.ts.
 *
 * CSRF state is persisted in AsyncStorage so the callback route can
 * validate it regardless of which screen launched the flow.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

import { API_BASE, storeBankCredentials } from "./auth";

const STATE_KEY = "masroofi_oauth_state";
const CLIENT_ID = "masroofi-demo";
const CLIENT_SECRET = "masroofi-demo-secret-tnd";

const BD_ONLINE_WEB = "https://banking-api.omtd.bankdhofar.com";
const BD_ONLINE_DEEPLINK = "bdonline://consent/approve";

export const MASROOFI_CALLBACK_URL = "masroofi://callback";

export interface CreateConsentResponse {
  consent_id: string;
  status: string;
  created_at: string;
}

export async function createConsent(): Promise<CreateConsentResponse> {
  const response = await fetch(`${API_BASE}/api/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consent_type: "account-access",
      tpp_id: CLIENT_ID,
      permissions: [
        "ReadAccountsBasic",
        "ReadAccountsDetail",
        "ReadBalances",
        "ReadTransactionsBasic",
        "ReadTransactionsDetail",
      ],
      expiration_days: 90,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to create consent: ${response.status} ${text}`);
  }

  return (await response.json()) as CreateConsentResponse;
}

function randomState(): string {
  const bytes = new Uint8Array(24);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

export interface BuiltConsentLinks {
  deepLink: string;
  webFallback: string;
  state: string;
}

export async function buildConsentRedirectUrls(
  consentId: string,
): Promise<BuiltConsentLinks> {
  const state = randomState();
  await AsyncStorage.setItem(STATE_KEY, state);

  const query = buildQuery({
    consent_id: consentId,
    redirect_uri: MASROOFI_CALLBACK_URL,
    state,
    client_id: CLIENT_ID,
  });

  return {
    deepLink: `${BD_ONLINE_DEEPLINK}?${query}`,
    webFallback: `${BD_ONLINE_WEB}/consent/approve?${query}`,
    state,
  };
}

/**
 * Attempt to open the BD Online mobile app via deep link; fall back
 * to the web approval page in the system browser. Returns the URL we
 * actually launched so callers can log it.
 */
export async function openBankConsent(consentId: string): Promise<string> {
  const { deepLink, webFallback } = await buildConsentRedirectUrls(consentId);

  try {
    const canOpen = await Linking.canOpenURL(deepLink);
    if (canOpen) {
      await Linking.openURL(deepLink);
      return deepLink;
    }
  } catch {
    // fall through to web
  }

  await Linking.openURL(webFallback);
  return webFallback;
}

export async function validateState(received: string | null): Promise<boolean> {
  const stored = await AsyncStorage.getItem(STATE_KEY);
  await AsyncStorage.removeItem(STATE_KEY);
  if (!stored || !received) return false;
  return stored === received;
}

export interface ExchangeResult {
  access_token: string;
  consent_id: string;
}

export async function exchangeAuthCode(code: string): Promise<ExchangeResult> {
  const response = await fetch(`${API_BASE}/api/auth-codes/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as ExchangeResult;
  await storeBankCredentials(data.access_token, data.consent_id);
  return data;
}
