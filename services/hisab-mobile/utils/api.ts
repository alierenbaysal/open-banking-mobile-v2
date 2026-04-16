/**
 * OBIE AISP client + backend base URL for Hisab mobile.
 *
 * Unlike the web app (which is served from the same origin as the backend
 * via nginx proxy), the mobile app talks directly to the Bank Dhofar
 * public hostnames. All AISP calls include a Bearer of the stored
 * consent_id, which the OBIE API server uses to look up consented accounts.
 */

import { getSecret } from "./storage";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** Hisab backend (auth, consent redirect helper, bank-connection cache). */
export const HISAB_API_BASE = "https://hisab-api.omtd.bankdhofar.com/api";

/** Qantara consent service — AISP APIs live under `/open-banking/v4.0/aisp`. */
export const QANTARA_BASE = "https://qantara-api.omtd.bankdhofar.com";

/** BD Online consent approval origin. */
export const BD_ONLINE_BASE = "https://banking-api.omtd.bankdhofar.com";

/** AISP base (OBIE v4.0). */
const AISP_BASE = `${QANTARA_BASE}/open-banking/v4.0/aisp`;

// ---------------------------------------------------------------------------
// OBIE types (subset)
// ---------------------------------------------------------------------------

export interface OBAmount {
  Amount: string;
  Currency: string;
}

export interface OBAccount {
  AccountId: string;
  Currency: string;
  AccountType: string;
  AccountSubType: string;
  Nickname?: string;
  Account?: Array<{
    SchemeName: string;
    Identification: string;
    Name?: string;
  }>;
}

export interface OBBalance {
  AccountId: string;
  Amount: OBAmount;
  CreditDebitIndicator: "Credit" | "Debit";
  Type: string;
  DateTime: string;
}

export type OBTransactionStatus = "Booked" | "Pending" | "Rejected" | string;

export interface OBTransaction {
  AccountId: string;
  TransactionId: string;
  Amount: OBAmount;
  CreditDebitIndicator: "Credit" | "Debit";
  Status: OBTransactionStatus;
  BookingDateTime: string;
  ValueDateTime?: string;
  TransactionInformation?: string;
  MerchantDetails?: {
    MerchantName?: string;
    MerchantCategoryCode?: string;
  };
  Balance?: {
    Amount: OBAmount;
    CreditDebitIndicator: "Credit" | "Debit";
    Type: string;
  };
}

interface AccountsResponse {
  Data: { Account: OBAccount[] };
}

interface BalancesResponse {
  Data: { Balance: OBBalance[] };
}

interface TransactionsResponse {
  Data: { Transaction: OBTransaction[] };
}

// ---------------------------------------------------------------------------
// Error + helpers
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public detail: string
  ) {
    super(`API ${statusCode}: ${detail}`);
    this.name = "ApiError";
  }
}

const CONSENT_KEY = "hisab.consent_id";
const TOKEN_KEY = "hisab.bank_token";

function generateInteractionId(): string {
  // RFC4122-ish v4 without the crypto module (deterministic enough for FAPI id)
  const hex = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < 32; i++) {
    out += hex[Math.floor(Math.random() * 16)];
    if (i === 7 || i === 11 || i === 15 || i === 19) out += "-";
  }
  return out;
}

async function aispCall<T>(path: string): Promise<T> {
  const consentId = await getSecret(CONSENT_KEY);
  const token = await getSecret(TOKEN_KEY);
  const bearer = consentId || token;

  if (!bearer) {
    throw new ApiError(401, "No access token. Please connect your bank account first.");
  }

  const response = await fetch(`${AISP_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${bearer}`,
      "x-fapi-interaction-id": generateInteractionId(),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, text || response.statusText);
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// AISP endpoints
// ---------------------------------------------------------------------------

export async function getAccounts(): Promise<OBAccount[]> {
  const res = await aispCall<AccountsResponse>("/accounts");
  return res.Data?.Account ?? [];
}

export async function getAccount(accountId: string): Promise<OBAccount | null> {
  const res = await aispCall<AccountsResponse>(`/accounts/${accountId}`);
  return res.Data?.Account?.[0] ?? null;
}

export async function getAllBalances(): Promise<OBBalance[]> {
  const res = await aispCall<BalancesResponse>("/balances");
  return res.Data?.Balance ?? [];
}

export async function getBalances(accountId: string): Promise<OBBalance[]> {
  const res = await aispCall<BalancesResponse>(`/accounts/${accountId}/balances`);
  return res.Data?.Balance ?? [];
}

export async function getAllTransactions(): Promise<OBTransaction[]> {
  const res = await aispCall<TransactionsResponse>("/transactions");
  return res.Data?.Transaction ?? [];
}

export async function getTransactions(accountId: string): Promise<OBTransaction[]> {
  const res = await aispCall<TransactionsResponse>(`/accounts/${accountId}/transactions`);
  return res.Data?.Transaction ?? [];
}
