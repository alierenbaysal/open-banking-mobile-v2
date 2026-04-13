/**
 * Consent flow utilities for OBIE account-access consents.
 *
 * Flow:
 * 1. Create consent via consent-service (POST /consents)
 * 2. Redirect user to BD Online for approval
 * 3. BD Online redirects back with authorization code
 * 4. Exchange code for access token (or use consent_id directly for demo)
 */

import { getCurrentUser } from './auth';

const CONSENT_SERVICE_URL = '/api/consent';
const BD_ONLINE_BASE = 'https://banking.tnd.bankdhofar.com';
const KEYCLOAK_TOKEN_URL = 'https://keycloak.uat.bankdhofar.com/realms/open-banking/protocol/openid-connect/token';
const HISAB_REDIRECT_URI = 'https://hisab.tnd.bankdhofar.com/callback';
const CLIENT_ID = 'hisab-business';
const CLIENT_SECRET = 'hisab-business-secret-tnd';

const TOKEN_KEY = 'hisab_bank_token';
const CONSENT_KEY = 'hisab_consent_id';
const STATE_KEY = 'hisab_oauth_state';

export interface ConsentResponse {
  consent_id: string;
  status: string;
  created_at: string;
}

/**
 * Create an account-access consent via the consent service.
 */
export async function createConsent(): Promise<ConsentResponse> {
  const response = await fetch(CONSENT_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consent_type: 'account-access',
      tpp_id: CLIENT_ID,
      permissions: [
        'ReadAccountsBasic',
        'ReadAccountsDetail',
        'ReadBalances',
        'ReadTransactionsBasic',
        'ReadTransactionsDetail',
      ],
      expiration_days: 90,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create consent: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * Generate a random state parameter for CSRF protection.
 */
function generateState(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the URL to redirect the user to BD Online for consent approval.
 */
export function buildConsentRedirectUrl(consentId: string): string {
  const state = generateState();
  localStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    consent_id: consentId,
    redirect_uri: HISAB_REDIRECT_URI,
    state,
    client_id: CLIENT_ID,
  });

  return `${BD_ONLINE_BASE}/consent/approve?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token via the consent service auth-codes endpoint.
 */
export async function exchangeAuthCode(code: string): Promise<{ access_token: string; consent_id: string }> {
  const response = await fetch('/api/auth-codes/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return { access_token: data.access_token, consent_id: data.consent_id };
}

/**
 * Exchange an authorization code for an access token via Keycloak (legacy).
 * @deprecated Use exchangeAuthCode instead.
 */
export async function exchangeToken(authCode: string): Promise<string> {
  const result = await exchangeAuthCode(authCode);
  return result.access_token;
}

/**
 * Validate the state parameter from the callback.
 */
export function validateState(receivedState: string): boolean {
  const stored = localStorage.getItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  return stored === receivedState;
}

/**
 * Store the access token and consent ID after successful auth.
 * Persists to the DB so bank connection survives cache clears.
 */
export function storeCredentials(token: string, consentId: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CONSENT_KEY, consentId);

  // Persist to DB so bank connection survives browser cache clears
  const user = getCurrentUser();
  if (user) {
    fetch('/api/auth/update-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        consent_id: consentId,
        bank_token: token,
      }),
    }).catch(() => {});
  }
}

/**
 * Get the stored access token.
 */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the stored consent ID.
 */
export function getStoredConsentId(): string | null {
  return localStorage.getItem(CONSENT_KEY);
}

/**
 * Check if a bank connection is active.
 */
export function isBankConnected(): boolean {
  return getStoredToken() !== null && getStoredConsentId() !== null;
}

/**
 * Disconnect bank (clear stored credentials from localStorage and DB).
 */
export function disconnectBank(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CONSENT_KEY);

  // Clear from DB as well
  const user = getCurrentUser();
  if (user) {
    fetch('/api/auth/update-bank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        consent_id: '',
        bank_token: '',
      }),
    }).catch(() => {});
  }
}
