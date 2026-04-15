import { describe, it, expect } from "vitest";
import * as nodeCrypto from "node:crypto";
import { verifyWebhookSignature, parseAndVerifyWebhook } from "../src/webhook.js";
import { AutoLoansSignatureError } from "../src/errors.js";

function sign(body: string, secret: string): string {
  return "sha256=" + nodeCrypto.createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const secret = "mm-webhook-secret-test";
  const body = JSON.stringify({ event_id: "1", event_type: "loan_application.decided" });

  it("accepts a valid signature", async () => {
    await expect(
      verifyWebhookSignature({ secret, signature: sign(body, secret), body }),
    ).resolves.toBeUndefined();
  });

  it("rejects a bad signature", async () => {
    await expect(
      verifyWebhookSignature({ secret, signature: "sha256=00", body }),
    ).rejects.toBeInstanceOf(AutoLoansSignatureError);
  });

  it("rejects missing signature", async () => {
    await expect(
      verifyWebhookSignature({ secret, signature: undefined, body }),
    ).rejects.toBeInstanceOf(AutoLoansSignatureError);
  });

  it("rejects unknown signature scheme", async () => {
    await expect(
      verifyWebhookSignature({ secret, signature: "md5=abc", body }),
    ).rejects.toBeInstanceOf(AutoLoansSignatureError);
  });

  it("constant-time check rejects same-length-different-content", async () => {
    const otherSecret = "different-secret";
    await expect(
      verifyWebhookSignature({ secret, signature: sign(body, otherSecret), body }),
    ).rejects.toBeInstanceOf(AutoLoansSignatureError);
  });

  it("parseAndVerifyWebhook returns the event", async () => {
    const event = await parseAndVerifyWebhook<{ application_id: string }>({
      secret, signature: sign(body, secret), body,
    });
    expect(event.event_id).toBe("1");
    expect(event.event_type).toBe("loan_application.decided");
  });
});
