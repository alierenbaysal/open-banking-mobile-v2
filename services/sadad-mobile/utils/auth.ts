/**
 * Merchant authentication for the Sadad mobile app.
 *
 * In the demo build, login is mocked against a small list of test merchants.
 * Session is stored in AsyncStorage; replace with real OAuth later.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TestMerchant {
  merchant_id: string;
  username: string;
  display_name: string;
  legal_name: string;
  account_id: string;
  iban: string;
  mcc: string;
  onboarded_at: string;
}

export const TEST_MERCHANTS: TestMerchant[] = [
  {
    merchant_id: "MERCH-001",
    username: "salalah",
    display_name: "Salalah Electronics",
    legal_name: "Salalah Electronics Trading LLC",
    account_id: "DHOF-20001",
    iban: "OM02DHOF0001020099887701",
    mcc: "5732",
    onboarded_at: "2025-11-14",
  },
  {
    merchant_id: "MERCH-002",
    username: "souq",
    display_name: "Salalah Souq",
    legal_name: "Salalah Souq Marketplace LLC",
    account_id: "DHOF-20002",
    iban: "OM02DHOF0001020099887702",
    mcc: "5999",
    onboarded_at: "2025-09-02",
  },
  {
    merchant_id: "MERCH-003",
    username: "muscat",
    display_name: "Muscat Fuel Co.",
    legal_name: "Muscat Petroleum Services SAOG",
    account_id: "DHOF-20003",
    iban: "OM02DHOF0001020099887703",
    mcc: "5541",
    onboarded_at: "2024-08-21",
  },
];

const AUTH_KEY = "sadad_merchant_auth";

interface StoredAuth {
  merchant_id: string;
}

export async function login(
  username: string,
  password: string,
): Promise<TestMerchant | null> {
  const merchant = TEST_MERCHANTS.find(
    (m) => m.username.toLowerCase() === username.toLowerCase(),
  );
  if (!merchant) return null;
  if (password.toLowerCase() !== username.toLowerCase()) return null;

  await AsyncStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ merchant_id: merchant.merchant_id } satisfies StoredAuth),
  );
  return merchant;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

export async function getCurrentMerchant(): Promise<TestMerchant | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const stored: StoredAuth = JSON.parse(raw);
    return TEST_MERCHANTS.find((m) => m.merchant_id === stored.merchant_id) ?? null;
  } catch {
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw !== null;
}
