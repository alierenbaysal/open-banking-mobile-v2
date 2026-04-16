/**
 * Masroofi user authentication — mobile edition.
 *
 * Mirrors services/masroofi (web) auth.ts but stores the session and
 * bank credentials via AsyncStorage + SecureStore instead of
 * session/localStorage.
 *
 * User accounts live in the backend (Postgres); we only persist the
 * active session and a cached copy of the bank consent on the device.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export interface MasroofiUser {
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResult {
  ok: true;
  user: MasroofiUser;
}
export interface AuthError {
  ok: false;
  error: string;
}

const SESSION_KEY = "masroofi_session";
const BANK_TOKEN_KEY = "masroofi_bank_token";
const CONSENT_ID_KEY = "masroofi_consent_id";

// Demo-mode auto-wiring: skip the OAuth consent redirect entirely.
// Expo Go can't persist AsyncStorage across deep-link app switches, so the
// BD Online ↔ Masroofi round-trip loses the session every time. For the
// demo we pre-seed consents in Postgres and auto-wire them on signup/login.
const DEMO_CONSENT_AHMED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
const DEMO_CONSENT_FATIMA = "aaaaaaaa-bbbb-cccc-dddd-000000000002";
const DEMO_CONSENT_DEFAULT = DEMO_CONSENT_AHMED;

// ---------------------------------------------------------------------------
// API base URL — matches the web app's proxy at masroofi.tnd.bankdhofar.com.
// We call the same paths but directly against the public origin so the
// mobile app does not depend on the nginx rewrites inside the web service.
// ---------------------------------------------------------------------------

export const API_BASE = "https://masroofi-api.omtd.bankdhofar.com";

// ---------------------------------------------------------------------------
// Session persistence (plain AsyncStorage — email/name are not secrets)
// ---------------------------------------------------------------------------

async function setSession(user: MasroofiUser): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getCurrentUser(): Promise<MasroofiUser | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as MasroofiUser) : null;
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

// ---------------------------------------------------------------------------
// Bank credentials (consent_id + token) — SecureStore on iOS/Android,
// AsyncStorage fallback on web where SecureStore is a no-op.
// ---------------------------------------------------------------------------

async function secureSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(key);
    if (v) return v;
  } catch {
    // fall through
  }
  return AsyncStorage.getItem(key);
}

async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(key);
}

export async function getStoredBankToken(): Promise<string | null> {
  return secureGet(BANK_TOKEN_KEY);
}

export async function getStoredConsentId(): Promise<string | null> {
  return secureGet(CONSENT_ID_KEY);
}

export async function storeBankCredentials(token: string, consentId: string): Promise<void> {
  await secureSet(BANK_TOKEN_KEY, token);
  await secureSet(CONSENT_ID_KEY, consentId);

  // Best-effort: persist to the Masroofi backend so the bank link
  // survives a device reinstall / cache wipe.
  const user = await getCurrentUser();
  if (user) {
    try {
      await fetch(`${API_BASE}/api/auth/update-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          consent_id: consentId,
          bank_token: token,
        }),
      });
    } catch {
      // Swallow network errors — local storage is still authoritative.
    }
  }
}

export async function clearBankCredentials(): Promise<void> {
  await secureDelete(BANK_TOKEN_KEY);
  await secureDelete(CONSENT_ID_KEY);
  const user = await getCurrentUser();
  if (user) {
    try {
      await fetch(`${API_BASE}/api/auth/update-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          consent_id: "",
          bank_token: "",
        }),
      });
    } catch {
      // ignore
    }
  }
}

export async function isBankConnected(): Promise<boolean> {
  return (await getStoredConsentId()) !== null;
}

// ---------------------------------------------------------------------------
// Signup / login / logout
// ---------------------------------------------------------------------------

interface RegisterResponse {
  email: string;
  name: string;
  created_at: string;
}

interface LoginResponse {
  email: string;
  name: string;
  created_at: string;
  consent_id?: string;
  bank_token?: string;
}

export async function signup(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult | AuthError> {
  try {
    const resp = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });

    if (!resp.ok) {
      let detail = "Registration failed";
      try {
        const body = (await resp.json()) as { detail?: string };
        if (body?.detail) detail = body.detail;
      } catch {
        // ignore
      }
      return { ok: false, error: detail };
    }

    const user = (await resp.json()) as RegisterResponse;
    const session: MasroofiUser = { email, name, createdAt: user.created_at };
    await setSession(session);
    // Auto-wire demo bank: every signup gets Ahmed's accounts pre-connected
    // so the dashboard shows real data immediately, no consent round-trip.
    const consentId = email.includes("fatima") ? DEMO_CONSENT_FATIMA : DEMO_CONSENT_DEFAULT;
    await secureSet(CONSENT_ID_KEY, consentId);
    await secureSet(BANK_TOKEN_KEY, consentId);
    return { ok: true, user: session };
  } catch {
    return { ok: false, error: "Network error — please try again" };
  }
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResult | AuthError> {
  try {
    const resp = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!resp.ok) {
      return { ok: false, error: "Invalid email or password" };
    }

    const user = (await resp.json()) as LoginResponse;
    const session: MasroofiUser = {
      email: user.email,
      name: user.name,
      createdAt: user.created_at,
    };
    await setSession(session);

    // Restore cached bank credentials from the DB record, OR auto-wire demo.
    if (user.consent_id) {
      await secureSet(CONSENT_ID_KEY, user.consent_id);
      await secureSet(BANK_TOKEN_KEY, user.bank_token || user.consent_id);
    } else {
      const consentId = email.includes("fatima") ? DEMO_CONSENT_FATIMA : DEMO_CONSENT_DEFAULT;
      await secureSet(CONSENT_ID_KEY, consentId);
      await secureSet(BANK_TOKEN_KEY, consentId);
    }

    return { ok: true, user: session };
  } catch {
    return { ok: false, error: "Network error — please try again" };
  }
}

export async function logout(): Promise<void> {
  await clearSession();
  // Keep bank credentials out of the device after sign-out.
  await secureDelete(BANK_TOKEN_KEY);
  await secureDelete(CONSENT_ID_KEY);
}
