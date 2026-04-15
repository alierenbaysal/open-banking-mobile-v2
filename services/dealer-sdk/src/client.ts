import { AutoLoansApiError, AutoLoansNetworkError } from "./errors.js";
import type {
  Application,
  ApplicationListPage,
  ClientOptions,
  Contract,
  CreateApplicationRequest,
  Decision,
  Disbursement,
  Problem,
  WebhookConfig,
  WebhookDelivery,
} from "./types.js";

const SDK_VERSION = "1.0.0";

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  idempotencyKey?: string;
  correlationId?: string;
  environment?: "sandbox" | "production";
}

/** Cryptographically random ID (for Idempotency-Key default). */
function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Best-effort fallback (not cryptographically strong)
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

/** Bank Dhofar Auto-Loans API client. */
export class AutoLoansClient {
  readonly #opts: Required<Omit<ClientOptions, "fetch" | "defaultHeaders" | "environment" | "timeoutMs">> & {
    fetch: typeof fetch;
    defaultHeaders: Record<string, string>;
    environment: "sandbox" | "production";
    timeoutMs: number;
  };

  constructor(opts: ClientOptions) {
    if (!opts.baseUrl) throw new Error("ClientOptions.baseUrl is required");
    if (!opts.clientId) throw new Error("ClientOptions.clientId is required");
    if (!opts.clientSecret) throw new Error("ClientOptions.clientSecret is required");

    this.#opts = {
      baseUrl: opts.baseUrl.replace(/\/+$/, ""),
      clientId: opts.clientId,
      clientSecret: opts.clientSecret,
      environment: opts.environment ?? "sandbox",
      fetch: opts.fetch ?? globalThis.fetch,
      defaultHeaders: opts.defaultHeaders ?? {},
      timeoutMs: opts.timeoutMs ?? 10_000,
    };
  }

  // ── Applications ──────────────────────────────────────────────────────

  createApplication(
    body: CreateApplicationRequest,
    options: { idempotencyKey?: string; correlationId?: string; environment?: "sandbox" | "production" } = {},
  ): Promise<Application> {
    return this.#request<Application>({
      method: "POST",
      path: "/loan-applications",
      body,
      idempotencyKey: options.idempotencyKey,
      correlationId: options.correlationId,
      environment: options.environment,
    });
  }

  listApplications(
    options: { status?: string; from?: string; to?: string; limit?: number; cursor?: string } = {},
  ): Promise<ApplicationListPage> {
    return this.#request<ApplicationListPage>({
      method: "GET",
      path: "/loan-applications",
      query: { status: options.status, from: options.from, to: options.to, limit: options.limit, cursor: options.cursor },
    });
  }

  getApplication(applicationId: string): Promise<Application> {
    return this.#request<Application>({
      method: "GET",
      path: `/loan-applications/${encodeURIComponent(applicationId)}`,
    });
  }

  cancelApplication(
    applicationId: string,
    reason?: string,
    options: { idempotencyKey?: string } = {},
  ): Promise<Application> {
    return this.#request<Application>({
      method: "POST",
      path: `/loan-applications/${encodeURIComponent(applicationId)}/cancel`,
      body: { reason },
      idempotencyKey: options.idempotencyKey,
    });
  }

  // ── Decisions / Contracts / Disbursements ─────────────────────────────

  getDecision(applicationId: string): Promise<Decision> {
    return this.#request<Decision>({
      method: "GET",
      path: `/loan-applications/${encodeURIComponent(applicationId)}/decision`,
    });
  }

  getContract(applicationId: string): Promise<Contract> {
    return this.#request<Contract>({
      method: "GET",
      path: `/loan-applications/${encodeURIComponent(applicationId)}/contract`,
    });
  }

  getDisbursement(applicationId: string): Promise<Disbursement> {
    return this.#request<Disbursement>({
      method: "GET",
      path: `/loan-applications/${encodeURIComponent(applicationId)}/disbursement`,
    });
  }

  // ── Webhooks ──────────────────────────────────────────────────────────

  getWebhookConfig(): Promise<WebhookConfig> {
    return this.#request<WebhookConfig>({ method: "GET", path: "/webhooks/me" });
  }

  updateWebhookUrl(webhookUrl: string): Promise<WebhookConfig> {
    return this.#request<WebhookConfig>({
      method: "PUT",
      path: "/webhooks/me",
      body: { webhook_url: webhookUrl },
    });
  }

  rotateWebhookSecret(options: { idempotencyKey?: string } = {}): Promise<{ webhook_secret: string }> {
    return this.#request<{ webhook_secret: string }>({
      method: "POST",
      path: "/webhooks/rotate-secret",
      idempotencyKey: options.idempotencyKey,
    });
  }

  listWebhookDeliveries(
    options: { status?: "pending" | "delivered" | "failed" | "dead_letter"; limit?: number } = {},
  ): Promise<{ items: WebhookDelivery[] }> {
    return this.#request<{ items: WebhookDelivery[] }>({
      method: "GET",
      path: "/webhooks/deliveries",
      query: { status: options.status, limit: options.limit },
    });
  }

  replayWebhook(webhookId: string): Promise<WebhookDelivery> {
    return this.#request<WebhookDelivery>({
      method: "POST",
      path: `/webhooks/replay/${encodeURIComponent(webhookId)}`,
    });
  }

  // ── Internal request plumbing ─────────────────────────────────────────

  async #request<T>(opts: RequestOptions): Promise<T> {
    const url = this.#buildUrl(opts.path, opts.query);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": `bd-auto-loans-sdk/${SDK_VERSION}`,
      Authorization: this.#basicAuth(),
      "X-BD-Environment": opts.environment ?? this.#opts.environment,
      ...this.#opts.defaultHeaders,
    };

    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    if (opts.method !== "GET") {
      headers["Idempotency-Key"] = opts.idempotencyKey ?? randomId();
    }
    if (opts.correlationId) {
      headers["X-Correlation-ID"] = opts.correlationId;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.#opts.timeoutMs);

    let resp: Response;
    try {
      resp = await this.#opts.fetch(url, {
        method: opts.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
      });
    } catch (e) {
      throw new AutoLoansNetworkError(`Network error calling ${opts.method} ${url}`, e);
    } finally {
      clearTimeout(timer);
    }

    if (resp.status === 204) return undefined as T;

    const text = await resp.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON body
    }

    if (resp.ok) {
      return parsed as T;
    }

    const problem: Problem = (parsed && typeof parsed === "object" ? parsed : {
      type: "https://bd.om/errors/unknown",
      title: `HTTP ${resp.status}`,
      status: resp.status,
      detail: text.slice(0, 500),
    }) as Problem;
    throw new AutoLoansApiError(problem);
  }

  #buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(this.#opts.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }
    return url.toString();
  }

  #basicAuth(): string {
    const raw = `${this.#opts.clientId}:${this.#opts.clientSecret}`;
    // Cross-runtime base64 (browser, Node 16+, Bun, Deno)
    const b64 =
      typeof btoa !== "undefined"
        ? btoa(raw)
        : Buffer.from(raw, "utf-8").toString("base64");
    return `Basic ${b64}`;
  }
}
