/**
 * Type definitions matching the OpenAPI 3.1 contract published at:
 *   https://qantara.tnd.bankdhofar.com/open-finance/auto-lending/openapi
 *
 * Hand-mirrored to keep zero runtime dependencies.
 */

export type Currency = "OMR";

export interface Money {
  amount: string;       // 3-decimal string, e.g. "12000.000"
  currency: Currency;
}

export type VehicleCondition = "new" | "used";

export interface Vehicle {
  vin?: string | null;
  make: string;
  model: string;
  year: number;
  condition: VehicleCondition;
  price: Money;
}

export interface CreateApplicationRequest {
  dealer_reference?: string | null;
  branch_code?: string | null;
  salesperson_email?: string | null;
  vehicle: Vehicle;
  requested_amount: Money;
  down_payment: Money;
  requested_tenor_months: number;
}

export type ApplicationStatus =
  | "pending_consent"
  | "pending_decision"
  | "decided"
  | "declined"
  | "contracted"
  | "disbursed"
  | "expired"
  | "cancelled";

export type DecisionOutcome = "approved" | "declined" | "conditional";

export interface DecisionSummary {
  decision: DecisionOutcome;
  approved_amount?: Money | null;
  interest_rate?: number | null;
  tenor_months?: number | null;
  monthly_installment?: Money | null;
  total_repayable?: Money | null;
  total_interest?: Money | null;
  decline_reasons?: string[] | null;
  decided_at: string;
  valid_until: string;
}

export interface QrInfo {
  payload: string;
  expires_at: string;
}

export interface Application {
  application_id: string;
  dealer_id: string;
  dealer_reference?: string | null;
  branch_code?: string | null;
  salesperson_email?: string | null;
  customer_id?: string | null;
  vehicle: Vehicle;
  requested_amount: Money;
  down_payment: Money;
  requested_tenor_months: number;
  status: ApplicationStatus;
  qr: QrInfo;
  decision?: DecisionSummary | null;
  environment: "sandbox" | "production";
  created_at: string;
  updated_at: string;
}

export interface ApplicationListPage {
  items: Application[];
  next_cursor?: string | null;
}

export interface Decision {
  decision_id: string;
  application_id: string;
  decision: DecisionOutcome;
  approved_amount?: Money | null;
  interest_rate?: number | null;
  tenor_months?: number | null;
  monthly_installment?: Money | null;
  total_repayable?: Money | null;
  total_interest?: Money | null;
  decline_reasons?: string[] | null;
  conditions?: string[] | null;
  income_monthly?: Money | null;
  existing_debt_monthly?: Money | null;
  dbr_before?: number | null;
  dbr_after?: number | null;
  credit_score?: number | null;
  score_band?: string | null;
  decided_at: string;
  valid_until: string;
  engine_version: string;
}

export interface ContractTerms {
  principal: Money;
  interest_rate: number;
  tenor_months: number;
  monthly_installment: Money;
  total_repayable: Money;
  first_payment_date: string;
}

export interface Contract {
  contract_id: string;
  application_id: string;
  customer_id: string;
  signed_at: string;
  signature_method: "otp_biometric" | "theqa";
  terms: ContractTerms;
}

export interface Disbursement {
  disbursement_id: string;
  application_id: string;
  contract_id: string;
  amount: Money;
  dealer_account_id: string;
  status: "pending" | "sent" | "completed" | "failed";
  transaction_id?: string | null;
  executed_at?: string | null;
}

export interface WebhookConfig {
  webhook_url: string;
  events: string[];
}

export interface WebhookDelivery {
  webhook_id: string;
  event_type: string;
  application_id?: string | null;
  status: "pending" | "delivered" | "failed" | "dead_letter";
  delivery_attempts: number;
  last_attempted_at?: string | null;
  delivered_at?: string | null;
  last_response_code?: number | null;
  last_error?: string | null;
}

/** RFC 7807 problem details body. */
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  correlation_id?: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface ClientOptions {
  /** Base URL of the API, e.g. https://api.tnd.bankdhofar.com/auto-lending/v1 */
  baseUrl: string;
  /** TPP client_id issued by Bank Dhofar */
  clientId: string;
  /** TPP client_secret issued by Bank Dhofar — keep in env vars, never in source */
  clientSecret: string;
  /** Default environment header (sandbox|production) */
  environment?: "sandbox" | "production";
  /** Custom fetch implementation (e.g. node-fetch on older Node) */
  fetch?: typeof fetch;
  /** Optional default headers to attach to every request */
  defaultHeaders?: Record<string, string>;
  /** Request timeout in ms (default 10s) */
  timeoutMs?: number;
}

export type WebhookEventType =
  | "loan_application.decided"
  | "loan_application.declined"
  | "loan_application.contracted"
  | "loan_application.disbursed"
  | "loan_application.expired"
  | "loan_application.cancelled";

export interface WebhookEvent<T = Record<string, unknown>> {
  event_id: string;
  event_type: WebhookEventType;
  occurred_at: string;
  application_id?: string | null;
  data: T;
}
