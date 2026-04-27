import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

const STATE_KEY = "salalah_oauth_state";
const REF_KEY = "salalah_payment_ref";
const TOTAL_KEY = "salalah_payment_total";
const CONSENT_ID_KEY = "salalah_pending_consent";

const API_BASE = "https://banking-api.omtd.bankdhofar.com";
const TPP_ID = "salalah-souq-demo";
const CLIENT_ID = "salalah-souq-demo";
const REDIRECT_URI = "salalahsouq://callback";

function randomState(): string {
  const bytes = new Uint8Array(24);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function createPaymentConsent(
  amount: string,
  merchantRef: string,
): Promise<string> {
  const resp = await fetch(`${API_BASE}/api/consents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consent_type: "domestic-payment",
      tpp_id: TPP_ID,
      payment_details: {
        instructed_amount: { amount, currency: "OMR" },
        creditor_account: {
          scheme_name: "IBAN",
          identification: "OM02DHOF0001020099887701",
          name: "Salalah Souq",
        },
        remittance_information: {
          reference: merchantRef,
          unstructured: "Salalah Souq payment",
        },
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Consent creation failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data.consent_id;
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

  const canOpen = await Linking.canOpenURL(deepLink);
  if (!canOpen) {
    throw new Error("BD Online app is not installed");
  }

  await Linking.openURL(deepLink);
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
