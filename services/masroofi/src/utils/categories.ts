/**
 * Transaction categorization rules.
 * Categorizes transactions by matching description patterns.
 */

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  icon: string;
  patterns: RegExp[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'salary',
    name: 'Salary & Income',
    nameAr: 'الراتب والدخل',
    color: '#00b894',
    icon: 'cash',
    patterns: [/salary/i, /payroll/i, /wage/i, /income/i, /bonus/i, /commission/i],
  },
  {
    id: 'groceries',
    name: 'Groceries',
    nameAr: 'البقالة',
    color: '#fdcb6e',
    icon: 'shopping-cart',
    patterns: [
      /lulu/i, /carrefour/i, /al.?fair/i, /nesto/i, /spar/i, /grocery/i, /supermarket/i,
      /al.?meera/i, /sultan.?center/i, /al.?safeer/i, /market/i, /hyper/i, /provision/i,
    ],
  },
  {
    id: 'telecom',
    name: 'Telecom',
    nameAr: 'الاتصالات',
    color: '#0984e3',
    icon: 'device-mobile',
    patterns: [/omantel/i, /ooredoo/i, /awasr/i, /telecom/i, /internet/i, /mobile/i, /recharge/i],
  },
  {
    id: 'transport',
    name: 'Transport & Fuel',
    nameAr: 'النقل والوقود',
    color: '#636e72',
    icon: 'car',
    patterns: [
      /shell/i, /petrol/i, /fuel/i, /oomco/i, /al.?maha/i, /taxi/i, /uber/i, /parking/i,
      /transport/i, /careem/i, /gas.?station/i,
    ],
  },
  {
    id: 'dining',
    name: 'Dining & Food',
    nameAr: 'المطاعم والطعام',
    color: '#e17055',
    icon: 'tools-kitchen-2',
    patterns: [
      /restaurant/i, /kfc/i, /mcdonald/i, /pizza/i, /food/i, /bakery/i, /grill/i,
      /kempinski/i, /chedi/i, /shangri.?la/i, /w.?hotel/i, /rotana/i, /burger/i,
      /subway/i, /domino/i, /shawarma/i, /biryani/i,
    ],
  },
  {
    id: 'coffee',
    name: 'Coffee & Cafe',
    nameAr: 'القهوة',
    color: '#e77f67',
    icon: 'coffee',
    patterns: [
      /starbucks/i, /costa/i, /tim.?horton/i, /coffee/i, /cafe/i, /caffe/i,
      /second.?cup/i, /%\s*arabica/i, /caribou/i,
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    nameAr: 'التسوق',
    color: '#a29bfe',
    icon: 'shopping-bag',
    patterns: [
      /mall/i, /store/i, /fashion/i, /clothing/i, /zara/i, /h&m/i, /purchase/i,
      /marks.?\&?.?spencer/i, /centrepoint/i, /centerpoint/i, /max\b/i, /splash/i,
      /home.?centre/i, /ikea/i, /daiso/i, /mothercare/i,
    ],
  },
  {
    id: 'online',
    name: 'Online Shopping',
    nameAr: 'التسوق الإلكتروني',
    color: '#6c5ce7',
    icon: 'world',
    patterns: [
      /amazon/i, /netflix/i, /spotify/i, /apple/i, /google.?play/i, /itunes/i,
      /noon/i, /namshi/i, /shein/i, /ali.?express/i, /ebay/i,
    ],
  },
  {
    id: 'utilities',
    name: 'Utilities',
    nameAr: 'المرافق',
    color: '#00cec9',
    icon: 'bolt',
    patterns: [
      /electricity/i, /water/i, /gas/i, /utility/i, /bill/i, /muscat.?electricity/i,
      /nama/i, /haya/i, /diam\b/i, /mazoon/i,
    ],
  },
  {
    id: 'housing',
    name: 'Housing & Rent',
    nameAr: 'السكن والإيجار',
    color: '#55a3e8',
    icon: 'home',
    patterns: [
      /rent/i, /muscat.?propert/i, /real.?estate/i, /landlord/i, /housing/i,
      /maintenance/i, /property/i,
    ],
  },
  {
    id: 'transfers',
    name: 'Transfers',
    nameAr: 'التحويلات',
    color: '#74b9ff',
    icon: 'arrows-exchange',
    patterns: [/transfer/i, /remittance/i, /swift/i, /wire/i, /send money/i],
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    nameAr: 'الرعاية الصحية',
    color: '#ff7675',
    icon: 'heart',
    patterns: [
      /hospital/i, /clinic/i, /pharmacy/i, /doctor/i, /medical/i, /health/i,
      /gym/i, /fitness/i, /muscle/i,
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    nameAr: 'التأمين',
    color: '#636e72',
    icon: 'shield',
    patterns: [/insurance/i, /policy/i, /premium/i, /takaful/i, /dhofar.?ins/i],
  },
  {
    id: 'education',
    name: 'Education',
    nameAr: 'التعليم',
    color: '#fab1a0',
    icon: 'school',
    patterns: [/school/i, /university/i, /college/i, /tuition/i, /education/i, /training/i],
  },
  {
    id: 'other',
    name: 'Other',
    nameAr: 'أخرى',
    color: '#b2bec3',
    icon: 'dots',
    patterns: [],
  },
];

/**
 * Categorize a transaction by its description.
 */
export function categorizeTransaction(description: string | undefined): Category {
  if (!description) return CATEGORIES[CATEGORIES.length - 1];

  for (const cat of CATEGORIES) {
    if (cat.id === 'other') continue;
    for (const pattern of cat.patterns) {
      if (pattern.test(description)) return cat;
    }
  }

  return CATEGORIES[CATEGORIES.length - 1];
}

export interface SpendingSummary {
  category: Category;
  total: number;
  count: number;
  percentage: number;
}

/**
 * Build a spending summary from transactions.
 * Only includes debit transactions (spending).
 */
export function buildSpendingSummary(
  transactions: Array<{
    CreditDebitIndicator: 'Credit' | 'Debit';
    Amount: { Amount: string };
    TransactionInformation?: string;
  }>
): SpendingSummary[] {
  const totals = new Map<string, { total: number; count: number }>();

  for (const tx of transactions) {
    if (tx.CreditDebitIndicator !== 'Debit') continue;
    const cat = categorizeTransaction(tx.TransactionInformation);
    const existing = totals.get(cat.id) || { total: 0, count: 0 };
    existing.total += parseFloat(tx.Amount.Amount);
    existing.count += 1;
    totals.set(cat.id, existing);
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v.total, 0);

  const summary: SpendingSummary[] = [];
  for (const cat of CATEGORIES) {
    const entry = totals.get(cat.id);
    if (entry && entry.total > 0) {
      summary.push({
        category: cat,
        total: entry.total,
        count: entry.count,
        percentage: grandTotal > 0 ? (entry.total / grandTotal) * 100 : 0,
      });
    }
  }

  summary.sort((a, b) => b.total - a.total);
  return summary;
}

/**
 * Group transactions by merchant / counterparty and return top N by total spend.
 */
export interface MerchantSummary {
  name: string;
  total: number;
  count: number;
  category: Category;
}

export function buildMerchantSummary(
  transactions: Array<{
    CreditDebitIndicator: 'Credit' | 'Debit';
    Amount: { Amount: string };
    TransactionInformation?: string;
    MerchantDetails?: { MerchantName?: string };
  }>,
  limit: number = 10,
): MerchantSummary[] {
  const merchants = new Map<string, { total: number; count: number; category: Category }>();

  for (const tx of transactions) {
    if (tx.CreditDebitIndicator !== 'Debit') continue;
    const raw = tx.MerchantDetails?.MerchantName || tx.TransactionInformation || 'Unknown';
    // Normalise: trim, collapse whitespace, title-case
    const name = raw.trim().replace(/\s+/g, ' ').substring(0, 60);
    const key = name.toLowerCase();
    const existing = merchants.get(key) || { total: 0, count: 0, category: categorizeTransaction(raw) };
    existing.total += parseFloat(tx.Amount.Amount);
    existing.count += 1;
    if (!merchants.has(key)) merchants.set(key, existing);
  }

  return Array.from(merchants.entries())
    .map(([key, val]) => ({
      name: key.replace(/\b\w/g, (c) => c.toUpperCase()),
      total: val.total,
      count: val.count,
      category: val.category,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Icon emoji for a category (used in UI without importing tabler icons). */
export function getCategoryEmoji(id: string): string {
  const map: Record<string, string> = {
    salary: '\u{1F4B0}',
    groceries: '\u{1F6D2}',
    telecom: '\u{1F4F1}',
    transport: '\u{1F697}',
    dining: '\u{1F37D}\uFE0F',
    coffee: '\u2615',
    shopping: '\u{1F455}',
    online: '\u{1F6CD}\uFE0F',
    utilities: '\u26A1',
    housing: '\u{1F3E0}',
    transfers: '\u{1F4E4}',
    healthcare: '\u{1F4AA}',
    insurance: '\u{1F6E1}\uFE0F',
    education: '\u{1F393}',
    other: '\u{1F4CC}',
  };
  return map[id] || '\u{1F4CC}';
}
