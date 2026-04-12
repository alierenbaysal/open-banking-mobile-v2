/**
 * Consent flow utilities for OBIE account-access consents.
 *
 * Flow:
 * 1. Create consent via consent-service (POST /consents)
 * 2. Redirect user to BD Online for approval
 * 3. BD Online redirects back with authorization code
 * 4. Exchange code for access token (or use consent_id directly for demo)
 */

const CONSENT_SERVICE_URL = '/api/consent';
const BD_ONLINE_BASE = 'https://banking.tnd.bankdhofar.com';
const KEYCLOAK_TOKEN_URL = 'https://keycloak.uat.bankdhofar.com/realms/open-banking/protocol/openid-connect/token';
const MASROOFI_REDIRECT_URI = 'https://masroofi.tnd.bankdhofar.com/callback';
const CLIENT_ID = 'masroofi-demo';
const CLIENT_SECRET = 'masroofi-demo-secret-tnd';

const TOKEN_KEY = 'masroofi_bank_token';
const CONSENT_KEY = 'masroofi_consent_id';
const STATE_KEY = 'masroofi_oauth_state';

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
      consent_type: 'AccountAccess',
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
    redirect_uri: MASROOFI_REDIRECT_URI,
    state,
    client_id: CLIENT_ID,
  });

  return `${BD_ONLINE_BASE}/consent/approve?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token via Keycloak.
 * In the demo, the mock adapter accepts any Bearer token, so we
 * can also just use the consent_id as the token.
 */
export async function exchangeToken(authCode: string): Promise<string> {
  try {
    const response = await fetch(KEYCLOAK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: MASROOFI_REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch {
    // Token exchange failed — fall through to use auth code as token
  }

  // For demo: use the auth code itself as the bearer token
  return authCode;
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
 */
export function storeCredentials(token: string, consentId: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CONSENT_KEY, consentId);
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
 * Disconnect bank (clear stored credentials).
 */
export function disconnectBank(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CONSENT_KEY);
}
