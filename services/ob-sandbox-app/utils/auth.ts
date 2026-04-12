/**
 * Simple authentication state management using AsyncStorage.
 *
 * In the sandbox app, authentication is simulated with two test customers.
 * No real OAuth/OIDC is performed for the PSU login; the consent service
 * receives the customer_id directly.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestAccount {
  account_id: string;
  sort_code: string;
  account_number: string;
  name: string;
  name_ar: string;
  type: "current" | "savings";
  currency: string;
  balance: number;
}

export interface TestCustomer {
  customer_id: string;
  username: string;
  full_name: string;
  full_name_ar: string;
  civil_id: string;
  accounts: TestAccount[];
}

// ---------------------------------------------------------------------------
// Test customer data
// ---------------------------------------------------------------------------

export const TEST_CUSTOMERS: TestCustomer[] = [
  {
    customer_id: "CUST-001",
    username: "ahmed",
    full_name: "Ahmed Al-Balushi",
    full_name_ar: "\u0623\u062d\u0645\u062f \u0627\u0644\u0628\u0644\u0648\u0634\u064a",
    civil_id: "12345678",
    accounts: [
      {
        account_id: "ACC-001-01",
        sort_code: "01-02-03",
        account_number: "10200300401",
        name: "Current Account",
        name_ar: "\u062d\u0633\u0627\u0628 \u062c\u0627\u0631\u064a",
        type: "current",
        currency: "OMR",
        balance: 2450.75,
      },
      {
        account_id: "ACC-001-02",
        sort_code: "01-02-03",
        account_number: "10200300402",
        name: "Savings Account",
        name_ar: "\u062d\u0633\u0627\u0628 \u062a\u0648\u0641\u064a\u0631",
        type: "savings",
        currency: "OMR",
        balance: 15320.0,
      },
    ],
  },
  {
    customer_id: "CUST-002",
    username: "fatima",
    full_name: "Fatima Al-Rashdi",
    full_name_ar: "\u0641\u0627\u0637\u0645\u0629 \u0627\u0644\u0631\u0627\u0634\u062f\u064a",
    civil_id: "87654321",
    accounts: [
      {
        account_id: "ACC-002-01",
        sort_code: "01-02-03",
        account_number: "10200300501",
        name: "Current Account",
        name_ar: "\u062d\u0633\u0627\u0628 \u062c\u0627\u0631\u064a",
        type: "current",
        currency: "OMR",
        balance: 8730.5,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const AUTH_KEY = "ob_sandbox_auth";

interface StoredAuth {
  customer_id: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attempt to log in with username + password.
 * In sandbox mode, password must equal username.
 */
export async function login(username: string, password: string): Promise<TestCustomer | null> {
  const customer = TEST_CUSTOMERS.find(
    (c) => c.username.toLowerCase() === username.toLowerCase()
  );

  if (!customer) return null;
  if (password.toLowerCase() !== username.toLowerCase()) return null;

  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ customer_id: customer.customer_id }));
  return customer;
}

/**
 * Log out the current user.
 */
export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}

/**
 * Get the currently logged-in customer, or null.
 */
export async function getCurrentCustomer(): Promise<TestCustomer | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    const stored: StoredAuth = JSON.parse(raw);
    return TEST_CUSTOMERS.find((c) => c.customer_id === stored.customer_id) || null;
  } catch {
    return null;
  }
}

/**
 * Check if a user is logged in (without loading full customer data).
 */
export async function isLoggedIn(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw !== null;
}
