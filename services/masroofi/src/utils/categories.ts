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
    nameAr: 'المواد الغذائية',
    color: '#fdcb6e',
    icon: 'shopping-cart',
    patterns: [/lulu/i, /carrefour/i, /al.?fair/i, /nesto/i, /spar/i, /grocery/i, /supermarket/i, /al.?meera/i],
  },
  {
    id: 'telecom',
    name: 'Telecom & Internet',
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
    patterns: [/shell/i, /petrol/i, /fuel/i, /oomco/i, /al.?maha/i, /taxi/i, /uber/i, /parking/i, /transport/i],
  },
  {
    id: 'dining',
    name: 'Dining & Food',
    nameAr: 'المطاعم',
    color: '#e17055',
    icon: 'tools-kitchen-2',
    patterns: [/restaurant/i, /coffee/i, /cafe/i, /kfc/i, /mcdonald/i, /pizza/i, /starbucks/i, /food/i, /bakery/i],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    nameAr: 'التسوق',
    color: '#a29bfe',
    icon: 'shopping-bag',
    patterns: [/mall/i, /store/i, /fashion/i, /clothing/i, /zara/i, /h&m/i, /amazon/i, /purchase/i],
  },
  {
    id: 'utilities',
    name: 'Utilities & Bills',
    nameAr: 'المرافق والفواتير',
    color: '#00cec9',
    icon: 'bolt',
    patterns: [/electricity/i, /water/i, /gas/i, /utility/i, /bill/i, /muscat.?electricity/i, /nama/i, /haya/i],
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
    patterns: [/hospital/i, /clinic/i, /pharmacy/i, /doctor/i, /medical/i, /health/i],
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
    nameAr: 'اخرى',
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
