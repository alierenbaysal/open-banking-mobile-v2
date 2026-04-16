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

// Deep-link targets, tried in order:
//   1. `bdonline://consent/approve` — only works in a standalone install.
//   2. `exp://expo-bdonline.omtd.bankdhofar.com/--/consent/approve` — the
//      Expo Go form: re-enters Expo Go with the target app's Metro URL so
//      the BD Online dev bundle loads and routes to /consent/approve.
//   3. Web fallback (banking-api.omtd...) — only if both deep-links fail.
const BD_ONLINE_DEEPLINK_NATIVE = "bdonline://consent/approve";
const BD_ONLINE_DEEPLINK_EXPO_GO = "exp://expo-bdonline.omtd.bankdhofar.com/--/consent/approve";

// Same dual-form for the callback URL that BD Online uses to return here.
const MASROOFI_CALLBACK_NATIVE = "masroofi://callback";
const MASROOFI_CALLBACK_EXPO_GO = "exp://expo-masroofi.omtd.bankdhofar.com/--/callback";

export const MASROOFI_CALLBACK_URL = MASROOFI_CALLBACK_NATIVE;

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

export interface BuiltConsentLinksV2 extends BuiltConsentLinks {
  deepLinkExpoGo: string;
}

export async function buildConsentRedirectUrls(
  consentId: string,
): Promise<BuiltConsentLinksV2> {
  const state = randomState();
  await AsyncStorage.setItem(STATE_KEY, state);

  // Two flavours of redirect_uri — try native scheme first, Expo Go second.
  // BD Online's /consent/approve passes the redirect_uri through verbatim,
  // so whichever one comes back matches our own open-URL listener.
  const redirectExpoGo = MASROOFI_CALLBACK_EXPO_GO;

  const commonParams = {
    consent_id: consentId,
    state,
    client_id: CLIENT_ID,
  };
  const nativeQuery = buildQuery({ ...commonParams, redirect_uri: MASROOFI_CALLBACK_NATIVE });
  const expoGoQuery = buildQuery({ ...commonParams, redirect_uri: redirectExpoGo });

  return {
    deepLink: `${BD_ONLINE_DEEPLINK_NATIVE}?${nativeQuery}`,
    deepLinkExpoGo: `${BD_ONLINE_DEEPLINK_EXPO_GO}?${expoGoQuery}`,
    webFallback: `${BD_ONLINE_WEB}/consent/approve?${nativeQuery}`,
    state,
  };
}

/**
 * Attempt, in priority order:
 *   1. Native scheme `bdonline://` — standalone-only but tried first.
 *   2. Expo Go manifest URL `exp://expo-bdonline.omtd...` — works inside
 *      Expo Go by navigating the already-running Expo Go binary to the
 *      BD Online dev bundle.
 *   3. Web fallback — Safari opens banking-api.omtd.bankdhofar.com.
 *
 * Returns the URL we actually launched so callers can log it.
 */
export async function openBankConsent(consentId: string): Promise<string> {
  const { deepLink, deepLinkExpoGo, webFallback } = await buildConsentRedirectUrls(consentId);

  // 1. Native scheme
  try {
    const canOpen = await Linking.canOpenURL(deepLink);
    if (canOpen) {
      await Linking.openURL(deepLink);
      return deepLink;
    }
  } catch {
    // fall through
  }

  // 2. Expo Go cross-app deep link — Expo Go registers `exp://` on iOS so
  //    canOpenURL always returns true; rely on openURL directly and let
  //    its promise reject on failure.
  try {
    await Linking.openURL(deepLinkExpoGo);
    return deepLinkExpoGo;
  } catch {
    // fall through to web
  }

  // 3. Web
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
  // 15 s hard timeout — if the backend is slow the callback screen must
  // surface an error rather than hang on its processing spinner forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/auth-codes/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(
      err instanceof Error && err.name === "AbortError"
        ? "Timed out waiting for Bank Dhofar to exchange the authorisation code."
        : `Network error exchanging code: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  clearTimeout(timer);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as ExchangeResult;
  await storeBankCredentials(data.access_token, data.consent_id);
  return data;
}
