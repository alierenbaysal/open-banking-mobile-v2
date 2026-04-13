/**
 * Mock customer account data.
 *
 * In a real deployment, this would come from the Core Banking System (CBS) API.
 * For the Qantara sandbox/TND environment, we use static data that matches
 * the OBIE mock data seeded in the consent service.
 */

export interface BankAccount {
  accountId: string;
  iban: string;
  description: string;
  descriptionAr: string;
  currency: string;
  balance: number;
  type: AccountType;
  typeAr: string;
}

export type AccountType = 'CurrentAccount' | 'SavingsAccount' | 'BusinessAccount';

const ACCOUNT_TYPE_AR: Record<AccountType, string> = {
  CurrentAccount: 'حساب جاري',
  SavingsAccount: 'حساب توفير',
  BusinessAccount: 'حساب تجاري',
};

/**
 * Customer-to-accounts mapping.
 *
 * CUST-001: Emrah Baysal (emrahbaysal@gmail.com)
 * CUST-002: Fatima Al-Rashdi (fatima@bankdhofar.com)
 */
const CUSTOMER_ACCOUNTS: Record<string, BankAccount[]> = {
  'CUST-001': [
    {
      accountId: 'DHOF-10001',
      iban: 'OM02DHOF0001010012540350',
      description: 'Personal Current Account',
      descriptionAr: 'الحساب الجاري الشخصي',
      currency: 'OMR',
      balance: 12540.350,
      type: 'CurrentAccount',
      typeAr: ACCOUNT_TYPE_AR.CurrentAccount,
    },
    {
      accountId: 'DHOF-10002',
      iban: 'OM02DHOF0001010045230100',
      description: 'Savings Account',
      descriptionAr: 'حساب التوفير',
      currency: 'OMR',
      balance: 45230.100,
      type: 'SavingsAccount',
      typeAr: ACCOUNT_TYPE_AR.SavingsAccount,
    },
    {
      accountId: 'DHOF-10003',
      iban: 'OM02DHOF0001010128450750',
      description: 'Business Current Account',
      descriptionAr: 'الحساب التجاري',
      currency: 'OMR',
      balance: 128450.750,
      type: 'BusinessAccount',
      typeAr: ACCOUNT_TYPE_AR.BusinessAccount,
    },
  ],
  'CUST-002': [
    {
      accountId: 'DHOF-10004',
      iban: 'OM02DHOF0001010008920500',
      description: 'Personal Current Account',
      descriptionAr: 'الحساب الجاري الشخصي',
      currency: 'OMR',
      balance: 8920.500,
      type: 'CurrentAccount',
      typeAr: ACCOUNT_TYPE_AR.CurrentAccount,
    },
    {
      accountId: 'DHOF-10005',
      iban: 'OM02DHOF0001010022100000',
      description: 'Savings Account',
      descriptionAr: 'حساب التوفير',
      currency: 'OMR',
      balance: 22100.000,
      type: 'SavingsAccount',
      typeAr: ACCOUNT_TYPE_AR.SavingsAccount,
    },
  ],
};

/**
 * Email-to-customer-ID mapping.
 * Keycloak tokens contain the email; we map to the customer ID used by the consent service.
 */
const EMAIL_TO_CUSTOMER: Record<string, string> = {
  'emrahbaysal@gmail.com': 'CUST-001',
  'ahmed@bankdhofar.com': 'CUST-001',
  'fatima@bankdhofar.com': 'CUST-002',
};

/**
 * Resolve customer ID from a Keycloak token value.
 * Priority: if the input already looks like a customer ID (starts with "CUST-"), return as-is.
 * Otherwise fall back to the email-to-customer mapping.
 */
export function resolveCustomerId(emailOrUsername: string): string {
  if (emailOrUsername.startsWith('CUST-')) return emailOrUsername;
  return EMAIL_TO_CUSTOMER[emailOrUsername.toLowerCase()] || emailOrUsername;
}

/** Get accounts for a customer. */
export function getCustomerAccounts(customerId: string): BankAccount[] {
  return CUSTOMER_ACCOUNTS[customerId] || [];
}

/**
 * Session-level balance overrides (used by Transfer page to reflect in-session transfers).
 * Key: accountId, Value: new balance.
 */
const BALANCE_STORE_KEY = 'bd_online_balances';

/** Get current balance for an account (session override or default). */
export function getAccountBalance(accountId: string): number | undefined {
  try {
    const raw = sessionStorage.getItem(BALANCE_STORE_KEY);
    if (raw) {
      const overrides: Record<string, number> = JSON.parse(raw);
      if (accountId in overrides) return overrides[accountId];
    }
  } catch {
    // ignore
  }
  const acct = getAccountByIdRaw(accountId);
  return acct?.balance;
}

/** Update balance in session storage after a transfer. */
export function setAccountBalance(accountId: string, newBalance: number): void {
  let overrides: Record<string, number> = {};
  try {
    const raw = sessionStorage.getItem(BALANCE_STORE_KEY);
    if (raw) overrides = JSON.parse(raw);
  } catch {
    // ignore
  }
  overrides[accountId] = newBalance;
  sessionStorage.setItem(BALANCE_STORE_KEY, JSON.stringify(overrides));
}

/** Internal: get account from static data without balance overrides. */
function getAccountByIdRaw(accountId: string): BankAccount | undefined {
  for (const accounts of Object.values(CUSTOMER_ACCOUNTS)) {
    const found = accounts.find((a) => a.accountId === accountId);
    if (found) return found;
  }
  return undefined;
}

/** Get a single account by ID across all customers (with session balance override). */
export function getAccountById(accountId: string): BankAccount | undefined {
  const acct = getAccountByIdRaw(accountId);
  if (!acct) return undefined;
  const overrideBalance = getAccountBalance(accountId);
  if (overrideBalance !== undefined && overrideBalance !== acct.balance) {
    return { ...acct, balance: overrideBalance };
  }
  return acct;
}

/** Get accounts for a customer with session balance overrides applied. */
export function getCustomerAccountsWithBalances(customerId: string): BankAccount[] {
  const accts = CUSTOMER_ACCOUNTS[customerId] || [];
  return accts.map((a) => {
    const overrideBalance = getAccountBalance(a.accountId);
    if (overrideBalance !== undefined && overrideBalance !== a.balance) {
      return { ...a, balance: overrideBalance };
    }
    return a;
  });
}

/** Transfer record stored in session. */
export interface TransferRecord {
  id: string;
  fromAccountId: string;
  toAccountId: string | null;
  toIban: string | null;
  amount: number;
  currency: string;
  reference: string;
  timestamp: string;
}

const TRANSFERS_KEY = 'bd_online_transfers';

/** Get all transfer records from session. */
export function getTransfers(): TransferRecord[] {
  try {
    const raw = sessionStorage.getItem(TRANSFERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save a transfer record to session. */
export function saveTransfer(transfer: TransferRecord): void {
  const existing = getTransfers();
  existing.unshift(transfer);
  sessionStorage.setItem(TRANSFERS_KEY, JSON.stringify(existing));
}

/** Mask IBAN for display: show first 4 and last 4. */
export function maskIban(iban: string): string {
  if (iban.length <= 8) return iban;
  return `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`;
}

/** Format OMR balance. Oman uses 3 decimal places. */
export function formatBalance(amount: number, currency: string = 'OMR'): string {
  return new Intl.NumberFormat('en-OM', {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}
