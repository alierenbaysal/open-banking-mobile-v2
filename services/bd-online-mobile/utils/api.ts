/**
 * BD Online API client.
 *
 * All requests go to the public DMZ-fronted host:
 *   https://banking-api.omtd.bankdhofar.com/api/...
 * which is served by ob-consent-service. CORS is allowed.
 *
 * Auth is session-cookie based (cookie name: `manara_session`).
 * On native we read the cookie value from SecureStore and attach it as
 * `Cookie: manara_session=<value>` on each request. On web we rely on the
 * browser's cookie jar (credentials: 'include') and the cookie set by the
 * login response.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const API_BASE = "https://banking-api.omtd.bankdhofar.com";

const SESSION_KEY = "bd_online_session_cookie";
const CUSTOMER_KEY = "bd_online_customer_id";
const USER_KEY = "bd_online_user";

// ---------------------------------------------------------------------------
// Session cookie helpers
// ---------------------------------------------------------------------------

export async function setSessionCookie(value: string): Promise<void> {
  if (Platform.OS === "web") {
    // Browser sets the cookie itself via Set-Cookie; nothing to do.
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

export async function getSessionCookie(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function clearSession(): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(CUSTOMER_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined);
  }
}

export async function setStoredUser(user: BankUser): Promise<void> {
  if (Platform.OS === "web") {
    try {
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  await SecureStore.setItemAsync(CUSTOMER_KEY, user.customer_id);
}

export async function getStoredUser(): Promise<BankUser | null> {
  let raw: string | null = null;
  if (Platform.OS === "web") {
    try {
      raw = window.sessionStorage.getItem(USER_KEY);
    } catch {
      raw = null;
    }
  } else {
    raw = await SecureStore.getItemAsync(USER_KEY);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BankUser;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BankUser {
  customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  accounts: string[];
}

export interface BankAccount {
  accountId: string;
  iban: string;
  description: string;
  currency: string;
  balance: number;
  type: "CurrentAccount" | "SavingsAccount" | "BusinessAccount";
}

export interface Transaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  currency: string;
  direction: "credit" | "debit";
  description: string;
  reference?: string;
  counterparty?: string;
  posted_at: string;
  balance_after?: number;
}

export interface Beneficiary {
  beneficiary_id: string;
  customer_id: string;
  name: string;
  iban: string;
  bank_name: string;
  bank_code: string;
  nickname: string;
  created_at: string;
}

export type ConsentStatus =
  | "AwaitingAuthorisation"
  | "Authorised"
  | "Rejected"
  | "Consumed"
  | "Revoked"
  | "Expired";

export type ConsentType =
  | "account-access"
  | "domestic-payment"
  | "scheduled-payment"
  | "standing-order"
  | "domestic-vrp"
  | "funds-confirmation";

export interface Consent {
  consent_id: string;
  consent_type: ConsentType;
  tpp_id: string;
  customer_id: string | null;
  permissions: string[];
  selected_accounts: string[] | null;
  payment_details: Record<string, unknown> | null;
  control_parameters: Record<string, unknown> | null;
  status: ConsentStatus;
  status_update_time: string;
  creation_time: string;
  expiration_time: string | null;
  authorization_time: string | null;
  revocation_time: string | null;
  revocation_reason: string | null;
  risk_data: Record<string, unknown> | null;
}

export interface TPP {
  tpp_id: string;
  tpp_name: string;
  tpp_name_ar: string | null;
  registration_number: string | null;
  is_aisp: boolean;
  is_pisp: boolean;
  is_cisp: boolean;
  client_id: string;
  redirect_uris: string[];
  jwks_uri: string | null;
  logo_uri: string | null;
  status: string;
  onboarded_at: string;
}

export interface ConsentHistoryEntry {
  id: number;
  consent_id: string;
  event_type: string;
  event_time: string;
  actor_type: string;
  actor_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface TransferRequest {
  customer_id: string;
  source_account_id: string;
  target_account_id: string;
  amount: number;
  currency: string;
  reference: string;
  description?: string;
}

export interface TransferResult {
  transfer_id: string;
  source_transaction_id: string;
  target_transaction_id: string;
  amount: number;
  currency: string;
  source_account_id: string;
  target_account_id: string;
  source_balance_after: number;
  target_balance_after: number;
  reference: string;
  status: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Low-level fetcher
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // On native, attach the session cookie manually.
  if (Platform.OS !== "web") {
    const cookie = await getSessionCookie();
    if (cookie) {
      headers["Cookie"] = `manara_session=${cookie}`;
    }
  }

  const init: RequestInit = {
    ...options,
    headers,
  };
  // On web, include credentials so the browser sends/receives the session cookie.
  if (Platform.OS === "web") {
    (init as RequestInit & { credentials?: RequestCredentials }).credentials =
      "include";
  }

  const resp = await fetch(url, init);
  const text = await resp.text();
  if (!resp.ok) {
    throw new ApiError(
      `API error ${resp.status} ${resp.statusText}`,
      resp.status,
      text,
    );
  }
  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ---------------------------------------------------------------------------
// Auth (bank login)
// ---------------------------------------------------------------------------

export async function bankLogin(
  email: string,
  password: string,
): Promise<BankUser> {
  const url = `${API_BASE}/api/bank-auth/login`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const init: RequestInit = {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password }),
  };
  if (Platform.OS === "web") {
    (init as RequestInit & { credentials?: RequestCredentials }).credentials =
      "include";
  }

  const resp = await fetch(url, init);
  const text = await resp.text();
  if (!resp.ok) {
    let detail = "Invalid email or password";
    try {
      const j = JSON.parse(text);
      detail = j.detail || j.message || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, resp.status, text);
  }

  // Capture session cookie on native (browser handles it on web).
  if (Platform.OS !== "web") {
    // React Native fetch exposes Set-Cookie via headers.get('set-cookie')
    const setCookie = resp.headers.get("set-cookie");
    if (setCookie) {
      const match = setCookie.match(/manara_session=([^;]+)/);
      if (match) {
        await setSessionCookie(match[1]);
      }
    }
  }

  const user = JSON.parse(text) as BankUser;
  await setStoredUser(user);
  return user;
}

export async function bankLogout(): Promise<void> {
  // Best-effort server logout; ignore errors.
  try {
    await apiFetch("/api/bank-auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  await clearSession();
}

// ---------------------------------------------------------------------------
// Accounts & transactions (Banking API)
// ---------------------------------------------------------------------------

function mapAccountType(rawType: string): BankAccount["type"] {
  const lower = (rawType || "").toLowerCase();
  if (lower.includes("savings")) return "SavingsAccount";
  if (lower.includes("business")) return "BusinessAccount";
  return "CurrentAccount";
}

function transformAccount(raw: Record<string, unknown>): BankAccount {
  const rawType = String(raw.account_type || raw.accountType || "Current Account");
  return {
    accountId: String(raw.account_id || raw.accountId || ""),
    iban: String(raw.iban || ""),
    description: String(raw.description || raw.name || ""),
    currency: String(raw.currency || "OMR"),
    balance: Number(raw.balance ?? 0),
    type: mapAccountType(rawType),
  };
}

export async function fetchCustomerAccounts(
  customerId: string,
): Promise<BankAccount[]> {
  try {
    const data = await apiFetch<Record<string, unknown>[]>(
      `/banking/customers/${encodeURIComponent(customerId)}/accounts`,
    );
    return (data || []).map(transformAccount);
  } catch {
    return [];
  }
}

export async function fetchAccount(
  customerId: string,
  accountId: string,
): Promise<BankAccount | null> {
  const all = await fetchCustomerAccounts(customerId);
  return all.find((a) => a.accountId === accountId) || null;
}

export async function fetchAccountTransactions(
  accountId: string,
  limit: number = 50,
): Promise<Transaction[]> {
  try {
    const data = await apiFetch<Transaction[]>(
      `/banking/accounts/${encodeURIComponent(accountId)}/transactions?limit=${limit}`,
    );
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchRecentTransactions(
  customerId: string,
  limit: number = 5,
): Promise<Transaction[]> {
  try {
    const data = await apiFetch<Transaction[]>(
      `/banking/customers/${encodeURIComponent(customerId)}/transactions?limit=${limit}`,
    );
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchBeneficiaries(
  customerId: string,
): Promise<Beneficiary[]> {
  try {
    const data = await apiFetch<Beneficiary[]>(
      `/banking/customers/${encodeURIComponent(customerId)}/beneficiaries`,
    );
    return data || [];
  } catch {
    return [];
  }
}

export async function executeTransfer(
  request: TransferRequest,
): Promise<TransferResult> {
  return apiFetch<TransferResult>("/banking/transfers", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// ---------------------------------------------------------------------------
// Consents (Open Banking)
// ---------------------------------------------------------------------------

export async function listConsents(
  customerId: string,
  status?: string,
): Promise<Consent[]> {
  const params = new URLSearchParams({ customer_id: customerId });
  if (status) params.set("status", status);
  return apiFetch<Consent[]>(`/api/consents?${params.toString()}`);
}

export async function getConsent(consentId: string): Promise<Consent> {
  return apiFetch<Consent>(`/api/consents/${encodeURIComponent(consentId)}`);
}

export async function authorizeConsent(
  consentId: string,
  data: { customer_id: string; selected_accounts?: string[] },
): Promise<Consent> {
  return apiFetch<Consent>(
    `/api/consents/${encodeURIComponent(consentId)}/authorize`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function rejectConsent(
  consentId: string,
  data: { customer_id?: string; reason?: string },
): Promise<Consent> {
  return apiFetch<Consent>(
    `/api/consents/${encodeURIComponent(consentId)}/reject`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function revokeConsent(
  consentId: string,
  reason?: string,
): Promise<Consent> {
  const params = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return apiFetch<Consent>(
    `/api/consents/${encodeURIComponent(consentId)}${params}`,
    { method: "DELETE" },
  );
}

export async function getConsentHistory(
  consentId: string,
): Promise<ConsentHistoryEntry[]> {
  try {
    return await apiFetch<ConsentHistoryEntry[]>(
      `/api/consents/${encodeURIComponent(consentId)}/history`,
    );
  } catch {
    return [];
  }
}

export async function getTPP(tppId: string): Promise<TPP | null> {
  try {
    return await apiFetch<TPP>(`/tpp/${encodeURIComponent(tppId)}`);
  } catch {
    return null;
  }
}

export async function generateAuthCode(payload: {
  consent_id: string;
  customer_id: string;
  redirect_uri: string;
}): Promise<{ code: string }> {
  return apiFetch<{ code: string }>("/api/auth-codes/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
