/**
 * Banking API client — single source of truth for account data.
 *
 * All account, balance, and transfer operations go through the Banking API
 * served by the consent service (proxied via nginx at /banking/).
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

const ACCOUNT_TYPE_AR: Record<string, string> = {
  CurrentAccount: 'حساب جاري',
  'Current Account': 'حساب جاري',
  SavingsAccount: 'حساب توفير',
  'Savings Account': 'حساب توفير',
  BusinessAccount: 'حساب تجاري',
  'Business Account': 'حساب تجاري',
};

const BANKING_API = '/banking';

// ── Type mapping helpers ────────────────────────────────────────────────

function mapAccountType(rawType: string): AccountType {
  const lower = rawType.toLowerCase();
  if (lower.includes('savings')) return 'SavingsAccount';
  if (lower.includes('business')) return 'BusinessAccount';
  return 'CurrentAccount';
}

function transformAccount(raw: Record<string, unknown>): BankAccount {
  const rawType = String(raw.account_type || raw.accountType || 'Current Account');
  const type = mapAccountType(rawType);
  return {
    accountId: String(raw.account_id || ''),
    iban: String(raw.iban || ''),
    description: String(raw.description || ''),
    descriptionAr: String(raw.description_ar || ''),
    currency: String(raw.currency || 'OMR'),
    balance: Number(raw.balance ?? 0),
    type,
    typeAr: ACCOUNT_TYPE_AR[type] || ACCOUNT_TYPE_AR[rawType] || rawType,
  };
}

// ── API calls ───────────────────────────────────────────────────────────

/**
 * Fetch all accounts for a customer from the Banking API.
 */
export async function fetchCustomerAccounts(customerId: string): Promise<BankAccount[]> {
  try {
    const resp = await fetch(`${BANKING_API}/customers/${encodeURIComponent(customerId)}/accounts`);
    if (!resp.ok) return [];
    const data: Record<string, unknown>[] = await resp.json();
    return data.map(transformAccount);
  } catch {
    return [];
  }
}

export interface TransferRequest {
  customer_id: string;
  source_account_id: string;
  target_account_id: string;
  amount: number;
  currency: string;
  reference: string;
  description?: string;
}

export interface TransferResult {
  transfer_id: string;
  source_transaction_id: string;
  target_transaction_id: string;
  amount: number;
  currency: string;
  source_account_id: string;
  target_account_id: string;
  source_balance_after: number;
  target_balance_after: number;
  reference: string;
  status: string;
  created_at: string;
}

/**
 * Execute a transfer via the Banking API.
 */
export async function executeTransfer(transfer: TransferRequest): Promise<TransferResult> {
  const resp = await fetch(`${BANKING_API}/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transfer),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Transfer failed' }));
    throw new Error(err.detail || 'Transfer failed');
  }
  return resp.json();
}

/**
 * Resolve customer ID from a Keycloak token value.
 * If the input already looks like a customer ID (starts with "CUST-"), return as-is.
 * Otherwise return the input unchanged (the backend resolves by customer_id).
 */
export function resolveCustomerId(emailOrUsername: string): string {
  if (emailOrUsername.startsWith('CUST-')) return emailOrUsername;
  return emailOrUsername;
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
