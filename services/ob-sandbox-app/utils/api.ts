/**
 * HTTP client for the Qantara consent service.
 *
 * All consent-related API calls go through this module.
 * The base URL points to the consent service deployment.
 */

import { getCurrentCustomer } from "./auth";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://qantara.tnd.bankdhofar.com";

// ---------------------------------------------------------------------------
// Types (mirrors consent service response models)
// ---------------------------------------------------------------------------

export type ConsentStatus =
  | "AwaitingAuthorisation"
  | "Authorised"
  | "Rejected"
  | "Consumed"
  | "Revoked"
  | "Expired";

export type ConsentType =
  | "account-access"
  | "domestic-payment"
  | "scheduled-payment"
  | "standing-order"
  | "domestic-vrp"
  | "funds-confirmation";

export interface PaymentDetails {
  instructed_amount?: {
    amount: string;
    currency: string;
  };
  creditor_account?: {
    scheme_name: string;
    identification: string;
    name: string;
  };
  remittance_information?: {
    reference: string;
    unstructured?: string;
  };
  end_to_end_identification?: string;
}

export interface ConsentResponse {
  consent_id: string;
  consent_type: ConsentType;
  tpp_id: string;
  customer_id: string | null;
  permissions: string[];
  selected_accounts: string[] | null;
  payment_details: PaymentDetails | null;
  control_parameters: Record<string, unknown> | null;
  status: ConsentStatus;
  status_update_time: string;
  creation_time: string;
  expiration_time: string | null;
  authorization_time: string | null;
  revocation_time: string | null;
  revocation_reason: string | null;
  risk_data: Record<string, unknown> | null;
}

export interface ConsentHistoryEntry {
  id: number;
  consent_id: string;
  event_type: string;
  event_time: string;
  actor_type: string;
  actor_id: string | null;
  previous_status: string | null;
  new_status: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface TPPInfo {
  tpp_id: string;
  tpp_name: string;
  tpp_name_ar: string | null;
  registration_number: string | null;
  is_aisp: boolean;
  is_pisp: boolean;
  is_cisp: boolean;
  client_id: string;
  redirect_uris: string[];
  logo_uri: string | null;
  status: string;
  onboarded_at: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public detail: string
  ) {
    super(`API Error ${statusCode}: ${detail}`);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Attach customer context header for sandbox identification
  const customer = await getCurrentCustomer();
  if (customer) {
    headers["X-Sandbox-Customer-Id"] = customer.customer_id;
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let detail = "Unknown error";
    try {
      const errorBody = await response.json();
      detail = errorBody.detail || JSON.stringify(errorBody);
    } catch {
      detail = await response.text();
    }
    throw new ApiError(response.status, detail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Consent API
// ---------------------------------------------------------------------------

/**
 * Fetch a single consent by ID.
 */
export async function getConsent(consentId: string): Promise<ConsentResponse> {
  return request<ConsentResponse>("GET", `/consents/${consentId}`);
}

/**
 * Authorize a consent (customer approves).
 */
export async function authorizeConsent(
  consentId: string,
  customerId: string,
  selectedAccounts?: string[]
): Promise<ConsentResponse> {
  return request<ConsentResponse>("POST", `/consents/${consentId}/authorize`, {
    customer_id: customerId,
    selected_accounts: selectedAccounts,
  });
}

/**
 * Reject a consent (customer declines).
 */
export async function rejectConsent(
  consentId: string,
  customerId?: string,
  reason?: string
): Promise<ConsentResponse> {
  return request<ConsentResponse>("POST", `/consents/${consentId}/reject`, {
    customer_id: customerId,
    reason: reason || "Customer rejected the consent",
  });
}

/**
 * Revoke an authorized consent.
 */
export async function revokeConsent(
  consentId: string,
  reason?: string
): Promise<ConsentResponse> {
  const query = reason ? `?reason=${encodeURIComponent(reason)}` : "";
  return request<ConsentResponse>("DELETE", `/consents/${consentId}${query}`);
}

/**
 * Get consent audit history.
 */
export async function getConsentHistory(
  consentId: string
): Promise<ConsentHistoryEntry[]> {
  return request<ConsentHistoryEntry[]>(
    "GET",
    `/consents/${consentId}/history`
  );
}

/**
 * Fetch TPP information by ID.
 */
export async function getTPP(tppId: string): Promise<TPPInfo> {
  return request<TPPInfo>("GET", `/tpp/${tppId}`);
}

// ---------------------------------------------------------------------------
// Consent type helpers
// ---------------------------------------------------------------------------

export function getConsentTypeLabel(type: ConsentType): string {
  switch (type) {
    case "account-access":
      return "Account Access";
    case "domestic-payment":
      return "Domestic Payment";
    case "scheduled-payment":
      return "Scheduled Payment";
    case "standing-order":
      return "Standing Order";
    case "domestic-vrp":
      return "Variable Recurring Payment";
    case "funds-confirmation":
      return "Funds Confirmation";
    default:
      return type;
  }
}

export function getConsentTypeColor(type: ConsentType): string {
  switch (type) {
    case "account-access":
      return "#2196F3";
    case "domestic-payment":
      return "#FF9800";
    case "scheduled-payment":
      return "#9C27B0";
    case "standing-order":
      return "#00BCD4";
    case "domestic-vrp":
      return "#E91E63";
    case "funds-confirmation":
      return "#607D8B";
    default:
      return "#757575";
  }
}

export function getStatusColor(status: ConsentStatus): string {
  switch (status) {
    case "AwaitingAuthorisation":
      return "#FF9800";
    case "Authorised":
      return "#4CAF50";
    case "Rejected":
      return "#F44336";
    case "Consumed":
      return "#607D8B";
    case "Revoked":
      return "#F44336";
    case "Expired":
      return "#9E9E9E";
    default:
      return "#757575";
  }
}

export function getStatusLabel(status: ConsentStatus): string {
  switch (status) {
    case "AwaitingAuthorisation":
      return "Pending";
    case "Authorised":
      return "Active";
    case "Rejected":
      return "Rejected";
    case "Consumed":
      return "Consumed";
    case "Revoked":
      return "Revoked";
    case "Expired":
      return "Expired";
    default:
      return status;
  }
}

/**
 * Check if a consent type involves a payment.
 */
export function isPaymentConsent(type: ConsentType): boolean {
  return (
    type === "domestic-payment" ||
    type === "scheduled-payment" ||
    type === "standing-order" ||
    type === "domestic-vrp"
  );
}
