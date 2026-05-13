import { getCurrentUser } from './auth';

const BD_ONLINE_BASE = 'https://banking.tnd.bankdhofar.com';
const HISAB_REDIRECT_URI = 'https://hisab.tnd.bankdhofar.com/callback';
const CLIENT_ID = 'hisab-business';
const CLIENT_SECRET = 'hisab-business-secret-tnd';

const TOKEN_KEY = 'hisab_bank_token';
const CONSENT_KEY = 'hisab_consent_id';
const STATE_KEY = 'hisab_oauth_state';
const TPP_TOKEN_KEY = 'hisab_tpp_access_token';
const TPP_TOKEN_EXPIRY_KEY = 'hisab_tpp_token_expiry';

export interface ConsentResponse {
  consent_id: string;
  status: string;
  created_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

async function getTPPAccessToken(): Promise<string> {
  const cached = localStorage.getItem(TPP_TOKEN_KEY);
  const expiry = localStorage.getItem(TPP_TOKEN_EXPIRY_KEY);
  if (cached && expiry && Date.now() < Number(expiry) - 30000) {
    return cached;
  }

  const response = await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scopes: ['accounts'] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TPP token request failed: ${response.status} ${text}`);
  }

  const data: TokenResponse = await response.json();
  localStorage.setItem(TPP_TOKEN_KEY, data.access_token);
  localStorage.setItem(TPP_TOKEN_EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

function generateInteractionId(): string {
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) out += '-';
  }
  return out;
}

export async function createConsent(): Promise<ConsentResponse> {
  const token = await getTPPAccessToken();

  const response = await fetch('/open-banking/v4.0/aisp/account-access-consents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-fapi-interaction-id': generateInteractionId(),
      'x-fapi-financial-id': 'bankdhofar-sandbox',
    },
    body: JSON.stringify({
      Data: {
        Permissions: [
          'ReadAccountsBasic',
          'ReadAccountsDetail',
          'ReadBalances',
          'ReadTransactionsBasic',
          'ReadTransactionsDetail',
        ],
        ExpirationDateTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      Risk: {},
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create consent: ${response.status} ${text}`);
  }

  const obie = await response.json();
  return {
    consent_id: obie.Data?.ConsentId || obie.consent_id,
    status: obie.Data?.Status || obie.status,
    created_at: obie.Data?.CreationDateTime || obie.created_at,
  };
}

function generateState(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

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

export function validateState(receivedState: string): boolean {
  const stored = localStorage.getItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  return stored === receivedState;
}

export function storeCredentials(token: string, consentId: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CONSENT_KEY, consentId);

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

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredConsentId(): string | null {
  return localStorage.getItem(CONSENT_KEY);
}

export function isBankConnected(): boolean {
  return getStoredToken() !== null && getStoredConsentId() !== null;
}

export function disconnectBank(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(TPP_TOKEN_KEY);
  localStorage.removeItem(TPP_TOKEN_EXPIRY_KEY);

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
