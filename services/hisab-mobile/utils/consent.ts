import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { BD_ONLINE_BASE, QANTARA_BASE } from "./api";
import { deleteSecret, getSecret, setSecret } from "./storage";
import { updateBankOnBackend } from "./auth";

const CONSENT_KEY = "hisab.consent_id";
const TOKEN_KEY = "hisab.bank_token";
const STATE_KEY = "hisab.oauth_state";
const TPP_TOKEN_KEY = "hisab.tpp_token";
const TPP_TOKEN_EXPIRY_KEY = "hisab.tpp_token_expiry";

const CLIENT_ID = "hisab-business";
const CLIENT_SECRET = "hisab-business-secret-tnd";
const REDIRECT_URI = "hisab://callback";

export interface ConsentCreateResponse {
  consent_id: string;
  status: string;
  created_at?: string;
}

export interface ExchangeResponse {
  access_token: string;
  consent_id: string;
}

export interface ConnectResult {
  ok: boolean;
  consentId?: string;
  bankToken?: string;
  error?: string;
}

function generateInteractionId(): string {
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
  }
  return out;
}

async function getTPPAccessToken(): Promise<string> {
  const cached = await getSecret(TPP_TOKEN_KEY);
  const expiry = await getSecret(TPP_TOKEN_EXPIRY_KEY);
  if (cached && expiry && Date.now() < Number(expiry) - 30000) {
    return cached;
  }

  const resp = await fetch(`${QANTARA_BASE}/portal-api/tpp/${CLIENT_ID}/sandbox-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scopes: ["accounts"] }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`TPP token request failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  await setSecret(TPP_TOKEN_KEY, data.access_token);
  await setSecret(TPP_TOKEN_EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

export async function createConsent(): Promise<ConsentCreateResponse> {
  const token = await getTPPAccessToken();

  const response = await fetch(`${QANTARA_BASE}/open-banking/v4.0/aisp/account-access-consents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-fapi-interaction-id": generateInteractionId(),
      "x-fapi-financial-id": "bankdhofar-sandbox",
    },
    body: JSON.stringify({
      Data: {
        Permissions: [
          "ReadAccountsBasic",
          "ReadAccountsDetail",
          "ReadBalances",
          "ReadTransactionsBasic",
          "ReadTransactionsDetail",
        ],
        ExpirationDateTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
      Risk: {},
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
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
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 48; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

/**
 * Build the BD Online approval URL that the user will be redirected to.
 */
export async function buildConsentRedirectUrl(consentId: string): Promise<string> {
  const state = generateState();
  await setSecret(STATE_KEY, state);

  const params = new URLSearchParams({
    consent_id: consentId,
    redirect_uri: REDIRECT_URI,
    state,
    client_id: CLIENT_ID,
  });

  return `${BD_ONLINE_BASE}/consent/approve?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 */
export async function exchangeAuthCode(code: string): Promise<ExchangeResponse> {
  const response = await fetch(`${QANTARA_BASE}/banking/auth-codes/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  return (await response.json()) as ExchangeResponse;
}

export async function validateState(receivedState: string): Promise<boolean> {
  const stored = await getSecret(STATE_KEY);
  await deleteSecret(STATE_KEY);
  return stored !== null && stored === receivedState;
}

export async function storeCredentials(
  email: string,
  bankToken: string,
  consentId: string
): Promise<void> {
  await setSecret(TOKEN_KEY, bankToken);
  await setSecret(CONSENT_KEY, consentId);
  await updateBankOnBackend(email, consentId, bankToken);
}

export async function restoreCredentials(
  consentId: string | null,
  bankToken: string | null
): Promise<void> {
  if (consentId) await setSecret(CONSENT_KEY, consentId);
  if (bankToken) await setSecret(TOKEN_KEY, bankToken);
}

export async function getStoredConsentId(): Promise<string | null> {
  return getSecret(CONSENT_KEY);
}

export async function getStoredBankToken(): Promise<string | null> {
  return getSecret(TOKEN_KEY);
}

export async function isBankConnected(): Promise<boolean> {
  const id = await getSecret(CONSENT_KEY);
  return id !== null;
}

export async function disconnectBank(email?: string): Promise<void> {
  await deleteSecret(CONSENT_KEY);
  await deleteSecret(TOKEN_KEY);
  if (email) {
    await updateBankOnBackend(email, "", "");
  }
}

/**
 * High-level helper that drives the full OAuth connect flow end-to-end.
 *
 * It creates a consent, opens the BD Online approval URL in an in-app browser
 * (WebBrowser.openAuthSessionAsync which handles the deep-link redirect for us),
 * parses the callback, validates state, exchanges the code, and stores the token.
 */
export async function connectBank(email: string): Promise<ConnectResult> {
  try {
    const consent = await createConsent();
    const approvalUrl = await buildConsentRedirectUrl(consent.consent_id);

    const result = await WebBrowser.openAuthSessionAsync(approvalUrl, REDIRECT_URI);

    if (result.type !== "success" || !result.url) {
      return { ok: false, error: "Authorization cancelled" };
    }

    const parsed = Linking.parse(result.url);
    const code = typeof parsed.queryParams?.code === "string" ? parsed.queryParams.code : null;
    const state = typeof parsed.queryParams?.state === "string" ? parsed.queryParams.state : null;
    const err = typeof parsed.queryParams?.error === "string" ? parsed.queryParams.error : null;

    if (err) {
      return { ok: false, error: `Bank Dhofar returned error: ${err}` };
    }
    if (!code || !state) {
      return { ok: false, error: "Missing authorization code" };
    }
    const stateOk = await validateState(state);
    if (!stateOk) {
      return { ok: false, error: "State mismatch — possible CSRF" };
    }

    const exchange = await exchangeAuthCode(code);
    await storeCredentials(email, exchange.access_token, exchange.consent_id);

    return { ok: true, consentId: exchange.consent_id, bankToken: exchange.access_token };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
