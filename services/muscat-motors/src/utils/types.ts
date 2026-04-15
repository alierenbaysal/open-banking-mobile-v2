/** Types mirroring the ob-loan-service contract. Hand-kept minimal. */

export type Currency = 'OMR';

export interface Money {
  amount: string;
  currency: Currency;
}

export type VehicleCondition = 'new' | 'used';

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
  | 'pending_consent'
  | 'pending_decision'
  | 'decided'
  | 'declined'
  | 'contracted'
  | 'disbursed'
  | 'expired'
  | 'cancelled';

export type DecisionOutcome = 'approved' | 'declined' | 'conditional';

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
  environment: 'sandbox' | 'production';
  created_at: string;
  updated_at: string;
}

export interface ApplicationListPage {
  items: Application[];
  next_cursor?: string | null;
}

export interface WebhookDelivery {
  webhook_id: string;
  event_type: string;
  application_id?: string | null;
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter';
  delivery_attempts: number;
  last_attempted_at?: string | null;
  delivered_at?: string | null;
  last_response_code?: number | null;
  last_error?: string | null;
}

export interface WebhookDeliveryList {
  items: WebhookDelivery[];
}

export interface Salesperson {
  id: string;
  name: string;
  email: string;
  branch: string;
  initials: string;
  avatarBg: string;
}

export interface Car {
  id: string;
  make: string;
  model: string;
  year: number;
  condition: VehicleCondition;
  segment: string;
  priceOmr: number;     // convenience — converted to 3-dp Money at submit
  stock: number;
  emoji: string;
  accent: string;       // CSS colour for card gradient
}
