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
  CurrentAccount: '\u062D\u0633\u0627\u0628 \u062C\u0627\u0631\u064A',
  SavingsAccount: '\u062D\u0633\u0627\u0628 \u062A\u0648\u0641\u064A\u0631',
  BusinessAccount: '\u062D\u0633\u0627\u0628 \u062A\u062C\u0627\u0631\u064A',
};

/**
 * Customer-to-accounts mapping.
 *
 * CUST-001: Ahmed Al-Balushi (ahmed@bankdhofar.com)
 * CUST-002: Fatima Al-Rashdi (fatima@bankdhofar.com)
 */
const CUSTOMER_ACCOUNTS: Record<string, BankAccount[]> = {
  'CUST-001': [
    {
      accountId: 'DHOF-10001',
      iban: 'OM02DHOF0001010012540350',
      description: 'Personal Current Account',
      descriptionAr: '\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062C\u0627\u0631\u064A \u0627\u0644\u0634\u062E\u0635\u064A',
      currency: 'OMR',
      balance: 12540.350,
      type: 'CurrentAccount',
      typeAr: ACCOUNT_TYPE_AR.CurrentAccount,
    },
    {
      accountId: 'DHOF-10002',
      iban: 'OM02DHOF0001010045230100',
      description: 'Savings Account',
      descriptionAr: '\u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u0648\u0641\u064A\u0631',
      currency: 'OMR',
      balance: 45230.100,
      type: 'SavingsAccount',
      typeAr: ACCOUNT_TYPE_AR.SavingsAccount,
    },
    {
      accountId: 'DHOF-10003',
      iban: 'OM02DHOF0001010128450750',
      description: 'Business Current Account',
      descriptionAr: '\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u062C\u0627\u0631\u064A',
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
      descriptionAr: '\u0627\u0644\u062D\u0633\u0627\u0628 \u0627\u0644\u062C\u0627\u0631\u064A \u0627\u0644\u0634\u062E\u0635\u064A',
      currency: 'OMR',
      balance: 8920.500,
      type: 'CurrentAccount',
      typeAr: ACCOUNT_TYPE_AR.CurrentAccount,
    },
    {
      accountId: 'DHOF-10005',
      iban: 'OM02DHOF0001010022100000',
      description: 'Savings Account',
      descriptionAr: '\u062D\u0633\u0627\u0628 \u0627\u0644\u062A\u0648\u0641\u064A\u0631',
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
  'ahmed@bankdhofar.com': 'CUST-001',
  'fatima@bankdhofar.com': 'CUST-002',
};

/** Resolve customer ID from Keycloak email or preferred_username. */
export function resolveCustomerId(emailOrUsername: string): string {
  return EMAIL_TO_CUSTOMER[emailOrUsername.toLowerCase()] || emailOrUsername;
}

/** Get accounts for a customer. */
export function getCustomerAccounts(customerId: string): BankAccount[] {
  return CUSTOMER_ACCOUNTS[customerId] || [];
}

/** Get a single account by ID across all customers. */
export function getAccountById(accountId: string): BankAccount | undefined {
  for (const accounts of Object.values(CUSTOMER_ACCOUNTS)) {
    const found = accounts.find((a) => a.accountId === accountId);
    if (found) return found;
  }
  return undefined;
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
