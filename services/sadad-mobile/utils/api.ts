/**
 * API helpers for Sadad mobile.
 *
 * Talks to the Sadad backend for:
 * - Payment session lookup (customer checkout deep-link entry)
 * - Merchant metrics (dashboard)
 * - Transaction history
 *
 * All endpoints here assume the demo/stub data shape returned by
 * `services/sadad/` on `https://sadad-api.omtd.bankdhofar.com`. For parts that the
 * backend does not yet expose, we return plausible mock data so the UI has
 * something to render during development.
 */

export const SADAD_API_BASE = "https://sadad-api.omtd.bankdhofar.com/api";
export const BD_ONLINE_DEEPLINK_BASE = "bdonline://consent/approve";

export interface PaymentSession {
  session_id: string;
  merchant: {
    merchant_id: string;
    name: string;
    logo_url?: string;
  };
  order_reference: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
  status: "pending" | "approved" | "rejected" | "expired";
  return_url: string;
}

export interface MerchantKpis {
  today_volume: number;
  today_count: number;
  success_rate: number;      // 0..1
  avg_ticket: number;
  throughput_per_min: number;
  month_to_date: number;
}

export interface TxTickerItem {
  id: string;
  reference: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  timestamp: string;
  customer_masked: string;
}

export interface Transaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "refunded";
  method: "bank-dhofar" | "card" | "other-bank";
  customer_masked: string;
  timestamp: string;
  settlement_id?: string;
}

export interface Settlement {
  id: string;
  batch_date: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  tx_count: number;
  status: "pending" | "processing" | "settled" | "failed";
  expected_value_date: string;
  settled_at?: string;
}

export interface ThroughputPoint {
  hour: string;   // ISO hour bucket
  count: number;
  amount: number;
}

// ---------------------------------------------------------------------------
// Fetch with graceful fallback to mock
// ---------------------------------------------------------------------------

async function tryFetch<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    const r = await fetch(`${SADAD_API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Customer checkout
// ---------------------------------------------------------------------------

export async function getPaymentSession(sessionId: string): Promise<PaymentSession> {
  const fallback: PaymentSession = {
    session_id: sessionId,
    merchant: {
      merchant_id: "MERCH-002",
      name: "Salalah Souq",
    },
    order_reference: `INV-2026-${sessionId.slice(0, 6).toUpperCase()}`,
    amount: 74.5,
    currency: "OMR",
    description: "Order from Salalah Souq",
    created_at: new Date().toISOString(),
    status: "pending",
    return_url: "https://salalahsouq.tnd.bankdhofar.com/order/callback",
  };
  return tryFetch<PaymentSession>(`/sessions/${sessionId}`, fallback);
}

/**
 * Build the deep-link URL to open BD Online for OAuth approval.
 * BD Online will redirect back to `sadad://pay/callback` when done.
 */
export function buildBdOnlineDeepLink(args: {
  sessionId: string;
  consentId: string;
  state: string;
  clientId?: string;
}): string {
  const params = new URLSearchParams({
    session_id: args.sessionId,
    consent_id: args.consentId,
    state: args.state,
    client_id: args.clientId ?? "sadad-payment-gateway",
    redirect_uri: "sadad://pay/callback",
  });
  return `${BD_ONLINE_DEEPLINK_BASE}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Merchant dashboard
// ---------------------------------------------------------------------------

export async function getMerchantKpis(merchantId: string): Promise<MerchantKpis> {
  return tryFetch<MerchantKpis>(`/merchants/${merchantId}/kpis`, {
    today_volume: 12480.75,
    today_count: 214,
    success_rate: 0.972,
    avg_ticket: 58.32,
    throughput_per_min: 3.1,
    month_to_date: 284650.5,
  });
}

export async function getLiveTicker(merchantId: string): Promise<TxTickerItem[]> {
  const now = Date.now();
  return tryFetch<TxTickerItem[]>(`/merchants/${merchantId}/ticker`, [
    { id: "t1", reference: "INV-2026-A9C3F1", amount: 42.0, status: "completed", timestamp: new Date(now - 4_000).toISOString(), customer_masked: "****2841" },
    { id: "t2", reference: "INV-2026-9BD220", amount: 118.45, status: "completed", timestamp: new Date(now - 17_000).toISOString(), customer_masked: "****1129" },
    { id: "t3", reference: "INV-2026-74AA01", amount: 9.9, status: "pending", timestamp: new Date(now - 32_000).toISOString(), customer_masked: "****7730" },
    { id: "t4", reference: "INV-2026-5D1E0C", amount: 214.0, status: "completed", timestamp: new Date(now - 61_000).toISOString(), customer_masked: "****0032" },
    { id: "t5", reference: "INV-2026-30CF77", amount: 5.5, status: "failed", timestamp: new Date(now - 102_000).toISOString(), customer_masked: "****9910" },
  ]);
}

export async function getTransactions(merchantId: string): Promise<Transaction[]> {
  const now = Date.now();
  const mock: Transaction[] = Array.from({ length: 22 }, (_, i) => {
    const statuses: Transaction["status"][] = [
      "completed", "completed", "completed", "completed", "pending", "failed", "refunded",
    ];
    return {
      id: `tx_${i}`,
      reference: `INV-2026-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      amount: Math.round(Math.random() * 40000) / 100,
      currency: "OMR",
      status: statuses[i % statuses.length],
      method: i % 4 === 0 ? "card" : "bank-dhofar",
      customer_masked: `****${(1000 + i * 37) % 10000}`.padStart(4, "0"),
      timestamp: new Date(now - i * 35 * 60_000).toISOString(),
      settlement_id: i > 5 ? `SETTLE-${Math.floor(i / 5)}` : undefined,
    };
  });
  return tryFetch<Transaction[]>(`/merchants/${merchantId}/transactions`, mock);
}

