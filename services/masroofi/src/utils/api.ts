/**
 * OBIE API client for Account Information Service Provider (AISP) endpoints.
 *
 * Base URL proxied via nginx: /api/obie/ -> qantara.tnd.bankdhofar.com/open-banking/v4.0/aisp/
 * All calls require Bearer token from the consent flow.
 */

import { getStoredToken } from './consent';

const BASE_URL = '/api/obie';

function generateInteractionId(): string {
  return crypto.randomUUID();
}

async function apiCall<T>(path: string): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No access token. Please connect your bank account first.');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-fapi-interaction-id': generateInteractionId(),
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

// ── OBIE Types ──────────────────────────────────────────────────────

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
  Amount: {
    Amount: string;
    Currency: string;
  };
  CreditDebitIndicator: 'Credit' | 'Debit';
  Type: string;
  DateTime: string;
}

export interface OBTransaction {
  AccountId: string;
  TransactionId: string;
  Amount: {
    Amount: string;
    Currency: string;
  };
  CreditDebitIndicator: 'Credit' | 'Debit';
  Status: string;
  BookingDateTime: string;
  ValueDateTime?: string;
  TransactionInformation?: string;
  Balance?: {
    Amount: {
      Amount: string;
      Currency: string;
    };
    CreditDebitIndicator: 'Credit' | 'Debit';
    Type: string;
  };
  MerchantDetails?: {
    MerchantName?: string;
    MerchantCategoryCode?: string;
  };
}

// ── API Methods ─────────────────────────────────────────────────────

export interface AccountsResponse {
  Data: {
    Account: OBAccount[];
  };
}

export interface BalancesResponse {
  Data: {
    Balance: OBBalance[];
  };
}

export interface TransactionsResponse {
  Data: {
    Transaction: OBTransaction[];
  };
}

/**
 * Get all accounts for the consented customer.
 */
export async function getAccounts(): Promise<OBAccount[]> {
  const res = await apiCall<AccountsResponse>('/accounts');
  return res.Data?.Account || [];
}

/**
 * Get a single account by ID.
 */
export async function getAccount(accountId: string): Promise<OBAccount | null> {
  const res = await apiCall<AccountsResponse>(`/accounts/${accountId}`);
  const accounts = res.Data?.Account || [];
  return accounts[0] || null;
}

/**
 * Get balances for a specific account.
 */
export async function getBalances(accountId: string): Promise<OBBalance[]> {
  const res = await apiCall<BalancesResponse>(`/accounts/${accountId}/balances`);
  return res.Data?.Balance || [];
}

/**
 * Get all balances across all accounts.
 */
export async function getAllBalances(): Promise<OBBalance[]> {
  const res = await apiCall<BalancesResponse>('/balances');
  return res.Data?.Balance || [];
}

/**
 * Get transactions for a specific account.
 */
export async function getTransactions(accountId: string): Promise<OBTransaction[]> {
  const res = await apiCall<TransactionsResponse>(`/accounts/${accountId}/transactions`);
  return res.Data?.Transaction || [];
}

/**
 * Get all transactions across all accounts.
 */
export async function getAllTransactions(): Promise<OBTransaction[]> {
  const res = await apiCall<TransactionsResponse>('/transactions');
  return res.Data?.Transaction || [];
}
