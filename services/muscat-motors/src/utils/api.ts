/**
 * Muscat Motors dealer API client.
 *
 * Talks to ob-loan-service via the nginx proxy at /api/auto-lending/*,
 * which strips the prefix and forwards to http://ob-loan-service:8000/*.
 *
 * Basic auth, X-BD-Environment: sandbox, Idempotency-Key on non-GET.
 */

import type {
  Application,
  ApplicationListPage,
  CreateApplicationRequest,
  WebhookDeliveryList,
} from './types';

const CLIENT_ID = 'muscat-motors';
const CLIENT_SECRET = 'mm-sandbox-secret-do-not-use-in-prod';
const ENV = 'sandbox';
const API_BASE = '/api/auto-lending';

function basicAuthHeader(): string {
  return 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
}

function buildHeaders(method: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/json',
    Authorization: basicAuthHeader(),
    'X-BD-Environment': ENV,
  };
  if (method !== 'GET') {
    h['Content-Type'] = 'application/json';
    h['Idempotency-Key'] = crypto.randomUUID();
  }
  return h;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE}${path}`;
  const resp = await fetch(url, {
    method,
    headers: buildHeaders(method),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  if (!resp.ok) {
    const detail =
      parsed && typeof parsed === 'object' && parsed !== null
        ? ((parsed as Record<string, unknown>).detail ??
            (parsed as Record<string, unknown>).title ??
            JSON.stringify(parsed))
        : text;
    throw new Error(`${method} ${path} failed (${resp.status}): ${detail}`);
  }
  return parsed as T;
}

export function createApplication(body: CreateApplicationRequest): Promise<Application> {
  return request<Application>('POST', '/loan-applications', body);
}

export function getApplication(applicationId: string): Promise<Application> {
  return request<Application>('GET', `/loan-applications/${encodeURIComponent(applicationId)}`);
}

export function listApplications(
  opts: { status?: string; limit?: number } = {},
): Promise<ApplicationListPage> {
  const q = new URLSearchParams();
  if (opts.status) q.set('status', opts.status);
  if (opts.limit) q.set('limit', String(opts.limit));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return request<ApplicationListPage>('GET', `/loan-applications${suffix}`);
}

export function cancelApplication(applicationId: string, reason?: string): Promise<Application> {
  return request<Application>('POST', `/loan-applications/${encodeURIComponent(applicationId)}/cancel`, {
    reason,
  });
}

export function listWebhookDeliveries(
  opts: { status?: string; limit?: number } = {},
): Promise<WebhookDeliveryList> {
  const q = new URLSearchParams();
  if (opts.status) q.set('status', opts.status);
  if (opts.limit) q.set('limit', String(opts.limit));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return request<WebhookDeliveryList>('GET', `/webhooks/deliveries${suffix}`);
}

/** Format a Money value as "1,234.500 OMR". */
export function fmtMoney(m?: { amount: string; currency: string } | null): string {
  if (!m) return '—';
  const n = Number(m.amount);
  if (Number.isNaN(n)) return `${m.amount} ${m.currency}`;
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} ${m.currency}`;
}

/** Convert an OMR number to a Money object with 3-decimal string. */
export function toMoney(amount: number): { amount: string; currency: 'OMR' } {
  return { amount: amount.toFixed(3), currency: 'OMR' };
}
