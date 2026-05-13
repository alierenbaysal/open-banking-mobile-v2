const BD_ONLINE_BASE = 'https://banking.tnd.bankdhofar.com';
const SE_REDIRECT_URI = 'https://salalah.tnd.bankdhofar.com/payment/callback';
const CLIENT_ID = 'salalah-souq-demo';

const TPP_TOKEN_KEY = 'ss_tpp_access_token';
const TPP_TOKEN_EXPIRY_KEY = 'ss_tpp_token_expiry';

interface OAuthTokenResponse {
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
    body: JSON.stringify({ scopes: ['payments'] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TPP token request failed: ${response.status} ${text}`);
  }

  const data: OAuthTokenResponse = await response.json();
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

const STATE_KEY = 'ss_payment_state';
const CONSENT_KEY = 'ss_consent_id';
const ORDER_REF_KEY = 'ss_order_ref';

/** Merchant account details */
export const MERCHANT = {
  name: 'Salalah Souq',
  iban: 'OM02DHOF0001020099887701',
  accountId: 'DHOF-20001',
};

export interface ConsentResponse {
  consent_id: string;
  status: string;
  created_at: string;
}

/**
 * Generate a unique order reference.
 */
export function generateOrderRef(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `SS-INV-${rand}`;
}

/**
 * Generate a cryptographic random state parameter for CSRF protection.
 */
function generateState(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createPaymentConsent(
  amount: number,
  reference: string
): Promise<ConsentResponse> {
  const token = await getTPPAccessToken();

  const response = await fetch('/open-banking/v4.0/pisp/domestic-payment-consents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-fapi-interaction-id': generateInteractionId(),
      'x-fapi-financial-id': 'bankdhofar-sandbox',
    },
    body: JSON.stringify({
      Data: {
        Initiation: {
          InstructionIdentification: `SLHSOUQ-${Date.now()}`,
          EndToEndIdentification: reference,
          InstructedAmount: {
            Amount: amount.toFixed(3),
            Currency: 'OMR',
          },
          CreditorAccount: {
            SchemeName: 'IBAN',
            Identification: MERCHANT.iban,
            Name: MERCHANT.name,
          },
          RemittanceInformation: {
            Reference: reference,
          },
        },
      },
      Risk: {},
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create payment consent: ${response.status} ${text}`);
  }

  const obie = await response.json();
  return {
    consent_id: obie.Data?.ConsentId || obie.consent_id,
    status: obie.Data?.Status || obie.status,
    created_at: obie.Data?.CreationDateTime || obie.created_at,
  };
}

/**
 * Build the URL to redirect the user to BD Online for payment approval.
 */
export function buildPaymentRedirectUrl(consentId: string): string {
  const state = generateState();
  localStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    consent_id: consentId,
    redirect_uri: SE_REDIRECT_URI,
    state,
    client_id: CLIENT_ID,
  });

  return `${BD_ONLINE_BASE}/consent/approve?${params.toString()}`;
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
 * Store consent ID and order reference for the payment flow.
 */
export function storePaymentContext(consentId: string, orderRef: string): void {
  localStorage.setItem(CONSENT_KEY, consentId);
  localStorage.setItem(ORDER_REF_KEY, orderRef);
}

/**
 * Retrieve stored consent ID.
 */
export function getStoredConsentId(): string | null {
  return localStorage.getItem(CONSENT_KEY);
}

/**
 * Retrieve stored order reference.
 */
export function getStoredOrderRef(): string | null {
  return localStorage.getItem(ORDER_REF_KEY);
}

/**
 * Clear payment context after completion.
 */
export function clearPaymentContext(): void {
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(ORDER_REF_KEY);
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(TPP_TOKEN_KEY);
  localStorage.removeItem(TPP_TOKEN_EXPIRY_KEY);
}
