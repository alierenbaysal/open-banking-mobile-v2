import { describe, it, expect } from "vitest";
import { getQrPayload, isQrExpired, secondsUntilQrExpiry } from "../src/qr.js";
import type { Application } from "../src/types.js";

const baseApp: Application = {
  application_id: "abc",
  dealer_id: "muscat-motors",
  vehicle: { make: "X", model: "Y", year: 2026, condition: "new", price: { amount: "1.000", currency: "OMR" } },
  requested_amount: { amount: "1.000", currency: "OMR" },
  down_payment: { amount: "0.000", currency: "OMR" },
  requested_tenor_months: 60,
  status: "pending_consent",
  qr: { payload: "https://bd.om/loan?a=abc", expires_at: new Date(Date.now() + 60_000).toISOString() },
  environment: "sandbox",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("qr helpers", () => {
  it("getQrPayload", () => {
    expect(getQrPayload(baseApp)).toBe("https://bd.om/loan?a=abc");
  });

  it("isQrExpired returns false for future expiry", () => {
    expect(isQrExpired(baseApp)).toBe(false);
  });

  it("isQrExpired returns true after expiry", () => {
    const past = { ...baseApp, qr: { ...baseApp.qr, expires_at: new Date(Date.now() - 1000).toISOString() } };
    expect(isQrExpired(past)).toBe(true);
  });

  it("secondsUntilQrExpiry counts down", () => {
    expect(secondsUntilQrExpiry(baseApp)).toBeGreaterThan(0);
    expect(secondsUntilQrExpiry(baseApp)).toBeLessThanOrEqual(60);
  });

  it("secondsUntilQrExpiry returns 0 once past", () => {
    const past = { ...baseApp, qr: { ...baseApp.qr, expires_at: new Date(Date.now() - 1000).toISOString() } };
    expect(secondsUntilQrExpiry(past)).toBe(0);
  });
});
