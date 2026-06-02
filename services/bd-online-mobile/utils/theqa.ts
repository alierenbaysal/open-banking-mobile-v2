/**
 * THEQA national-identity verification (eKYC) client.
 *
 * Flow:
 *   1. startVerification(customerId) → POST /theqa/verifications
 *      returns { reference, redirect_url }.
 *   2. Caller opens redirect_url (the THEQA SAS IdP). The customer approves
 *      in the THEQA app.
 *   3. THEQA SAS posts the SAML assertion to our SP's ACS, which 302s back to
 *      bdonline://verify/callback?ref=<reference>&status=verified|failed.
 *   4. getVerificationResult(reference) → GET /theqa/verifications/{reference}
 *      to read the asserted identity (national id is held server-side).
 */

// The THEQA SP is served on its own DMZ host (also the SAML ACS host MTCIT
// calls back to). DMZ ingress routes this host to ob-theqa-service.
export const THEQA_BASE = "https://theqa.omtd.bankdhofar.com";

export type VerificationStatus = "pending" | "verified" | "failed";

export interface StartVerificationResponse {
  reference: string;
  redirect_url: string;
  status: VerificationStatus;
}

export interface VerificationResult {
  reference: string;
  customer_id: string;
  purpose: string;
  status: VerificationStatus;
  national_id: string | null;
  name_id: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function startVerification(
  customerId: string,
  purpose = "onboarding",
): Promise<StartVerificationResponse> {
  const resp = await fetch(`${THEQA_BASE}/theqa/verifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ customer_id: customerId, purpose }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to start THEQA verification: ${resp.status} ${text}`);
  }
  return (await resp.json()) as StartVerificationResponse;
}

export async function getVerificationResult(
  reference: string,
): Promise<VerificationResult> {
  const resp = await fetch(
    `${THEQA_BASE}/theqa/verifications/${encodeURIComponent(reference)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to read verification: ${resp.status} ${text}`);
  }
  return (await resp.json()) as VerificationResult;
}
