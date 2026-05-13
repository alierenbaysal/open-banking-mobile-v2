const BD_ONLINE_BASE = 'https://banking.tnd.bankdhofar.com';
const SADAD_REDIRECT_URI = 'https://sadad.tnd.bankdhofar.com/payment/callback';
const CLIENT_ID = 'sadad-payment-gateway';

const TPP_TOKEN_KEY = 'sadad_tpp_access_token';
const TPP_TOKEN_EXPIRY_KEY = 'sadad_tpp_token_expiry';

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

const STATE_KEY = 'sadad_payment_state';
const CONSENT_KEY = 'sadad_consent_id';
const ORDER_REF_KEY = 'sadad_order_ref';

/** Merchant account details */
export const MERCHANT = {
  name: 'Salalah Electronics',
  nameAr: '\u0635\u0644\u0627\u0644\u0629 \u0644\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A',
  iban: 'OM02DHOF0001020099887701',
  accountId: 'DHOF-20001',
  customerId: 'CUST-SALEL',
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
  const now = new Date();
  const year = now.getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}-${rand}`;
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
          InstructionIdentification: `SADAD-${Date.now()}`,
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
    redirect_uri: SADAD_REDIRECT_URI,
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
}

/**
 * Fetch transactions for the merchant account (for the dashboard).
 */
export async function fetchMerchantTransactions(): Promise<MerchantTransaction[]> {
  const response = await fetch(`/api/banking/accounts/${MERCHANT.accountId}/transactions`);
  if (!response.ok) {
    // Return mock data for demo if API not available
    return generateMockTransactions();
  }
  const data = await response.json();
  return data.transactions || data;
}

export interface MerchantTransaction {
  id: string;
  date: string;
  reference: string;
  customer_name: string;
  amount: number;
  currency: string;
  status: string;
  type: 'credit' | 'debit';
}

/**
 * Generate mock transactions for demo purposes when banking API is unavailable.
 */
function generateMockTransactions(): MerchantTransaction[] {
  const customers = [
    'Ahmed Al-Rawahi',
    'Fatima Al-Balushi',
    'Khalid Al-Habsi',
    'Maryam Al-Kindi',
    'Said Al-Mahri',
    'Layla Al-Zadjali',
    'Omar Al-Busaidi',
    'Noura Al-Rashdi',
  ];

  const products = [
    { name: 'Frankincense Gift Set', price: 12.5 },
    { name: 'Khanjar Display Stand', price: 85.0 },
    { name: 'Coffee Set with Dallah', price: 45.0 },
    { name: 'Dhofar Honey 1kg', price: 28.0 },
    { name: 'Muscat Dates Premium Box', price: 18.5 },
    { name: 'Bukhoor Burner Set', price: 35.0 },
  ];

  const txns: MerchantTransaction[] = [];
  const now = new Date();

  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now.getTime() - daysAgo * 86400000);
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const qty = Math.floor(Math.random() * 3) + 1;
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();

    txns.push({
      id: `TXN-${i + 1}`,
      date: date.toISOString(),
      reference: `INV-2026-${rand}`,
      customer_name: customer,
      amount: product.price * qty,
      currency: 'OMR',
      status: 'completed',
      type: 'credit',
    });
  }

  // Sort by date descending
  txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return txns;
}
