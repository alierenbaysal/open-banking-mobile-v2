import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

const STATE_KEY = "salalah_oauth_state";
const REF_KEY = "salalah_payment_ref";
const TOTAL_KEY = "salalah_payment_total";
const CONSENT_ID_KEY = "salalah_pending_consent";
const TPP_TOKEN_KEY = "salalah_tpp_token";
const TPP_TOKEN_EXPIRY_KEY = "salalah_tpp_token_expiry";

const QANTARA_BASE = "https://qantara-api.omtd.bankdhofar.com";
const API_BASE = "https://banking-api.omtd.bankdhofar.com";
const CLIENT_ID = "salalah-souq-demo";
const REDIRECT_URI = "salalahsouq://callback";

function randomState(): string {
  const bytes = new Uint8Array(24);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
  const cached = await AsyncStorage.getItem(TPP_TOKEN_KEY);
  const expiry = await AsyncStorage.getItem(TPP_TOKEN_EXPIRY_KEY);
  if (cached && expiry && Date.now() < Number(expiry) - 30000) {
    return cached;
  }

  const resp = await fetch(`${QANTARA_BASE}/portal-api/tpp/${CLIENT_ID}/sandbox-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scopes: ["payments"] }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`TPP token request failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  await AsyncStorage.setItem(TPP_TOKEN_KEY, data.access_token);
  await AsyncStorage.setItem(TPP_TOKEN_EXPIRY_KEY, String(Date.now() + data.expires_in * 1000));
  return data.access_token;
}

async function createPaymentConsent(
  amount: string,
  merchantRef: string,
): Promise<string> {
  const token = await getTPPAccessToken();

  const resp = await fetch(`${QANTARA_BASE}/open-banking/v4.0/pisp/domestic-payment-consents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-fapi-interaction-id": generateInteractionId(),
      "x-fapi-financial-id": "bankdhofar-sandbox",
    },
    body: JSON.stringify({
      Data: {
        Initiation: {
          InstructionIdentification: `SLHSOUQ-${Date.now()}`,
          EndToEndIdentification: merchantRef,
          InstructedAmount: { Amount: amount, Currency: "OMR" },
          CreditorAccount: {
            SchemeName: "IBAN",
            Identification: "OM02DHOF0001020099887701",
            Name: "Salalah Souq",
          },
          RemittanceInformation: {
            Reference: merchantRef,
          },
        },
      },
      Risk: {},
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Consent creation failed: ${resp.status} ${text}`);
  }

  const obie = await resp.json();
  return obie.Data?.ConsentId || obie.consent_id;
}

export async function openBankConsent(
  merchantRef: string,
  total: string,
): Promise<void> {
  const consentId = await createPaymentConsent(total, merchantRef);

  const state = randomState();
  await AsyncStorage.multiSet([
    [STATE_KEY, state],
    [REF_KEY, merchantRef],
    [TOTAL_KEY, total],
    [CONSENT_ID_KEY, consentId],
  ]);

  const params = new URLSearchParams({
    consent_id: consentId,
    state,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
  });

  const deepLink = `bdonline://consent/approve?${params.toString()}`;

  try {
    await Linking.openURL(deepLink);
  } catch {
    throw new Error("BD Online app is not installed");
  }
}

export async function getStoredPaymentState(): Promise<{
  state: string | null;
  ref: string | null;
  total: string | null;
  consentId: string | null;
}> {
  const results = await AsyncStorage.multiGet([
    STATE_KEY,
    REF_KEY,
    TOTAL_KEY,
    CONSENT_ID_KEY,
  ]);
  return {
    state: results[0][1],
    ref: results[1][1],
    total: results[2][1],
    consentId: results[3][1],
  };
}

export async function clearPaymentState(): Promise<void> {
  await AsyncStorage.multiRemove([
    STATE_KEY,
    REF_KEY,
    TOTAL_KEY,
    CONSENT_ID_KEY,
  ]);
}

export async function exchangeCodeAndPay(code: string): Promise<{
  paymentId: string;
  status: string;
}> {
  const stored = await getStoredPaymentState();
  if (!stored.consentId) {
    throw new Error("No pending consent");
  }

  // Step 1: Exchange authorization code for access token
  const tokenResp = await fetch(`${API_BASE}/api/auth-codes/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_ID,
    }),
  });

  if (!tokenResp.ok) {
    const text = await tokenResp.text().catch(() => "");
    throw new Error(`Token exchange failed: ${tokenResp.status} ${text}`);
  }

  const tokenData = await tokenResp.json();
  const accessToken = tokenData.access_token;

  // Step 2: Submit the domestic payment via PISP endpoint
  const payResp = await fetch(
    `${API_BASE}/open-banking/v4.0/pisp/domestic-payments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        Data: {
          ConsentId: stored.consentId,
          Initiation: {
            InstructionIdentification: `INST-${Date.now()}`,
            InstructedAmount: {
              Amount: stored.total || "0",
              Currency: "OMR",
            },
            CreditorAccount: {
              SchemeName: "IBAN",
              Identification: "OM02DHOF0001020099887701",
              Name: "Salalah Souq",
            },
            RemittanceInformation: {
              Reference: stored.ref || "SLH-PAYMENT",
            },
          },
        },
        Risk: {},
      }),
    },
  );

  if (!payResp.ok) {
    const text = await payResp.text().catch(() => "");
    throw new Error(`Payment submission failed: ${payResp.status} ${text}`);
  }

  const payData = await payResp.json();
  return {
    paymentId: payData.Data?.DomesticPaymentId || "",
    status: payData.Data?.Status || "AcceptedSettlementInProcess",
  };
}
