import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Breadcrumbs,
  Anchor,
  Collapse,
  UnstyledButton,
  Button,
  Box,
  Divider,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useParams, useNavigate } from 'react-router-dom';
import { IconChevronDown, IconChevronRight, IconTerminal2 } from '@tabler/icons-react';
import { API_GROUPS } from './index';
import { CodeBlock } from '../../components/common/CodeBlock';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  requestBody?: string;
  responseBody: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
};

const API_ENDPOINTS: Record<string, Endpoint[]> = {
  ais: [
    { method: 'POST', path: '/account-access-consents', summary: 'Create Account Access Consent', description: 'Create a new account access consent resource. The TPP must specify the permissions requested.', requestBody: JSON.stringify({ Data: { Permissions: ["ReadAccountsBasic", "ReadAccountsDetail", "ReadBalances", "ReadTransactionsBasic", "ReadTransactionsDetail"], ExpirationDateTime: "2026-12-31T00:00:00+00:00", TransactionFromDateTime: "2026-01-01T00:00:00+00:00", TransactionToDateTime: "2026-12-31T00:00:00+00:00" }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { ConsentId: "abc-123-consent", CreationDateTime: "2026-04-12T10:00:00+00:00", Status: "AwaitingAuthorisation", StatusUpdateDateTime: "2026-04-12T10:00:00+00:00", Permissions: ["ReadAccountsBasic", "ReadAccountsDetail", "ReadBalances", "ReadTransactionsBasic", "ReadTransactionsDetail"], ExpirationDateTime: "2026-12-31T00:00:00+00:00" }, Risk: {}, Links: { Self: "/open-banking/v4.0/aisp/account-access-consents/abc-123-consent" }, Meta: { TotalPages: 1 } }, null, 2) },
    { method: 'GET', path: '/account-access-consents/{ConsentId}', summary: 'Get Account Access Consent', description: 'Retrieve the details of an existing account access consent resource.', responseBody: JSON.stringify({ Data: { ConsentId: "abc-123-consent", Status: "Authorised", Permissions: ["ReadAccountsBasic", "ReadBalances"] }, Links: { Self: "/open-banking/v4.0/aisp/account-access-consents/abc-123-consent" }, Meta: {} }, null, 2) },
    { method: 'DELETE', path: '/account-access-consents/{ConsentId}', summary: 'Delete Account Access Consent', description: 'Revoke an existing account access consent. This action is irreversible.', responseBody: '// 204 No Content' },
    { method: 'GET', path: '/accounts', summary: 'Get Accounts', description: 'Retrieve a list of accounts that the PSU has authorized access to.', responseBody: JSON.stringify({ Data: { Account: [{ AccountId: "acc-001", Currency: "OMR", AccountType: "Personal", AccountSubType: "CurrentAccount", Description: "Current Account", Nickname: "My Account", Account: [{ SchemeName: "SortCodeAccountNumber", Identification: "112233-00112233", Name: "Ahmed Al-Busaidi" }] }] }, Links: { Self: "/open-banking/v4.0/aisp/accounts" }, Meta: { TotalPages: 1 } }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}', summary: 'Get Account', description: 'Retrieve the details of a specific account.', responseBody: JSON.stringify({ Data: { Account: [{ AccountId: "acc-001", Currency: "OMR", AccountType: "Personal", AccountSubType: "CurrentAccount" }] }, Links: { Self: "/open-banking/v4.0/aisp/accounts/acc-001" }, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/balances', summary: 'Get Account Balances', description: 'Retrieve the balance information for a specific account.', responseBody: JSON.stringify({ Data: { Balance: [{ AccountId: "acc-001", CreditDebitIndicator: "Credit", Type: "InterimAvailable", DateTime: "2026-04-12T10:00:00+00:00", Amount: { Amount: "15420.500", Currency: "OMR" } }] }, Links: { Self: "/open-banking/v4.0/aisp/accounts/acc-001/balances" }, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/transactions', summary: 'Get Account Transactions', description: 'Retrieve transaction history for a specific account. Supports pagination and date filtering.', responseBody: JSON.stringify({ Data: { Transaction: [{ AccountId: "acc-001", TransactionId: "txn-001", CreditDebitIndicator: "Debit", Status: "Booked", BookingDateTime: "2026-04-11T14:30:00+00:00", Amount: { Amount: "125.000", Currency: "OMR" }, TransactionInformation: "Card Purchase - Lulu Hypermarket" }] }, Links: { Self: "/open-banking/v4.0/aisp/accounts/acc-001/transactions" }, Meta: { TotalPages: 5, FirstAvailableDateTime: "2026-01-01T00:00:00+00:00" } }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/beneficiaries', summary: 'Get Account Beneficiaries', description: 'Retrieve beneficiaries registered for a specific account.', responseBody: JSON.stringify({ Data: { Beneficiary: [{ AccountId: "acc-001", BeneficiaryId: "ben-001", CreditorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "445566-99887766", Name: "Ali Mohammed" } }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/direct-debits', summary: 'Get Account Direct Debits', description: 'Retrieve direct debit mandates for a specific account.', responseBody: JSON.stringify({ Data: { DirectDebit: [{ AccountId: "acc-001", DirectDebitId: "dd-001", Name: "Oman Electricity", DirectDebitStatusCode: "Active", PreviousPaymentAmount: { Amount: "45.000", Currency: "OMR" } }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/standing-orders', summary: 'Get Account Standing Orders', description: 'Retrieve standing orders configured for a specific account.', responseBody: JSON.stringify({ Data: { StandingOrder: [{ AccountId: "acc-001", StandingOrderId: "so-001", Frequency: "EvryWorkgDay", FirstPaymentDateTime: "2026-01-01T00:00:00+00:00", FinalPaymentAmount: { Amount: "500.000", Currency: "OMR" } }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/product', summary: 'Get Account Product', description: 'Retrieve the product details associated with a specific account.', responseBody: JSON.stringify({ Data: { Product: [{ AccountId: "acc-001", ProductId: "prod-001", ProductType: "PersonalCurrentAccount", ProductName: "Dhofar Classic Current Account" }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/offers', summary: 'Get Account Offers', description: 'Retrieve offers available on a specific account.', responseBody: JSON.stringify({ Data: { Offer: [] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/party', summary: 'Get Account Party', description: 'Retrieve party (account holder) information associated with a specific account.', responseBody: JSON.stringify({ Data: { Party: { PartyId: "party-001", PartyType: "Sole", Name: "Ahmed Al-Busaidi", EmailAddress: "ahmed@example.com", Phone: "+968-9xxx-xxxx" } }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/scheduled-payments', summary: 'Get Scheduled Payments', description: 'Retrieve scheduled payments for a specific account.', responseBody: JSON.stringify({ Data: { ScheduledPayment: [] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/statements', summary: 'Get Account Statements', description: 'Retrieve account statements list for a specific account.', responseBody: JSON.stringify({ Data: { Statement: [{ AccountId: "acc-001", StatementId: "stmt-202603", Type: "RegularPeriodic", StartDateTime: "2026-03-01T00:00:00+00:00", EndDateTime: "2026-03-31T23:59:59+00:00" }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/statements/{StatementId}', summary: 'Get Statement Detail', description: 'Retrieve details for a specific account statement.', responseBody: JSON.stringify({ Data: { Statement: [{ StatementId: "stmt-202603", StartDateTime: "2026-03-01T00:00:00+00:00", EndDateTime: "2026-03-31T23:59:59+00:00", StatementAmount: [{ Amount: { Amount: "15420.500", Currency: "OMR" }, CreditDebitIndicator: "Credit", Type: "ClosingBalance" }] }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/accounts/{AccountId}/statements/{StatementId}/transactions', summary: 'Get Statement Transactions', description: 'Retrieve transactions within a specific statement period.', responseBody: JSON.stringify({ Data: { Transaction: [{ TransactionId: "txn-001", Status: "Booked", Amount: { Amount: "125.000", Currency: "OMR" } }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/balances', summary: 'Get Balances (Bulk)', description: 'Retrieve balances for all authorized accounts in a single call.', responseBody: JSON.stringify({ Data: { Balance: [{ AccountId: "acc-001", Amount: { Amount: "15420.500", Currency: "OMR" }, CreditDebitIndicator: "Credit", Type: "InterimAvailable" }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/transactions', summary: 'Get Transactions (Bulk)', description: 'Retrieve transactions across all authorized accounts.', responseBody: JSON.stringify({ Data: { Transaction: [] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/beneficiaries', summary: 'Get Beneficiaries (Bulk)', description: 'Retrieve beneficiaries for all authorized accounts.', responseBody: JSON.stringify({ Data: { Beneficiary: [] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/standing-orders', summary: 'Get Standing Orders (Bulk)', description: 'Retrieve standing orders for all authorized accounts.', responseBody: JSON.stringify({ Data: { StandingOrder: [] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/direct-debits', summary: 'Get Direct Debits (Bulk)', description: 'Retrieve direct debits for all authorized accounts.', responseBody: JSON.stringify({ Data: { DirectDebit: [] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/scheduled-payments', summary: 'Get Scheduled Payments (Bulk)', description: 'Retrieve scheduled payments for all authorized accounts.', responseBody: JSON.stringify({ Data: { ScheduledPayment: [] }, Links: {}, Meta: {} }, null, 2) },
  ],
  pis: [
    { method: 'POST', path: '/domestic-payment-consents', summary: 'Create Domestic Payment Consent', description: 'Create a domestic payment consent for a single immediate payment within Oman.', requestBody: JSON.stringify({ Data: { Initiation: { InstructionIdentification: "instr-001", EndToEndIdentification: "e2e-001", InstructedAmount: { Amount: "50.000", Currency: "OMR" }, CreditorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "112233-44556677", Name: "Mohammed Al-Hinai" } } }, Risk: { PaymentContextCode: "EcommerceGoods" } }, null, 2), responseBody: JSON.stringify({ Data: { ConsentId: "pmt-consent-001", Status: "AwaitingAuthorisation", Initiation: { InstructionIdentification: "instr-001", InstructedAmount: { Amount: "50.000", Currency: "OMR" } } }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-payment-consents/{ConsentId}', summary: 'Get Domestic Payment Consent', description: 'Retrieve the status and details of a domestic payment consent.', responseBody: JSON.stringify({ Data: { ConsentId: "pmt-consent-001", Status: "Authorised" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-payment-consents/{ConsentId}/funds-confirmation', summary: 'Get Funds Confirmation for Consent', description: 'Check if funds are available for the authorized domestic payment consent.', responseBody: JSON.stringify({ Data: { FundsAvailableResult: { FundsAvailableDateTime: "2026-04-12T10:00:00+00:00", FundsAvailable: true } }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/domestic-payments', summary: 'Create Domestic Payment', description: 'Execute a domestic payment using an authorized consent. This initiates the actual fund transfer.', requestBody: JSON.stringify({ Data: { ConsentId: "pmt-consent-001", Initiation: { InstructionIdentification: "instr-001", EndToEndIdentification: "e2e-001", InstructedAmount: { Amount: "50.000", Currency: "OMR" }, CreditorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "112233-44556677", Name: "Mohammed Al-Hinai" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { DomesticPaymentId: "pmt-001", ConsentId: "pmt-consent-001", Status: "AcceptedSettlementInProcess", Initiation: {} }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-payments/{DomesticPaymentId}', summary: 'Get Domestic Payment', description: 'Retrieve the current status and details of a domestic payment.', responseBody: JSON.stringify({ Data: { DomesticPaymentId: "pmt-001", Status: "AcceptedSettlementCompleted" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-payments/{DomesticPaymentId}/payment-details', summary: 'Get Payment Details', description: 'Retrieve detailed payment status information including scheme-specific details.', responseBody: JSON.stringify({ Data: { PaymentStatus: [{ Status: "Accepted", StatusUpdateDateTime: "2026-04-12T10:05:00+00:00", PaymentTransactionId: "T1234567" }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/domestic-scheduled-payment-consents', summary: 'Create Scheduled Payment Consent', description: 'Create a consent for a scheduled domestic payment at a future date.', requestBody: JSON.stringify({ Data: { Permission: "Create", Initiation: { RequestedExecutionDateTime: "2026-04-20T00:00:00+00:00", InstructedAmount: { Amount: "100.000", Currency: "OMR" }, CreditorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "112233-44556677", Name: "Fatma Al-Lawati" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { ConsentId: "sch-consent-001", Status: "AwaitingAuthorisation" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-scheduled-payment-consents/{ConsentId}', summary: 'Get Scheduled Payment Consent', description: 'Retrieve the status of a scheduled payment consent.', responseBody: JSON.stringify({ Data: { ConsentId: "sch-consent-001", Status: "Authorised" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/domestic-scheduled-payments', summary: 'Create Scheduled Payment', description: 'Execute a scheduled payment using an authorized consent.', requestBody: JSON.stringify({ Data: { ConsentId: "sch-consent-001", Initiation: { RequestedExecutionDateTime: "2026-04-20T00:00:00+00:00", InstructedAmount: { Amount: "100.000", Currency: "OMR" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { DomesticScheduledPaymentId: "sch-001", Status: "InitiationPending" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-scheduled-payments/{DomesticScheduledPaymentId}', summary: 'Get Scheduled Payment', description: 'Retrieve the status of a scheduled payment.', responseBody: JSON.stringify({ Data: { DomesticScheduledPaymentId: "sch-001", Status: "InitiationCompleted" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/domestic-standing-order-consents', summary: 'Create Standing Order Consent', description: 'Create a consent for a domestic standing order.', requestBody: JSON.stringify({ Data: { Permission: "Create", Initiation: { Frequency: "EvryWorkgDay", FirstPaymentDateTime: "2026-05-01T00:00:00+00:00", FirstPaymentAmount: { Amount: "200.000", Currency: "OMR" }, CreditorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "112233-44556677", Name: "Yusuf Al-Rashdi" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { ConsentId: "so-consent-001", Status: "AwaitingAuthorisation" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-standing-order-consents/{ConsentId}', summary: 'Get Standing Order Consent', description: 'Retrieve the status of a standing order consent.', responseBody: JSON.stringify({ Data: { ConsentId: "so-consent-001", Status: "Authorised" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/domestic-standing-orders', summary: 'Create Standing Order', description: 'Execute a standing order using an authorized consent.', requestBody: JSON.stringify({ Data: { ConsentId: "so-consent-001", Initiation: { Frequency: "EvryWorkgDay" } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { DomesticStandingOrderId: "so-001", Status: "InitiationPending" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-standing-orders/{DomesticStandingOrderId}', summary: 'Get Standing Order', description: 'Retrieve the status of a standing order.', responseBody: JSON.stringify({ Data: { DomesticStandingOrderId: "so-001", Status: "Active" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/international-payment-consents', summary: 'Create International Payment Consent', description: 'Create a consent for an international payment.', requestBody: JSON.stringify({ Data: { Initiation: { InstructionIdentification: "intl-001", InstructedAmount: { Amount: "1000.000", Currency: "OMR" }, CurrencyOfTransfer: "USD", CreditorAccount: { SchemeName: "IBAN", Identification: "GB29NWBK60161331926819" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { ConsentId: "intl-consent-001", Status: "AwaitingAuthorisation" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/international-payment-consents/{ConsentId}', summary: 'Get International Payment Consent', description: 'Retrieve the status of an international payment consent.', responseBody: JSON.stringify({ Data: { ConsentId: "intl-consent-001", Status: "Authorised" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/international-payments', summary: 'Create International Payment', description: 'Execute an international payment using an authorized consent.', requestBody: JSON.stringify({ Data: { ConsentId: "intl-consent-001", Initiation: { InstructedAmount: { Amount: "1000.000", Currency: "OMR" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { InternationalPaymentId: "intl-001", Status: "AcceptedSettlementInProcess" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/international-payments/{InternationalPaymentId}', summary: 'Get International Payment', description: 'Retrieve the status of an international payment.', responseBody: JSON.stringify({ Data: { InternationalPaymentId: "intl-001", Status: "AcceptedSettlementCompleted" }, Links: {}, Meta: {} }, null, 2) },
  ],
  cof: [
    { method: 'POST', path: '/funds-confirmation-consents', summary: 'Create Funds Confirmation Consent', description: 'Create a consent that allows a CBPII to check funds availability for a specific account.', requestBody: JSON.stringify({ Data: { DebtorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "112233-00112233", Name: "Ahmed Al-Busaidi" }, ExpirationDateTime: "2026-12-31T00:00:00+00:00" } }, null, 2), responseBody: JSON.stringify({ Data: { ConsentId: "cof-consent-001", Status: "AwaitingAuthorisation", DebtorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "112233-00112233" } }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/funds-confirmation-consents/{ConsentId}', summary: 'Get Funds Confirmation Consent', description: 'Retrieve the status and details of a funds confirmation consent.', responseBody: JSON.stringify({ Data: { ConsentId: "cof-consent-001", Status: "Authorised" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'DELETE', path: '/funds-confirmation-consents/{ConsentId}', summary: 'Delete Funds Confirmation Consent', description: 'Revoke an existing funds confirmation consent.', responseBody: '// 204 No Content' },
    { method: 'POST', path: '/funds-confirmations', summary: 'Create Funds Confirmation', description: 'Check whether funds are available in the debtor account for the specified amount.', requestBody: JSON.stringify({ Data: { ConsentId: "cof-consent-001", Reference: "purchase-ref-001", InstructedAmount: { Amount: "250.000", Currency: "OMR" } } }, null, 2), responseBody: JSON.stringify({ Data: { FundsConfirmationId: "cof-001", ConsentId: "cof-consent-001", CreationDateTime: "2026-04-12T10:00:00+00:00", FundsAvailable: true, Reference: "purchase-ref-001", InstructedAmount: { Amount: "250.000", Currency: "OMR" } }, Links: {}, Meta: {} }, null, 2) },
  ],
  vrp: [
    { method: 'POST', path: '/domestic-vrp-consents', summary: 'Create VRP Consent', description: 'Create a consent for variable recurring payments. The consent defines the maximum parameters for individual payments.', requestBody: JSON.stringify({ Data: { ControlParameters: { MaximumIndividualAmount: { Amount: "100.000", Currency: "OMR" }, MaximumIndividualFrequency: { Amount: "1000.000", Currency: "OMR" }, PeriodicLimits: [{ PeriodType: "Month", PeriodAlignment: "Calendar", Amount: "500.000", Currency: "OMR" }] }, Initiation: { CreditorAccount: { SchemeName: "SortCodeAccountNumber", Identification: "112233-44556677", Name: "Savings Account" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { ConsentId: "vrp-consent-001", Status: "AwaitingAuthorisation", ControlParameters: { MaximumIndividualAmount: { Amount: "100.000", Currency: "OMR" } } }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-vrp-consents/{ConsentId}', summary: 'Get VRP Consent', description: 'Retrieve the status and details of a VRP consent.', responseBody: JSON.stringify({ Data: { ConsentId: "vrp-consent-001", Status: "Authorised" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'DELETE', path: '/domestic-vrp-consents/{ConsentId}', summary: 'Revoke VRP Consent', description: 'Revoke an active VRP consent. Future payments under this consent will be rejected.', responseBody: '// 204 No Content' },
    { method: 'GET', path: '/domestic-vrp-consents/{ConsentId}/funds-confirmation', summary: 'VRP Funds Confirmation', description: 'Check funds availability for a potential VRP payment.', responseBody: JSON.stringify({ Data: { FundsAvailableResult: { FundsAvailableDateTime: "2026-04-12T10:00:00+00:00", FundsAvailable: true } }, Links: {}, Meta: {} }, null, 2) },
    { method: 'POST', path: '/domestic-vrps', summary: 'Create VRP Payment', description: 'Execute a variable recurring payment using an authorized VRP consent.', requestBody: JSON.stringify({ Data: { ConsentId: "vrp-consent-001", PSUAuthenticationMethod: "SCA", Initiation: { InstructedAmount: { Amount: "75.000", Currency: "OMR" } } }, Risk: {} }, null, 2), responseBody: JSON.stringify({ Data: { DomesticVRPId: "vrp-001", ConsentId: "vrp-consent-001", Status: "AcceptedSettlementInProcess" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/domestic-vrps/{DomesticVRPId}', summary: 'Get VRP Payment', description: 'Retrieve the status of a variable recurring payment.', responseBody: JSON.stringify({ Data: { DomesticVRPId: "vrp-001", Status: "AcceptedSettlementCompleted" }, Links: {}, Meta: {} }, null, 2) },
  ],
  events: [
    { method: 'POST', path: '/event-subscriptions', summary: 'Create Event Subscription', description: 'Subscribe to event notifications. Specify the event types and the callback URL for delivering notifications.', requestBody: JSON.stringify({ Data: { CallbackUrl: "https://tpp.example.com/webhooks/ob-events", Version: "4.0", EventTypes: ["urn:uk:org:openbanking:events:resource-update", "urn:uk:org:openbanking:events:consent-authorization-revoked"] } }, null, 2), responseBody: JSON.stringify({ Data: { EventSubscriptionId: "evt-sub-001", CallbackUrl: "https://tpp.example.com/webhooks/ob-events", Version: "4.0", EventTypes: ["urn:uk:org:openbanking:events:resource-update"] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'GET', path: '/event-subscriptions', summary: 'Get Event Subscriptions', description: 'Retrieve all active event subscriptions for the TPP.', responseBody: JSON.stringify({ Data: { EventSubscription: [{ EventSubscriptionId: "evt-sub-001", CallbackUrl: "https://tpp.example.com/webhooks/ob-events", Version: "4.0" }] }, Links: {}, Meta: {} }, null, 2) },
    { method: 'PUT', path: '/event-subscriptions/{EventSubscriptionId}', summary: 'Update Event Subscription', description: 'Update an existing event subscription configuration.', requestBody: JSON.stringify({ Data: { CallbackUrl: "https://tpp.example.com/webhooks/v2/ob-events", Version: "4.0", EventTypes: ["urn:uk:org:openbanking:events:resource-update"] } }, null, 2), responseBody: JSON.stringify({ Data: { EventSubscriptionId: "evt-sub-001", CallbackUrl: "https://tpp.example.com/webhooks/v2/ob-events" }, Links: {}, Meta: {} }, null, 2) },
    { method: 'DELETE', path: '/event-subscriptions/{EventSubscriptionId}', summary: 'Delete Event Subscription', description: 'Remove an event subscription. No further notifications will be sent.', responseBody: '// 204 No Content' },
    { method: 'POST', path: '/events', summary: 'Poll Events', description: 'Poll for pending event notifications. Returns events that have not been acknowledged.', requestBody: JSON.stringify({ returnImmediately: true, maxEvents: 10 }, null, 2), responseBody: JSON.stringify({ sets: { "evt-001": "eyJhbGciOiJSUzI1NiIsInR5cCI6InNlY2V2ZW50K2p3dCJ9..." }, moreAvailable: false }, null, 2) },
    { method: 'POST', path: '/events/aggregated-polling', summary: 'Aggregated Event Polling', description: 'Poll and acknowledge events in a single request. Acknowledge previously received events and request new ones.', requestBody: JSON.stringify({ returnImmediately: true, maxEvents: 5, ack: ["evt-001"], setErrs: {} }, null, 2), responseBody: JSON.stringify({ sets: {}, moreAvailable: false }, null, 2) },
    { method: 'GET', path: '/callback-urls', summary: 'Get Callback URLs', description: 'Retrieve registered callback URLs for the TPP application.', responseBody: JSON.stringify({ Data: { CallbackUrl: [{ CallbackUrlId: "cb-001", Url: "https://tpp.example.com/webhooks/ob-events", Version: "4.0" }] }, Links: {}, Meta: {} }, null, 2) },
  ],
  // ─────────────────────────────────────────────────────────────
  // Open Finance — Auto Loan Origination (Bank Dhofar proprietary, beyond OBIE)
  // ─────────────────────────────────────────────────────────────
  'auto-lending': [
    { method: 'POST', path: '/tpp/sandbox-signup', summary: 'Sandbox dealer self-signup', description: 'Self-serve registration for sandbox. Returns client_id + client_secret + webhook_secret — shown once. Production onboarding requires a signed TPP agreement.', requestBody: JSON.stringify({ dealer_name: "Muscat Motors", cr_number: "CR-1234567", rop_dealer_code: "ROP-DLR-0042", webhook_url: "https://dealer.example.com/bd-webhook", contact_email: "integrations@dealer.example.com" }, null, 2), responseBody: JSON.stringify({ tpp_id: "sb-muscat-motors-a3f9", client_id: "sb-muscat-motors-a3f9", client_secret: "<shown-once>", webhook_secret: "<shown-once>", note: "Store secrets immediately — they are not retrievable." }, null, 2) },
    { method: 'POST', path: '/loan-applications', summary: 'Create loan application + QR', description: 'Create a loan application on behalf of a customer standing at the showroom. Returns a QR payload that the customer scans with the Bank Dhofar mobile app to approve data-sharing and see their pre-approval offer.', requestBody: JSON.stringify({ dealer_reference: "SB-2026-04-15-00042", branch_code: "SB-SEEB-02", salesperson_email: "ahmed@muscatmotors.com", vehicle: { vin: "KMHJ3816FBA012345", make: "Hyundai", model: "Creta", year: 2026, condition: "new", price: { amount: "12000.000", currency: "OMR" } }, requested_amount: { amount: "9600.000", currency: "OMR" }, down_payment: { amount: "2400.000", currency: "OMR" }, requested_tenor_months: 60 }, null, 2), responseBody: JSON.stringify({ application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", dealer_id: "muscat-motors", status: "pending_consent", qr: { payload: "https://banking.tnd.bankdhofar.com/loan/scan?a=a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83&d=muscat-motors", expires_at: "2026-04-15T08:22:00Z" }, vehicle: { make: "Hyundai", model: "Creta", year: 2026, condition: "new", price: { amount: "12000.000", currency: "OMR" } }, requested_amount: { amount: "9600.000", currency: "OMR" }, down_payment: { amount: "2400.000", currency: "OMR" }, requested_tenor_months: 60, environment: "sandbox", created_at: "2026-04-15T08:12:00Z", updated_at: "2026-04-15T08:12:00Z" }, null, 2) },
    { method: 'GET', path: '/loan-applications', summary: 'List dealer applications', description: 'Paginated list of this dealer\'s applications. Filterable by status and creation time.', responseBody: JSON.stringify({ items: [{ application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", status: "disbursed", requested_amount: { amount: "9600.000", currency: "OMR" } }], next_cursor: null }, null, 2) },
    { method: 'GET', path: '/loan-applications/{application_id}', summary: 'Get application', description: 'Fetch current application state. Poll during the showroom flow — or prefer webhooks for push notifications.', responseBody: JSON.stringify({ application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", status: "decided", decision: { decision: "approved", approved_amount: { amount: "9600.000", currency: "OMR" }, interest_rate: 5.5, tenor_months: 60, monthly_installment: { amount: "183.453", currency: "OMR" }, total_repayable: { amount: "11007.180", currency: "OMR" }, decided_at: "2026-04-15T08:12:30Z", valid_until: "2026-04-15T08:22:30Z" } }, null, 2) },
    { method: 'POST', path: '/loan-applications/{application_id}/cancel', summary: 'Cancel application', description: 'Cancel a pending application. Terminal once disbursed.', requestBody: JSON.stringify({ reason: "Customer changed their mind" }, null, 2), responseBody: JSON.stringify({ application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", status: "cancelled" }, null, 2) },
    { method: 'GET', path: '/loan-applications/{application_id}/decision', summary: 'Get decision', description: 'Fetch the decision detail (rates, DBR calc, score band, decline reasons if declined).', responseBody: JSON.stringify({ decision_id: "d-abc123", application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", decision: "approved", approved_amount: { amount: "9600.000", currency: "OMR" }, interest_rate: 5.5, tenor_months: 60, monthly_installment: { amount: "183.453", currency: "OMR" }, total_repayable: { amount: "11007.180", currency: "OMR" }, total_interest: { amount: "1407.180", currency: "OMR" }, income_monthly: { amount: "1850.000", currency: "OMR" }, existing_debt_monthly: { amount: "120.000", currency: "OMR" }, dbr_before: 0.0649, dbr_after: 0.1641, credit_score: 725, score_band: "near_prime", engine_version: "v1.0.0", decided_at: "2026-04-15T08:12:30Z", valid_until: "2026-04-15T08:22:30Z" }, null, 2) },
    { method: 'GET', path: '/loan-applications/{application_id}/contract', summary: 'Get signed contract', description: 'Retrieve the signed contract summary after the customer accepts the offer and signs.', responseBody: JSON.stringify({ contract_id: "c-xyz789", application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", customer_id: "CUST-002", signed_at: "2026-04-15T08:14:00Z", signature_method: "otp_biometric", terms: { principal: { amount: "9600.000", currency: "OMR" }, interest_rate: 5.5, tenor_months: 60, monthly_installment: { amount: "183.453", currency: "OMR" }, total_repayable: { amount: "11007.180", currency: "OMR" }, first_payment_date: "2026-05-15" } }, null, 2) },
    { method: 'GET', path: '/loan-applications/{application_id}/disbursement', summary: 'Get disbursement status', description: 'Check whether funds have been moved to the dealer account.', responseBody: JSON.stringify({ disbursement_id: "db-abc001", application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", contract_id: "c-xyz789", amount: { amount: "9600.000", currency: "OMR" }, dealer_account_id: "DHOF-30001", status: "completed", transaction_id: "TXN-20260415-abcd1234", executed_at: "2026-04-15T08:14:03Z" }, null, 2) },
    { method: 'GET', path: '/webhooks/me', summary: 'Get webhook config', description: 'Current webhook URL + event list for this dealer.', responseBody: JSON.stringify({ webhook_url: "https://dealer.example.com/bd-webhook", events: ["loan_application.decided", "loan_application.declined", "loan_application.contracted", "loan_application.disbursed", "loan_application.expired", "loan_application.cancelled"] }, null, 2) },
    { method: 'PUT', path: '/webhooks/me', summary: 'Update webhook URL', description: 'Change the URL Bank Dhofar POSTs events to. The webhook secret is rotated separately via /webhooks/rotate-secret.', requestBody: JSON.stringify({ webhook_url: "https://dealer.example.com/bd-webhook-v2" }, null, 2), responseBody: JSON.stringify({ webhook_url: "https://dealer.example.com/bd-webhook-v2", events: ["loan_application.decided", "loan_application.disbursed"] }, null, 2) },
    { method: 'POST', path: '/webhooks/rotate-secret', summary: 'Rotate webhook secret', description: 'Generate a new HMAC signing secret. Returns the new secret once — it is not retrievable afterwards.', responseBody: JSON.stringify({ webhook_secret: "<new-secret-shown-once>" }, null, 2) },
    { method: 'POST', path: '/webhooks/replay/{webhook_id}', summary: 'Replay webhook', description: 'Manually re-queue a previous failed webhook delivery.', responseBody: JSON.stringify({ webhook_id: "wh-123", event_type: "loan_application.disbursed", status: "pending", delivery_attempts: 3 }, null, 2) },
    { method: 'GET', path: '/webhooks/deliveries', summary: 'List webhook deliveries', description: 'Audit trail of all delivery attempts to this dealer.', responseBody: JSON.stringify({ items: [{ webhook_id: "wh-123", event_type: "loan_application.disbursed", application_id: "a0b3a298-2df6-4ef8-b2a4-4cb9a9052f83", status: "delivered", delivery_attempts: 1, delivered_at: "2026-04-15T08:14:05Z", last_response_code: 200 }] }, null, 2) },
    { method: 'GET', path: '/healthz', summary: 'Liveness probe', description: 'Service health check. No auth required.', responseBody: JSON.stringify({ status: "ok", version: "1.0.0" }, null, 2) },
    { method: 'GET', path: '/readyz', summary: 'Readiness probe', description: 'Verifies backend dependencies (Postgres, Redis) are reachable.', responseBody: JSON.stringify({ status: "ready", checks: { database: { ok: true, error: null }, redis: { ok: true, error: null } } }, null, 2) },
  ],
  // ─────────────────────────────────────────────────────────────
  // EasyBiz — Partner Service (Hylobiz virtual-account passthrough)
  // External passthrough to easybiz.dob.bankdhofar.com
  // ─────────────────────────────────────────────────────────────
  // Backend: https://easybiz.dob.bankdhofar.com:1650 (per spec §1.1).
  // Paths are case-sensitive: token + legacy VA use /Api/, all others use /api/.
  easybiz: [
    { method: 'POST', path: '/Api/v1.0/oauth2GetToken', summary: 'Get OAuth2 token', description: 'Obtain an EasyBiz access token via OAuth2 client_credentials. Bank Dhofar authenticates the caller at the gateway (OAuth2 client_credentials + mTLS) and relays the request to the EasyBiz backend. Token expires in 3600 seconds. No consent is required.', requestBody: JSON.stringify({ grant_type: "client_credentials", client_id: "hylo_470_5e5c41222d17ce4d", client_secret: "<client_secret>", scope: "payment:write" }, null, 2), responseBody: JSON.stringify({ access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", token_type: "Bearer", expires_in: 3600, scope: "payment:write" }, null, 2) },
    { method: 'POST', path: '/api/v1.0/CreateContact', summary: 'Create customer', description: 'Create a new customer/contact and return a virtual account number (VPA). Requires Bearer token + mTLS. Request body is AES-256 encrypted in the Data field per spec §1.1.', requestBody: JSON.stringify({ CompanyId: "415", ContactEmail: "john@gmail.com", ContactMobile: "67111101", Mobile: "H.891999920", ContactBizName: "BritannicaEnterprise", ContactFullName: "john", Address1: "AS1", City: "Cbd", State: "Ruwi", Country: "Oman", PostalCode: "2992" }, null, 2), responseBody: JSON.stringify({ Code: "0", Message: "Contact created successfully.", Status: "APPROVED", Contact: { Id: "983", LedgerLink: "iqQ6B39t", Mobile: "6578934", OpeningBalance: "0" }, VPA: "0603143010351739" }, null, 2) },
    { method: 'POST', path: '/api/v1.0/UpdateContact', summary: 'Update customer', description: 'Update an existing customer/contact. Requires Bearer token + mTLS. Either ContactEmail or ContactMobile must be provided alongside ContactId, CompanyId and Mobile.', requestBody: JSON.stringify({ ContactId: "841", CompanyId: "415", Mobile: "H.891999920", ContactEmail: "john1@gmail.com", ContactMobile: "24833083", ContactBizName: "britannica enterprises", ContactFullName: "john" }, null, 2), responseBody: JSON.stringify({ Code: "0", Message: "Contact updated successfully.", Status: "APPROVED", Contact: { Id: "841", LedgerLink: "RyovWajv", Mobile: "24833083", Email: "john1@gmail.com" } }, null, 2) },
    { method: 'POST', path: '/api/v1.0/fetchVirtualAccount', summary: 'Fetch virtual account', description: 'Retrieve the virtual account number (VPA) for an existing contact. Requires Bearer token + mTLS.', requestBody: JSON.stringify({ ContactId: "795" }, null, 2), responseBody: JSON.stringify({ Code: "0", Message: "Contact account number fetched successfully.", Status: "APPROVED", Contact: { Id: "795", VPA: "0702617" } }, null, 2) },
    { method: 'POST', path: '/api/v1.0/Payment', summary: 'Collect payment (basic)', description: 'Create a basic payment link for collecting a payment. Requires Bearer token + mTLS. Returns a short_url the payer can use to pay.', requestBody: JSON.stringify({ orderId: "INV1001", amount: "100", customer_name: "TEST ACCOUNT PVT LTD", customer_mobile: "919999999999", customer_email: "testaccount@example.com", currency: "OMR", expire_by: 1691097057, sms_notify: true, email_notify: true, partial_payment: true, dueDate: "2022-05-24" }, null, 2), responseBody: JSON.stringify({ code: "0", message: "Payment link created successfully", status: "CREATED", hyloRefNo: "PAY123456", currency: "OMR", short_url: "https://pay.bankdhofar.com/p/abc123", order_id: "INV1001", amount: "100", amount_due: "100", amount_paid: "0", customer_name: "TEST ACCOUNT PVT LTD" }, null, 2) },
    { method: 'POST', path: '/api/v1.0/createInvoice', summary: 'Collect payment (detailed invoice)', description: 'Create a detailed invoice with line items, taxes, discounts and charges, and optionally generate a payment link. Requires Bearer token + mTLS.', requestBody: JSON.stringify({ orderId: "ORD-2024-001", title: "Order ORD-2024-001", contactMobile: "919999999999", contactEmail: "buyer@example.com", contactFullName: "Buyer Name", chargeApplyType: "Item Level", items: [{ id: "1", name: "Widget", units: "pcs", quantity: "2", sellingPrice: "50", totalAmount: "100" }], subTotal: "100", totalTax: "0", totalDiscount: "0", totalAmount: "100", currency: "OMR", generatePaymentLink: "yes", DueDate: "2024-12-31" }, null, 2), responseBody: JSON.stringify({ code: "0", message: "Invoice created successfully", status: "CREATED", hyloRefNo: "INV789012", invoice_url: "https://invoice.bankdhofar.com/v/xyz789", short_url: "https://pay.bankdhofar.com/p/xyz789", order_id: "ORD-2024-001" }, null, 2) },
    { method: 'POST', path: '/api/v1.0/PaymentStatus', summary: 'Check payment status', description: 'Retrieve the current status of a payment by orderId. Requires Bearer token + mTLS.', requestBody: JSON.stringify({ orderId: "INV1001" }, null, 2), responseBody: JSON.stringify({ code: "0", message: "Payment status retrieved", paymentDetails: { code: "0", message: "SUCCESS", txStatus: "COMPLETED", txTime: "2024-01-15T10:30:00Z", paymentStatus: "PAID", currency: "OMR", paymentMode: "CARD", referenceId: "TXN123456789", orderAmount: "100.000", remainingAmount: "0.000" } }, null, 2) },
    { method: 'POST', path: '/api/v1.0/UpdatePayment', summary: 'Update payment', description: 'Update an existing payment record (e.g. for cash or cheque payments). Requires Bearer token + mTLS.', requestBody: JSON.stringify({ orderId: "INV1001", paymentMode: "CASH", amount: "100", status: "PAID", refNo: "", settlementDate: "", bankName: "" }, null, 2), responseBody: JSON.stringify({ code: "0", message: "Payment updated successfully", status: "SUCCESS" }, null, 2) },
    { method: 'POST', path: '/api/v1.0/CancelPayment', summary: 'Cancel payment', description: 'Cancel an existing payment link by orderId. Requires Bearer token + mTLS.', requestBody: JSON.stringify({ orderId: "INV1001" }, null, 2), responseBody: JSON.stringify({ code: "0", type: "SUCCESS", message: "Payment cancelled successfully" }, null, 2) },
    { method: 'POST', path: '/Api/v1.0/generate-virtual-account', summary: 'Generate virtual account (legacy)', description: 'Legacy virtual-account generation endpoint, retained for backward compatibility. This is an external passthrough: Bank Dhofar authenticates the caller (OAuth2 client_credentials + mTLS), then relays the request to the EasyBiz backend (easybiz.dob.bankdhofar.com) and returns its response verbatim. No consent is required. Prefer CreateContact / fetchVirtualAccount for new integrations.', requestBody: JSON.stringify({ partner_id: "HYLO-PARTNER-001", customer_name: "Al Madina Trading LLC", customer_reference: "CUST-REF-88231", currency: "OMR", purpose: "collections" }, null, 2), responseBody: JSON.stringify({ virtual_account_number: "OM93BDOF0001234567890123", iban: "OM93BDOF0001234567890123", partner_id: "HYLO-PARTNER-001", customer_reference: "CUST-REF-88231", currency: "OMR", status: "active", created_at: "2026-06-07T09:30:00Z", source: "easybiz.dob.bankdhofar.com" }, null, 2) },
  ],
  // ─────────────────────────────────────────────────────────────
  // Corporate Banking (DEH) — external passthrough to channels-at.uatd.bankdhofar.com
  // Spec §2 (2.2–2.10). Caller hits /corporate/<subpath>; the gateway strips
  // /corporate/ to root and relays to the DEH backend. Auth: OAuth2
  // client_credentials + mTLS at the gateway; DEH OAuth bearer carried by caller.
  // ─────────────────────────────────────────────────────────────
  corporate: [
    { method: 'POST', path: '/openauth/v2/oauth/token', summary: 'Token generation', description: 'Generate an OAuth2 access token for authenticating subsequent Corporate Banking calls (spec §2.2). External passthrough: Bank Dhofar authenticates the caller at the gateway (OAuth2 client_credentials + mTLS) and relays the request to the DEH backend (channels-at.uatd.bankdhofar.com). Body is x-www-form-urlencoded. No consent is required.', requestBody: JSON.stringify({ grant_type: "password", client_id: "86b90fd562c0b4b0cb14", client_secret: "<client_secret>", bank_id: "025", channel_id: "I", username: "MUATCORP.MAKER1", password: "<password>", language_id: "001", login_type: "02", custom_data: "Y" }, null, 2), responseBody: JSON.stringify({ access_token: "4192dbb88915fcbcfaaa77b180572687bf75d50e8c57a66ae4ebc50f2bbc2211", token_type: "Bearer", expires_in: 3599, user: { userId: "MAKER1", userType: "2", corporateId: "MUATCORP", uniqueId: "efb43cae8caf67b730aef72726b8ee3591b6f954" } }, null, 2) },
    { method: 'GET', path: '/dehadmin/rest/v1/banks/{bankid}/corporates/{corpid}/users/{userid}/custom-operativeaccounts/accountsummarylist', summary: 'Operative account listing', description: 'Retrieve the list of operative (current/savings) accounts for the corporate customer (spec §2.3). Requires Bearer token. Query parameter accountCurrency (e.g. OMR) is required. Passthrough to DEH.', responseBody: JSON.stringify({ header: { status: { message: [{ message_TYPE: "SU", messageDesc: "SUCCESS", messageCode: "0000" }] }, pagination: { totalRecordCount: "12", hasMoreRecords: "N", numRecReturned: "12" } }, data: [{ accountId: "01040007431002", accountName: "OMAN INVESTMENT FINANCE CO", accountStatus: { codeType: "ACS", cmCode: "O", codeDescription: "Active" }, accountCurrency: { codeType: "CRN", cmCode: "OMR", codeDescription: "OMR" }, balances: [{ type: "totalBalance", amountDetails: { amount: 20348.648, currency: "OMR" } }, { type: "availableBalance", amountDetails: { amount: 20348.648, currency: "OMR" } }] }] }, null, 2) },
    { method: 'GET', path: '/dehadmin/rest/v1/banks/{bankid}/corporates/{corpid}/users/{userid}/custom-operativeaccounts/{accountId}', summary: 'Account balance inquiry', description: 'Retrieve detailed balance information for a specific account (spec §2.4). Requires Bearer token. Passthrough to DEH.', responseBody: JSON.stringify({ accountId: "01040007431004", accountName: "OMAN INVESTMENT FINANCE CO", accountCurrency: { codeType: "CRN", cmCode: "OMR", codeDescription: "OMR" }, branchCode: "009", customerId: "0007431", availableBalance: { amount: -223895.525, currency: "OMR" }, accountBalance: { amount: -223895.525, currency: "OMR" }, ledgerBalance: { amount: 0.0, currency: "OMR" }, lienBalance: { amount: 770376.039, currency: "OMR" }, modeOfOperation: "SOLE" }, null, 2) },
    { method: 'GET', path: '/dehadmin/rest/v1/banks/{bankid}/corporates/{corpid}/custom-all-counterparties', summary: 'Beneficiary listing', description: 'Retrieve the list of registered beneficiaries/counterparties for the corporate customer (spec §2.5). Requires Bearer token. Query parameter payeeType (AL=All, WB=Within Bank, WO=Within Oman) is required. Passthrough to DEH.', responseBody: JSON.stringify([{ counterpartyId: 628, counterpartyName: "UATBAHARIN1", counterpartyNickname: "UATBAHARIN1", accountId: "12345678", bankDetails: { isExistingBank: "Y", bankIdentifier: "BMAGBHBMXXX", bankName: "CENTRAL BANK OF BAHRAIN", country: { codeType: "CNT", cmCode: "BH", codeDescription: "BAHRAIN" } }, accountCurrency: "BHD", creationDate: "2024-10-21T08:40:45Z" }], null, 2) },
    { method: 'POST', path: '/dehadmin/rest/v3/banks/{bankid}/corporates/{corpid}/users/{userid}/custom-multientrytransactionswithlimitedfieldrequests', summary: 'Fund transfer', description: 'Initiate fund transfers including Own Account (OWN), Within Bank (TPA) and Within Oman (PMT) transfers (spec §2.6). Requires Bearer token + a ChannelContext header carrying authorization details. Passthrough to DEH. transactionType: OWN=Self, TPA=Within Bank, PMT=Other Bank.', requestBody: JSON.stringify({ transactionCurrency: "OMR", transactionType: "TPA", transactionDate: "2025-01-14T20:00:00", entryDetails: [{ initiatorAccount: "01040125856001", amount: 121, remarks: "SELFSAMECURRENCY5", payeeAccountDetails: { counterpartyAccount: "01040125856002" }, counterpartyType: "O" }] }, null, 2), responseBody: JSON.stringify({ frequencyType: { id: "O", description: "One Time" }, transactionDate: "2025-01-14T20:00:00Z", transactionType: { codeType: "TTP", cmCode: "OWN", codeDescription: "Self transfer" }, commonSection: { numberOfEntries: "1", totalAmount: "121.0", requestReferenceId: 1467501, transactionReferenceId: 1443700, transactionStatus: { codeType: "ALS", cmCode: "SUC", codeDescription: "Success" } } }, null, 2) },
    { method: 'GET', path: '/dehadmin/rest/v1/banks/{bankid}/corporates/{corpid}/users/{userid}/custom-operativeaccounts/{accountId}/ministatement', summary: 'Mini statement', description: 'Retrieve the last N transactions for an account (spec §2.7). Requires Bearer token. Query parameter lastNTransactions (e.g. 15) is required. Passthrough to DEH.', responseBody: JSON.stringify([{ transactionDate: "2024-11-14T02:01:00Z", amountType: { codeType: "ACT", cmCode: "05", codeDescription: "DEBIT" }, amount: { amount: 100.0, currency: "OMR" }, transactionRemarks: "IB-TF-ok-1535-1", transactionBalance: { amount: 20027.607, currency: "OMR" }, lastTransactionId: "SD7381063", availableBalance: { amount: 19092.607, currency: "OMR" } }], null, 2) },
    { method: 'GET', path: '/dehadmin/rest/v1/banks/{bankid}/corporates/{corpid}/users/{userid}/custom-operativeaccounts/{accountId}/transactions', summary: 'Transaction history', description: 'Retrieve transaction history for an account within a date range (spec §2.8). Requires Bearer token. Query parameters transactionValue and transactionDate (URL-encoded JSON {"lt":...,"gt":...}) are required. Passthrough to DEH.', responseBody: JSON.stringify([{ transactionDate: "14-11-2024", accountId: "01130605347002", amountType: { codeType: "ACT", cmCode: "05", codeDescription: "DEBIT" }, amount: { amount: 20.0, currency: "OMR" }, transactionRemarks: "IB-TF-TEST-2723-1SAIMK-TEST", transactionBalance: { amount: 2445.53, currency: "OMR" }, transactionId: "SD7381061", valueDate: "17-11-2024" }], null, 2) },
    { method: 'GET', path: '/dehadmin/rest/v1/banks/{bankid}/corporates/{corpid}/users/{userid}/customdepositaccounts', summary: 'Deposit account listing', description: 'Retrieve the list of deposit (term deposit) accounts (spec §2.9). Requires Bearer token. Passthrough to DEH.', responseBody: JSON.stringify([{ accountId: "01030007431017", accountName: "OMAN INVESTMENT FINANCE CO", accountStatus: { codeType: "ACS", cmCode: "A", codeDescription: "Active" }, accountCurrency: { codeType: "CRN", cmCode: "OMR", codeDescription: "OMR" }, accountType: { codeType: "ACNT", cmCode: "TDA", codeDescription: "TERM DEPOSIT" }, balances: [{ type: "maturityAmount", amountDetails: { amount: 578.481, currency: "OMR" } }, { type: "depositAmount", amountDetails: { amount: 544.0, currency: "OMR" } }], interestRate: 4.75, maturityDate: "21-01-2026" }], null, 2) },
    { method: 'GET', path: '/dehadmin/rest/v1/banks/{bankid}/corporates/{corpid}/users/{userid}/custom-loanaccounts', summary: 'Loan account listing', description: 'Retrieve the list of loan accounts (spec §2.10). Requires Bearer token. Passthrough to DEH.', responseBody: JSON.stringify([{ accountId: "01060007431276", accountName: "OMAN INVESTMENT FINANCE CO", accountStatus: { codeType: "ACS", cmCode: "O", codeDescription: "Open" }, accountCurrency: { codeType: "CRN", cmCode: "OMR", codeDescription: "OMR" }, accountType: { codeType: "ACNT", cmCode: "CLA", codeDescription: "COMMERCIAL LENDING" }, balances: [{ type: "disbursedAmount", amountDetails: { amount: 2000000.0, currency: "OMR" } }, { type: "dueAmount", amountDetails: { amount: -900000.0, currency: "OMR" } }], interestRate: 0.0 }], null, 2) },
  ],
  // ─────────────────────────────────────────────────────────────
  // E-Mandate Services — external passthrough to emandate.uat.bankdhofar.com
  // Spec §3 (3.2–3.10). Caller hits /emandate/<subpath>; the gateway strips
  // /emandate/ to root and relays to the E-Mandate backend. Auth: OAuth2
  // client_credentials + mTLS at the gateway; E-Mandate OIDC bearer carried by caller.
  // ─────────────────────────────────────────────────────────────
  emandate: [
    { method: 'POST', path: '/api/token', summary: 'Authentication', description: 'Obtain an access token for E-Mandate Services (spec §3.2). E-Mandate is secured using Keycloak OpenID Connect. External passthrough: Bank Dhofar authenticates the caller at the gateway (OAuth2 client_credentials + mTLS) and relays the request to the E-Mandate backend (emandate.uat.bankdhofar.com). All subsequent calls carry Authorization: Bearer <access_token>. No consent is required.', requestBody: JSON.stringify({ clientId: "D4E7F9A1B2C34567A8B9C0D12345EFGH", username: "corpuser001", password: "<password>", grantType: "password" }, null, 2), responseBody: JSON.stringify({ access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...", token_type: "Bearer", expires_in: 3600 }, null, 2) },
    { method: 'POST', path: '/api/v1/companies/register', summary: 'Company registration', description: 'Register a financial institute as a creditor in the mandate system (spec §3.3). Requires Bearer token. The returned prefix (e.g. "UNF1") must be used as the first 4 characters of every subsequent request ID. Passthrough to E-Mandate.', requestBody: JSON.stringify({ name: "United Finance SOAG", addressLine1: "Ruwi Street 12", city: "Muscat", postalCode: "113", country: "OM" }, null, 2), responseBody: JSON.stringify({ id: "27507061-3b84-4aeb-a694-2f526d1bb755", name: "United Finance SOAG", postalCode: "113", country: "OM", prefix: "UNF1", createdAt: null }, null, 2) },
    { method: 'POST', path: '/api/v1/mandate/initiate', summary: 'Initiate mandate', description: 'Initiate a new mandate request for recurring payments (spec §3.4). Requires Bearer token. mandateRequestId is unique (max 35 chars). sequenceType RCUR/OOFF; frequencyType DAIL/WEEK/MNTH/YEAR; mandateType REVOCABLE/IRREVOCABLE. Passthrough to E-Mandate.', requestBody: JSON.stringify({ mandateRequestId: "UNF1-MNDTd4-1493", creationDateTime: "2025-05-14T11:29:00", sequenceType: "RCUR", frequencyType: "DAIL", startDate: "2025-05-17+04:00", endDate: "2025-05-31+04:00", collectionAmount: 50.0, currency: "11", creditorName: "UNITED FINANCE SOAG", creditorAccountNumber: "62W23140", creditorBankCode: "BDOFOMRU", debtorName: "AHMED MOHAMMED ALI", debtorMobile: "12687335", debtorAccountNumber: "01010603143001", debtorBankCode: "BDOFOMRU", mandateType: "REVOCABLE", autoPost: false }, null, 2), responseBody: JSON.stringify({ success: true, code: "OK", message: "Request received successfully", data: { requestId: "UNF1-MNDTd4-1493", eventType: "MNDTINIT", status: "RAISED" } }, null, 2) },
    { method: 'POST', path: '/api/v1/mandate/amend', summary: 'Amend mandate', description: 'Amend an existing mandate (spec §3.5). Requires Bearer token. Passthrough to E-Mandate.', requestBody: JSON.stringify({ mandateRequestId: "76800298b189", mandateId: "5ea4fdd5d25ff", creDtTm: "2024-10-02T10:48:09", amendmentReasonCode: "4", amendmentAdditionalInfo: "Additional Info", sequenceType: "RCUR", frequencyType: "MNTH", fromDate: "2024-10-02", toDate: "2025-10-02", collectionAmount: 50, currency: "OMR", autoPost: false, initiatedBy: "UserName", mandateType: "AMENDMENT", numberOfPayments: 11 }, null, 2), responseBody: JSON.stringify({ success: true, code: "OK", message: "Request received successfully", data: { requestId: "76800298b189", eventType: "MNDTAMEND", status: "RAISED" } }, null, 2) },
    { method: 'POST', path: '/api/v1/mandate/terminate', summary: 'Mandate termination', description: 'Terminate/cancel an existing mandate (spec §3.6). Requires Bearer token. Passthrough to E-Mandate.', requestBody: JSON.stringify({ mandateRequestId: "MNDTCXLREQ123467", creDtTm: "2024-10-02T09:29:50", cancellationReasonCode: "CUSTOMER_REQUEST", cancellationAdditionalInfo: "Customer requested cancellation due to account closure", originalMandateId: "ORGMNDT9876545" }, null, 2), responseBody: JSON.stringify({ success: true, code: "OK", message: "Request received successfully", data: { requestId: "MNDTCXLREQ123467", eventType: "MNDTTERM", status: "RAISED" } }, null, 2) },
    { method: 'POST', path: '/api/v1/mandate/acknowledgement', summary: 'Request acknowledgement', description: 'Retrieve the acknowledgement status of a mandate request (spec §3.7). Requires Bearer token. Passthrough to E-Mandate.', requestBody: JSON.stringify({ mandateRequestId: "5ea4fd5d25ff", requestType: "MNDTINIT" }, null, 2), responseBody: JSON.stringify({ success: true, code: "OK", message: "Response Received successfully", data: { mandateId: "156991391cc1", eventType: "MNDTINIT", status: "ACCEPTED" } }, null, 2) },
    { method: 'POST', path: '/api/v1/mandate/acceptance', summary: 'Request acceptance', description: 'Retrieve the final acceptance status of a mandate request (spec §3.8). Requires Bearer token. Passthrough to E-Mandate.', requestBody: JSON.stringify({ mandateId: "5ea4fd5d25ff", requestType: "MNDTINIT" }, null, 2), responseBody: JSON.stringify({ success: true, code: "OK", message: "Response Received successfully", data: { requestId: "5ea4fd5d25ff", mandateId: "5ea4fd5d25ff", eventType: "MNDTAMEND", status: "ACCEPTED", reason: "Only in case of rejected" } }, null, 2) },
    { method: 'POST', path: '/api/v1/bulk/payment/release', summary: 'Bulk payment release', description: 'Release a batch of payments for execution (spec §3.9). Requires Bearer token. Passthrough to E-Mandate.', requestBody: JSON.stringify({ BulkPaymentRequest: { BulkRequestId: "UNF2-HMDETd4-1493", Summary: { NumberOfRecords: 2, TotalAmount: 150.0, Currency: "OMR" }, Payments: [{ MandateId: "MAND12345", PaymentSequence: 1, ReleaseDate: "2025-09-01", PaymentAmount: 100.0 }, { MandateId: "MAND67890", PaymentSequence: 2, ReleaseDate: "2025-09-01", PaymentAmount: 50.0 }] } }, null, 2), responseBody: JSON.stringify({ success: true, code: "OK", message: "BulkRequest received successfully", data: { bulkRequestId: "464654654658", systemId: 8, eventType: "RELEASEBULKPAY", status: "RAISED" } }, null, 2) },
    { method: 'GET', path: '/api/v1/bulk/payment/response/{BulkRequestId}', summary: 'Bulk payment response', description: 'Retrieve the status and results of a bulk payment request (spec §3.10). Requires Bearer token. Passthrough to E-Mandate.', responseBody: JSON.stringify({ success: true, code: "OK", message: "Response received successfully", data: { Summary: { externalRequestId: "4646546546567", numberOfRecords: 2, totalAmount: "150.000", currency: "OMR", status: "PERSISTED", Payments: [{ mandateId: "MAND12345", paymentSequence: 1, releaseDate: "2025-09-01", paymentAmount: "100.000", status: "ACCEPTED", reason: "ACCEPTED" }, { mandateId: "MAND67890", paymentSequence: 2, releaseDate: "2025-09-01", paymentAmount: "50.000", status: "REJECTED", reason: "Amount should not exceed the amount of mandate" }] }, eventType: "RELEASEBULKPAY", status: "PERSISTED" } }, null, 2) },
  ],
};

function EndpointCard({ endpoint, basePath, apiId }: { endpoint: Endpoint; basePath: string; apiId: string }) {
  const [opened, { toggle }] = useDisclosure(false);
  const navigate = useNavigate();

  return (
    <Card withBorder>
      <UnstyledButton onClick={toggle} w="100%">
        <Group justify="space-between">
          <Group gap="md">
            <Badge
              w={70}
              variant="filled"
              color={METHOD_COLORS[endpoint.method]}
              size="lg"
              radius="sm"
              styles={{ root: { textTransform: 'uppercase' } }}
            >
              {endpoint.method}
            </Badge>
            <div>
              <Text ff="monospace" size="sm" fw={500}>
                {basePath}{endpoint.path}
              </Text>
              <Text size="sm" c="dimmed">{endpoint.summary}</Text>
            </div>
          </Group>
          <Group gap="xs">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconTerminal2 size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/sandbox?api=${apiId}&method=${endpoint.method}&path=${encodeURIComponent(basePath + endpoint.path)}`);
              }}
            >
              Try it
            </Button>
            {opened ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={opened}>
        <Divider my="md" />
        <Stack gap="md">
          <Text size="sm">{endpoint.description}</Text>

          {endpoint.requestBody && (
            <div>
              <Text size="sm" fw={600} mb="xs">Request Body</Text>
              <CodeBlock code={endpoint.requestBody} language="json" title="REQUEST" />
            </div>
          )}

          <div>
            <Text size="sm" fw={600} mb="xs">Response</Text>
            <CodeBlock code={endpoint.responseBody} language="json" title="RESPONSE" />
          </div>
        </Stack>
      </Collapse>
    </Card>
  );
}

export default function ApiDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const group = API_GROUPS.find((g) => g.id === groupId);
  const endpoints = groupId ? API_ENDPOINTS[groupId] || [] : [];

  if (!group) {
    return (
      <Container size="lg">
        <Text>API group not found.</Text>
        <Button variant="light" mt="md" onClick={() => navigate('/apis')}>
          Back to Catalog
        </Button>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor onClick={() => navigate('/apis')} size="sm">API Catalog</Anchor>
          <Text size="sm">{group.name}</Text>
        </Breadcrumbs>

        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <ThemeIcon size={40} radius="md" color={group.color} variant="light">
                <group.icon size={22} />
              </ThemeIcon>
              <div>
                <Group gap="xs" align="center">
                  <Title order={2}>{group.name}</Title>
                  {group.customBadge && (
                    <Badge variant="dot" color="yellow" size="md">
                      {group.customBadge}
                    </Badge>
                  )}
                </Group>
              </div>
            </Group>
            <Text c="dimmed" mt="xs" maw={700}>{group.description}</Text>
          </div>
          <Group gap="xs">
            <Badge color="gray" variant="light">{group.version}</Badge>
            <Badge color={group.color} variant="light">{endpoints.length} endpoints</Badge>
          </Group>
        </Group>

        <Card withBorder p="md" bg="gray.0">
          <Stack gap="xs">
            {group.server && (
              <Group gap="xs">
                <Text size="sm" fw={600}>Server:</Text>
                <Text size="sm" ff="monospace">{group.server}</Text>
              </Group>
            )}
            <Group gap="xs">
              <Text size="sm" fw={600}>Base Path:</Text>
              <Text size="sm" ff="monospace">{group.basePath}</Text>
            </Group>
            {group.auth && (
              <Group gap="xs">
                <Text size="sm" fw={600}>Auth:</Text>
                <Text size="sm">{group.auth}</Text>
              </Group>
            )}
          </Stack>
        </Card>

        <Stack gap="sm">
          {endpoints.map((endpoint, idx) => (
            <EndpointCard key={idx} endpoint={endpoint} basePath={group.basePath} apiId={group.id} />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
