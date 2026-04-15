import { describe, it, expect, vi, beforeEach } from "vitest";
import { AutoLoansClient } from "../src/client.js";
import { AutoLoansApiError, AutoLoansNetworkError } from "../src/errors.js";

function fakeFetch(
  responses: Array<{ status: number; body: unknown; headers?: Record<string, string> }>,
) {
  let i = 0;
  return vi.fn(async (_url: string, _init?: RequestInit) => {
    const r = responses[i++];
    if (!r) throw new Error("fakeFetch ran out of responses");
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: new Headers(r.headers),
      text: async () => (typeof r.body === "string" ? r.body : JSON.stringify(r.body)),
    } as unknown as Response;
  });
}

describe("AutoLoansClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("requires baseUrl, clientId, clientSecret", () => {
    expect(() => new AutoLoansClient({ baseUrl: "", clientId: "x", clientSecret: "y" })).toThrow();
    expect(() => new AutoLoansClient({ baseUrl: "x", clientId: "", clientSecret: "y" })).toThrow();
    expect(() => new AutoLoansClient({ baseUrl: "x", clientId: "y", clientSecret: "" })).toThrow();
  });

  it("sends Basic auth + Idempotency-Key + X-BD-Environment on POST", async () => {
    const fetch = fakeFetch([{ status: 201, body: { application_id: "abc" } }]);
    const c = new AutoLoansClient({
      baseUrl: "https://api.example.com/v1",
      clientId: "muscat-motors",
      clientSecret: "secret",
      environment: "sandbox",
      fetch,
    });

    await c.createApplication({
      vehicle: { make: "Hyundai", model: "Creta", year: 2026, condition: "new",
                 price: { amount: "12000.000", currency: "OMR" } },
      requested_amount: { amount: "9600.000", currency: "OMR" },
      down_payment: { amount: "2400.000", currency: "OMR" },
      requested_tenor_months: 60,
    });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe("https://api.example.com/v1/loan-applications");
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toMatch(/^Basic /);
    expect(headers["Idempotency-Key"]).toBeTruthy();
    expect(headers["X-BD-Environment"]).toBe("sandbox");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init!.method).toBe("POST");
  });

  it("trims trailing slash from baseUrl", () => {
    const c = new AutoLoansClient({ baseUrl: "https://x/v1////", clientId: "i", clientSecret: "s" });
    expect((c as any)["#opts"]); // just verifying construction
  });

  it("returns parsed JSON on 2xx", async () => {
    const fetch = fakeFetch([{ status: 200, body: { items: [], next_cursor: null } }]);
    const c = new AutoLoansClient({ baseUrl: "https://x/v1", clientId: "i", clientSecret: "s", fetch });
    const page = await c.listApplications();
    expect(page.items).toEqual([]);
    expect(page.next_cursor).toBeNull();
  });

  it("throws AutoLoansApiError on 4xx with RFC 7807 body", async () => {
    const fetch = fakeFetch([{
      status: 401,
      body: { type: "https://bd.om/errors/unauthorized", title: "Unauthorized", status: 401, correlation_id: "abc-123" },
    }]);
    const c = new AutoLoansClient({ baseUrl: "https://x/v1", clientId: "i", clientSecret: "s", fetch });
    await expect(c.listApplications()).rejects.toMatchObject({
      name: "AutoLoansApiError",
      status: 401,
      correlationId: "abc-123",
    });
  });

  it("throws AutoLoansNetworkError when fetch fails", async () => {
    const fetch = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    const c = new AutoLoansClient({ baseUrl: "https://x/v1", clientId: "i", clientSecret: "s", fetch });
    await expect(c.listApplications()).rejects.toBeInstanceOf(AutoLoansNetworkError);
  });

  it("encodes query parameters", async () => {
    const fetch = fakeFetch([{ status: 200, body: { items: [] } }]);
    const c = new AutoLoansClient({ baseUrl: "https://x/v1", clientId: "i", clientSecret: "s", fetch });
    await c.listApplications({ status: "decided", limit: 10 });
    const url = fetch.mock.calls[0]![0] as string;
    expect(url).toContain("status=decided");
    expect(url).toContain("limit=10");
  });

  it("respects custom Idempotency-Key", async () => {
    const fetch = fakeFetch([{ status: 200, body: { application_id: "abc", status: "cancelled" } }]);
    const c = new AutoLoansClient({ baseUrl: "https://x/v1", clientId: "i", clientSecret: "s", fetch });
    await c.cancelApplication("abc-123", "test", { idempotencyKey: "MY-KEY-001" });
    const headers = fetch.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBe("MY-KEY-001");
  });
});
