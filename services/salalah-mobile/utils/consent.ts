import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";

const STATE_KEY = "salalah_oauth_state";
const REF_KEY = "salalah_payment_ref";
const TOTAL_KEY = "salalah_payment_total";
const CONSENT_ID_KEY = "salalah_pending_consent";
const DEMO_CONSENT_ID = "703b51f7-4dae-437e-b66c-1aecec7d2d07";
const CLIENT_ID = "salalah-souq-demo";
const REDIRECT_URI = "salalahsouq://callback";

function randomState(): string {
  const bytes = new Uint8Array(24);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function openBankConsent(
  merchantRef: string,
  total: string,
): Promise<void> {
  const state = randomState();
  await AsyncStorage.multiSet([
    [STATE_KEY, state],
    [REF_KEY, merchantRef],
    [TOTAL_KEY, total],
    [CONSENT_ID_KEY, DEMO_CONSENT_ID],
  ]);

  const params = new URLSearchParams({
    consent_id: DEMO_CONSENT_ID,
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
