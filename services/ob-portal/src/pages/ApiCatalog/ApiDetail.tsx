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
                <Title order={2}>{group.name}</Title>
                <Text size="sm" c="dimmed" dir="rtl" style={{ fontFamily: 'serif' }}>
                  {group.nameAr}
                </Text>
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
          <Group gap="xs">
            <Text size="sm" fw={600}>Base Path:</Text>
            <Text size="sm" ff="monospace">{group.basePath}</Text>
          </Group>
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
