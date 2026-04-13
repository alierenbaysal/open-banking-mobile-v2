/**
 * Consent service API client.
 *
 * Base URL routes through nginx proxy in production (/consents/ -> ob-consent-service:8080).
 * In development, Vite proxy forwards to localhost:8080.
 */

import { getAccessToken } from './auth';

// In production, nginx proxies /consents/ to the consent service.
// The base is relative so it goes through the same origin.
const CONSENT_API_BASE = '/api/consents';
const TPP_API_BASE = '/tpp';

// ----- Types matching the consent-service Pydantic models -----

export type ConsentStatus =
  | 'AwaitingAuthorisation'
  | 'Authorised'
  | 'Rejected'
  | 'Consumed'
  | 'Revoked'
  | 'Expired';

export type ConsentType =
  | 'account-access'
  | 'domestic-payment'
  | 'scheduled-payment'
  | 'standing-order'
  | 'domestic-vrp'
  | 'funds-confirmation';

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

export interface AuthorizeConsentRequest {
  customer_id: string;
  selected_accounts?: string[];
}

export interface RejectConsentRequest {
  customer_id?: string;
  reason?: string;
}

// ----- HTTP helpers -----

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json();
}

// ----- Consent endpoints -----

/** Get a single consent by ID. */
export async function getConsent(consentId: string): Promise<Consent> {
  return apiFetch<Consent>(`${CONSENT_API_BASE}/${consentId}`);
}

/** Authorize a consent (customer approves). */
export async function authorizeConsent(
  consentId: string,
  data: AuthorizeConsentRequest,
): Promise<Consent> {
  return apiFetch<Consent>(`${CONSENT_API_BASE}/${consentId}/authorize`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Reject a consent (customer declines). */
export async function rejectConsent(
  consentId: string,
  data: RejectConsentRequest,
): Promise<Consent> {
  return apiFetch<Consent>(`${CONSENT_API_BASE}/${consentId}/reject`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Revoke an active consent (customer withdraws permission). */
export async function revokeConsent(consentId: string, reason?: string): Promise<Consent> {
  const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  return apiFetch<Consent>(`${CONSENT_API_BASE}/${consentId}${params}`, {
    method: 'DELETE',
  });
}

/** Get consent audit history. */
export async function getConsentHistory(consentId: string): Promise<ConsentHistoryEntry[]> {
  return apiFetch<ConsentHistoryEntry[]>(`${CONSENT_API_BASE}/${consentId}/history`);
}

/**
 * List consents for a customer.
 */
export async function listConsents(customerId: string, status?: string): Promise<Consent[]> {
  const params = new URLSearchParams({ customer_id: customerId });
  if (status) params.set('status', status);
  // Simple fetch without auth — consent list is internal API
  const response = await fetch(`${CONSENT_API_BASE}?${params.toString()}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Consent list failed: ${response.status}`);
  }
  return response.json();
}

// ----- TPP endpoints -----

/** Get TPP details. */
export async function getTPP(tppId: string): Promise<TPP> {
  return apiFetch<TPP>(`${TPP_API_BASE}/${tppId}`);
}

/** List all TPPs. */
export async function listTPPs(): Promise<TPP[]> {
  return apiFetch<TPP[]>(TPP_API_BASE);
}
