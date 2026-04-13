/**
 * Payment flow utilities for Salalah Souq.
 *
 * Salalah Souq is a MERCHANT that uses Sadad as its payment gateway.
 * Sadad handles the OBIE PISP flow via Bank Dhofar Open Banking.
 *
 * Flow:
 * 1. Customer checks out at Salalah Souq
 * 2. Merchant creates domestic-payment consent via consent-service (POST /consents)
 * 3. Customer is redirected to BD Online for payment approval
 * 4. BD Online executes payment on approval, redirects back to Salalah Souq
 * 5. Salalah Souq shows payment receipt
 */

const CONSENT_SERVICE_URL = '/api/consent';
const BD_ONLINE_BASE = 'https://banking.tnd.bankdhofar.com';
const SE_REDIRECT_URI = 'https://salalah.tnd.bankdhofar.com/payment/callback';
const CLIENT_ID = 'sadad-payment-gateway';

const STATE_KEY = 'ss_payment_state';
const CONSENT_KEY = 'ss_consent_id';
const ORDER_REF_KEY = 'ss_order_ref';

/** Merchant account details */
export const MERCHANT = {
  name: 'Salalah Souq',
  nameAr: '\u0635\u0644\u0627\u0644\u0629 \u0633\u0648\u0642',
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

/**
 * Create a domestic-payment consent via the consent service.
 */
export async function createPaymentConsent(
  amount: number,
  reference: string
): Promise<ConsentResponse> {
  const response = await fetch(CONSENT_SERVICE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      consent_type: 'domestic-payment',
      tpp_id: CLIENT_ID,
      permissions: [],
      payment_details: {
        instructed_amount: {
          amount: amount.toFixed(3),
          currency: 'OMR',
        },
        creditor_account: {
          iban: MERCHANT.iban,
          name: MERCHANT.name,
        },
        reference,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create payment consent: ${response.status} ${text}`);
  }

  return response.json();
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
}