export async function getSettlements(merchantId: string): Promise<Settlement[]> {
  const now = Date.now();
  const d = (days: number) => new Date(now - days * 86_400_000).toISOString().slice(0, 10);
  const mock: Settlement[] = [
    { id: "SETTLE-2026-0412", batch_date: d(0), gross_amount: 12480.75, fee_amount: 37.44, net_amount: 12443.31, tx_count: 214, status: "processing", expected_value_date: d(-1) },
    { id: "SETTLE-2026-0411", batch_date: d(1), gross_amount: 9820.1, fee_amount: 29.46, net_amount: 9790.64, tx_count: 186, status: "settled", expected_value_date: d(0), settled_at: new Date(now - 86_400_000 + 8 * 3_600_000).toISOString() },
    { id: "SETTLE-2026-0410", batch_date: d(2), gross_amount: 14010.5, fee_amount: 42.03, net_amount: 13968.47, tx_count: 241, status: "settled", expected_value_date: d(1), settled_at: new Date(now - 2 * 86_400_000 + 8 * 3_600_000).toISOString() },
    { id: "SETTLE-2026-0409", batch_date: d(3), gross_amount: 7650.0, fee_amount: 22.95, net_amount: 7627.05, tx_count: 142, status: "settled", expected_value_date: d(2), settled_at: new Date(now - 3 * 86_400_000 + 8 * 3_600_000).toISOString() },
    { id: "SETTLE-2026-0408", batch_date: d(4), gross_amount: 11220.2, fee_amount: 33.66, net_amount: 11186.54, tx_count: 199, status: "failed", expected_value_date: d(3) },
  ];
  return tryFetch<Settlement[]>(`/merchants/${merchantId}/settlements`, mock);
}

export async function getThroughput(merchantId: string): Promise<ThroughputPoint[]> {
  const now = Date.now();
  const mock: ThroughputPoint[] = Array.from({ length: 12 }, (_, i) => {
    const hour = new Date(now - (11 - i) * 3_600_000);
    hour.setMinutes(0, 0, 0);
    const count = Math.round(40 + Math.sin(i * 0.9) * 25 + Math.random() * 10);
    return {
      hour: hour.toISOString(),
      count,
      amount: count * (45 + Math.random() * 15),
    };
  });
  return tryFetch<ThroughputPoint[]>(`/merchants/${merchantId}/throughput`, mock);
}
