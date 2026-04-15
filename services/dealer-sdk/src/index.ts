/**
 * @bankdhofar/auto-loans-sdk — Bank Dhofar Open Finance Auto-Loans TPP SDK.
 *
 * Quickstart:
 *
 *   import { AutoLoansClient } from "@bankdhofar/auto-loans-sdk";
 *
 *   const bd = new AutoLoansClient({
 *     baseUrl: "https://api.tnd.bankdhofar.com/auto-lending/v1",
 *     clientId: process.env.BD_CLIENT_ID!,
 *     clientSecret: process.env.BD_CLIENT_SECRET!,
 *     environment: "sandbox",
 *   });
 *
 *   const app = await bd.createApplication({
 *     vehicle: { make: "Hyundai", model: "Creta", year: 2026, condition: "new",
 *                price: { amount: "12000.000", currency: "OMR" } },
 *     requested_amount: { amount: "9600.000", currency: "OMR" },
 *     down_payment:     { amount: "2400.000", currency: "OMR" },
 *     requested_tenor_months: 60,
 *   });
 *   render(<QRCode value={app.qr.payload} />);
 */

export { AutoLoansClient } from "./client.js";
export { AutoLoansApiError, AutoLoansNetworkError, AutoLoansSignatureError } from "./errors.js";
export { verifyWebhookSignature, parseAndVerifyWebhook } from "./webhook.js";
export {
  getQrPayload,
  getQrExpiresAt,
  isQrExpired,
  secondsUntilQrExpiry,
} from "./qr.js";
export type * from "./types.js";
