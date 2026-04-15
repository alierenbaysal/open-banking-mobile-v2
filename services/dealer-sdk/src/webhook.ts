/**
 * Webhook signature verification helper.
 *
 * Bank Dhofar signs every webhook with HMAC-SHA256 over the raw request
 * body, using the dealer's `webhook_secret`. The signature is delivered
 * in the `X-BD-Signature` header in the format `sha256=<hex>`.
 *
 * Always compare in constant time. Always use the RAW body (never the
 * pretty-printed / re-serialised version).
 */

import { AutoLoansSignatureError } from "./errors.js";
import type { WebhookEvent } from "./types.js";

/** Constant-time string comparison. Returns true iff equal. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, body: string | Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = typeof body === "string" ? enc.encode(body) : body;

  // Web Crypto (browser, modern Node 16+, Bun, Deno)
  if (typeof crypto !== "undefined" && "subtle" in crypto) {
    const key = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, msgData as BufferSource);
    const bytes = new Uint8Array(sig);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Node fallback
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = await import("node:crypto");
  return nodeCrypto.createHmac("sha256", secret).update(msgData).digest("hex");
}

/**
 * Verify the X-BD-Signature header against the raw body.
 * Throws AutoLoansSignatureError on mismatch.
 *
 * @example
 *   app.post("/bd-webhook", async (req, res) => {
 *     await verifyWebhookSignature({
 *       secret: process.env.BD_WEBHOOK_SECRET!,
 *       signature: req.headers["x-bd-signature"] as string,
 *       body: req.rawBody, // YOU MUST PASS THE RAW UNPARSED BODY
 *     });
 *     const event = JSON.parse(req.rawBody.toString());
 *     // ... handle event
 *     res.status(200).end();
 *   });
 */
export async function verifyWebhookSignature(opts: {
  secret: string;
  signature: string | string[] | undefined;
  body: string | Uint8Array;
}): Promise<void> {
  if (!opts.signature) throw new AutoLoansSignatureError("Missing X-BD-Signature header");
  const sig = Array.isArray(opts.signature) ? opts.signature[0] : opts.signature;
  if (!sig?.startsWith("sha256=")) {
    throw new AutoLoansSignatureError(`Unexpected signature scheme: ${sig?.slice(0, 16) ?? ""}`);
  }
  const provided = sig.slice("sha256=".length);
  const expected = await hmacSha256Hex(opts.secret, opts.body);
  if (!timingSafeEqual(provided, expected)) {
    throw new AutoLoansSignatureError("Webhook signature mismatch");
  }
}

/**
 * Convenience: verify and parse in one call.
 * Returns the typed event payload.
 */
export async function parseAndVerifyWebhook<T = Record<string, unknown>>(opts: {
  secret: string;
  signature: string | string[] | undefined;
  body: string | Uint8Array;
}): Promise<WebhookEvent<T>> {
  await verifyWebhookSignature(opts);
  const text = typeof opts.body === "string" ? opts.body : new TextDecoder().decode(opts.body);
  return JSON.parse(text) as WebhookEvent<T>;
}
