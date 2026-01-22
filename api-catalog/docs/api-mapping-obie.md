# Bank Dhofar API to OBIE Standard Mapping

## Document Information

| Item | Value |
|------|-------|
| Version | 1.0 |
| Date | January 2026 |
| Status | Draft |
| OBIE Version | 4.0 |

---

## 1. Executive Summary

This document maps Bank Dhofar's existing proprietary APIs to UK Open Banking Implementation Entity (OBIE) standard endpoints. The mapping identifies:

1. **Direct Mappings** - Existing APIs that can be exposed via OBIE-compliant wrappers
2. **Gap Analysis** - OBIE capabilities requiring new development
3. **Transformation Logic** - How to convert proprietary formats to OBIE schema
4. **Implementation Priority** - Phased approach for compliance

---

## 2. Architecture: Adapter Pattern

```mermaid
flowchart TB
    subgraph TPP["TPP Request (OBIE-compliant, FAPI-secured)"]
        TPP_App[TPP Application]
    end

    subgraph Gateway["OBIE API Gateway Layer"]
        GW_Features["FAPI Headers | Consent Validation<br/>OAuth2 Scope Enforcement<br/>Request/Response Transformation"]
    end

    subgraph Adapters["Adapter Layer"]
        AIS_Adapter[OBIE AIS Adapter]
        PIS_Adapter[OBIE PIS Adapter]
        Events_Adapter[OBIE Events Adapter]
    end

    subgraph Proprietary["Proprietary API Layer"]
        Corp[Corporate Banking APIs]
        EasyBiz[EasyBiz Payment APIs]
        Emandate[E-Mandate APIs]
    end

    subgraph Backend["Backend Systems"]
        Finacle[(Finacle<br/>Core Banking)]
        EasyBiz_Platform[(EasyBiz<br/>Platform)]
        CBO[(CBO/<br/>ProgressSoft)]
    end

    TPP_App --> Gateway
    Gateway --> AIS_Adapter
    Gateway --> PIS_Adapter
    Gateway --> Events_Adapter

    AIS_Adapter --> Corp
    PIS_Adapter --> Corp
    PIS_Adapter --> Emandate
    Events_Adapter --> EasyBiz

    Corp --> Finacle
    EasyBiz --> EasyBiz_Platform
    Emandate --> CBO

    style Finacle fill:#336791,color:#fff
    style CBO fill:#4D9134,color:#fff
```

---

## 3. Account Information Service (AIS) Mapping

### 3.1 Account Endpoints

| OBIE Endpoint | OBIE Method | Bank Dhofar API | BD Method | Mapping Notes |
|---------------|-------------|-----------------|-----------|---------------|
| `/accounts` | GET | `/operative/accounts` | GET | Direct mapping, transform response |
| `/accounts/{AccountId}` | GET | `/operative/accounts` + filter | GET | Filter by account from list response |
| `/accounts/{AccountId}/balances` | GET | `/account/balance` | POST | Map `availableBalance` → `Amount.Amount` |
| `/accounts/{AccountId}/transactions` | GET | `/account/history` | POST | Pagination transform required |
| `/accounts/{AccountId}/beneficiaries` | GET | `/beneficiary/list` | GET | Map beneficiary schema |
| `/accounts/{AccountId}/direct-debits` | GET | E-Mandate APIs | - | Map from mandate list |
| `/accounts/{AccountId}/standing-orders` | GET | N/A | - | **Gap: Not available** |
| `/accounts/{AccountId}/scheduled-payments` | GET | N/A | - | **Gap: Not available** |
| `/balances` | GET | Multiple `/account/balance` calls | - | Aggregate across accounts |
| `/transactions` | GET | Multiple `/account/history` calls | - | Aggregate across accounts |

### 3.2 Detailed Mappings

#### GET /accounts → Corporate Banking /operative/accounts

**OBIE Response Schema:**
```json
{
  "Data": {
    "Account": [
      {
        "AccountId": "string",
        "Status": "Enabled",
        "StatusUpdateDateTime": "2026-01-22T10:00:00+04:00",
        "Currency": "OMR",
        "AccountType": "Personal",
        "AccountSubType": "CurrentAccount",
        "Description": "string",
        "Nickname": "string",
        "Account": [
          {
            "SchemeName": "IBAN",
            "Identification": "OM02DHOF0000000123456789",
            "Name": "Customer Name"
          }
        ]
      }
    ]
  }
}
```

**Bank Dhofar Corporate API Response:**
```json
{
  "responseCode": "000",
  "responseDescription": "Success",
  "outputData": {
    "accountList": [
      {
        "accountNumber": "0123456789",
        "accountDescription": "Current Account",
        "currency": "OMR",
        "branchCode": "001"
      }
    ]
  }
}
```

**Transformation Logic:**
```javascript
function transformToOBIE(bdResponse) {
  return {
    Data: {
      Account: bdResponse.outputData.accountList.map(acc => ({
        AccountId: generateOBIEAccountId(acc.accountNumber),
        Status: "Enabled",
        StatusUpdateDateTime: new Date().toISOString(),
        Currency: acc.currency,
        AccountType: "Business",
        AccountSubType: mapAccountType(acc.accountDescription),
        Description: acc.accountDescription,
        Account: [{
          SchemeName: "IBAN",
          Identification: formatIBAN("OM", "DHOF", acc.branchCode, acc.accountNumber),
          Name: getCustomerName(acc)
        }]
      }))
    },
    Links: { Self: "..." },
    Meta: { TotalPages: 1 }
  };
}
```

#### GET /accounts/{AccountId}/balances → Corporate Banking /account/balance

**OBIE Response Schema:**
```json
{
  "Data": {
    "Balance": [
      {
        "AccountId": "string",
        "CreditDebitIndicator": "Credit",
        "Type": "InterimAvailable",
        "DateTime": "2026-01-22T10:00:00+04:00",
        "Amount": {
          "Amount": "1234.56",
          "Currency": "OMR"
        }
      }
    ]
  }
}
```

**Bank Dhofar Corporate API Response:**
```json
{
  "responseCode": "000",
  "responseDescription": "Success",
  "outputData": {
    "availableBalance": "1234.560",
    "currentBalance": "1500.000",
    "currency": "OMR"
  }
}
```

**Transformation Logic:**
```javascript
function transformBalanceToOBIE(bdResponse, accountId) {
  const balance = parseFloat(bdResponse.outputData.availableBalance);
  return {
    Data: {
      Balance: [
        {
          AccountId: accountId,
          CreditDebitIndicator: balance >= 0 ? "Credit" : "Debit",
          Type: "InterimAvailable",
          DateTime: new Date().toISOString(),
          Amount: {
            Amount: Math.abs(balance).toFixed(2),
            Currency: bdResponse.outputData.currency
          }
        },
        {
          AccountId: accountId,
          CreditDebitIndicator: parseFloat(bdResponse.outputData.currentBalance) >= 0 ? "Credit" : "Debit",
          Type: "InterimBooked",
          DateTime: new Date().toISOString(),
          Amount: {
            Amount: Math.abs(parseFloat(bdResponse.outputData.currentBalance)).toFixed(2),
            Currency: bdResponse.outputData.currency
          }
        }
      ]
    }
  };
}
```

#### GET /accounts/{AccountId}/transactions → Corporate Banking /account/history

**OBIE Response Schema:**
```json
{
  "Data": {
    "Transaction": [
      {
        "AccountId": "string",
        "TransactionId": "string",
        "TransactionReference": "string",
        "CreditDebitIndicator": "Debit",
        "Status": "Booked",
        "BookingDateTime": "2026-01-22T10:00:00+04:00",
        "ValueDateTime": "2026-01-22T10:00:00+04:00",
        "Amount": {
          "Amount": "100.00",
          "Currency": "OMR"
        },
        "TransactionInformation": "Payment to XYZ",
        "BankTransactionCode": {
          "Code": "ReceivedCreditTransfer",
          "SubCode": "DomesticCreditTransfer"
        },
        "Balance": {
          "Amount": { "Amount": "1234.56", "Currency": "OMR" },
          "CreditDebitIndicator": "Credit",
          "Type": "InterimBooked"
        }
      }
    ]
  }
}
```

**Bank Dhofar Corporate API Request:**
```json
{
  "accountNumber": "0123456789",
  "fromDate": "2026-01-01",
  "toDate": "2026-01-22"
}
```

**Bank Dhofar Corporate API Response:**
```json
{
  "responseCode": "000",
  "outputData": {
    "transactions": [
      {
        "transactionDate": "2026-01-20",
        "valueDate": "2026-01-20",
        "description": "TRF TO BENEFICIARY",
        "referenceNumber": "FT26020ABC123",
        "debitAmount": "100.000",
        "creditAmount": "0.000",
        "balance": "1234.560"
      }
    ]
  }
}
```

**Transformation Logic:**
```javascript
function transformTransactionsToOBIE(bdResponse, accountId) {
  return {
    Data: {
      Transaction: bdResponse.outputData.transactions.map(txn => ({
        AccountId: accountId,
        TransactionId: generateTransactionId(txn.referenceNumber),
        TransactionReference: txn.referenceNumber,
        CreditDebitIndicator: parseFloat(txn.debitAmount) > 0 ? "Debit" : "Credit",
        Status: "Booked",
        BookingDateTime: parseDate(txn.transactionDate),
        ValueDateTime: parseDate(txn.valueDate),
        Amount: {
          Amount: (parseFloat(txn.debitAmount) || parseFloat(txn.creditAmount)).toFixed(2),
          Currency: "OMR"
        },
        TransactionInformation: txn.description,
        Balance: {
          Amount: { Amount: txn.balance, Currency: "OMR" },
          CreditDebitIndicator: parseFloat(txn.balance) >= 0 ? "Credit" : "Debit",
          Type: "InterimBooked"
        }
      }))
    },
    Links: { Self: "..." },
    Meta: { TotalPages: 1 }
  };
}
```

---

## 4. Payment Initiation Service (PIS) Mapping

### 4.1 Payment Endpoints

| OBIE Endpoint | OBIE Method | Bank Dhofar API | BD Method | Mapping Notes |
|---------------|-------------|-----------------|-----------|---------------|
| `/domestic-payment-consents` | POST | N/A | - | **New: Consent Service** |
| `/domestic-payment-consents/{id}` | GET | N/A | - | **New: Consent Service** |
| `/domestic-payments` | POST | `/fund/transfer` | POST | Map with consent validation |
| `/domestic-payments/{id}` | GET | N/A | - | **Gap: Need payment status store** |
| `/domestic-scheduled-payment-consents` | POST | N/A | - | **Gap: No scheduled payments** |
| `/domestic-standing-order-consents` | POST | E-Mandate `/initiate` | POST | Map mandate to standing order |

### 4.2 Detailed Mappings

#### POST /domestic-payments → Corporate Banking /fund/transfer

**OBIE Request Schema:**
```json
{
  "Data": {
    "ConsentId": "pis-consent-123",
    "Initiation": {
      "InstructionIdentification": "ACME412",
      "EndToEndIdentification": "FRESCO.21302.GFX.20",
      "InstructedAmount": {
        "Amount": "100.00",
        "Currency": "OMR"
      },
      "DebtorAccount": {
        "SchemeName": "IBAN",
        "Identification": "OM02DHOF0000000123456789"
      },
      "CreditorAccount": {
        "SchemeName": "IBAN",
        "Identification": "OM02NBOB0000000987654321",
        "Name": "Creditor Name"
      },
      "RemittanceInformation": {
        "Reference": "FRESCO-101"
      }
    }
  }
}
```

**Bank Dhofar Fund Transfer Request:**
```json
{
  "fromAccount": "0123456789",
  "toAccount": "0987654321",
  "toBankCode": "NBOB",
  "amount": "100.000",
  "currency": "OMR",
  "transferType": "RTGS",
  "purposeCode": "SAL",
  "narration": "FRESCO-101",
  "beneficiaryName": "Creditor Name"
}
```

**Transformation Logic:**
```javascript
function transformOBIEPaymentToBD(obieRequest) {
  const initiation = obieRequest.Data.Initiation;
  return {
    fromAccount: extractAccountNumber(initiation.DebtorAccount.Identification),
    toAccount: extractAccountNumber(initiation.CreditorAccount.Identification),
    toBankCode: extractBankCode(initiation.CreditorAccount.Identification),
    amount: initiation.InstructedAmount.Amount,
    currency: initiation.InstructedAmount.Currency,
    transferType: determineTransferType(initiation.CreditorAccount.Identification),
    purposeCode: mapPurposeCode(initiation.CategoryPurposeCode),
    narration: initiation.RemittanceInformation?.Reference ||
               initiation.EndToEndIdentification,
    beneficiaryName: initiation.CreditorAccount.Name
  };
}

function determineTransferType(iban) {
  const bankCode = extractBankCode(iban);
  if (bankCode === "DHOF") return "INTERNAL";
  return "RTGS"; // or ACH based on amount threshold
}
```

---

## 5. E-Mandate to Variable Recurring Payments (VRP) Mapping

### 5.1 VRP Endpoints

| OBIE Endpoint | Bank Dhofar E-Mandate API | Mapping Notes |
|---------------|---------------------------|---------------|
| `/domestic-vrp-consents` | `/mandates/initiate` | Map mandate initiation to VRP consent |
| `/domestic-vrp-consents/{id}` | `/mandates/status` | Status mapping required |
| `/domestic-vrps` | `/bulkPayment/release` | Execute payment under VRP consent |
| `/domestic-vrps/{id}` | `/bulkPayment/response` | Payment status |

### 5.2 E-Mandate to VRP Consent Mapping

**OBIE VRP Consent Request:**
```json
{
  "Data": {
    "ControlParameters": {
      "ValidFromDateTime": "2026-01-22T00:00:00+04:00",
      "ValidToDateTime": "2027-01-22T00:00:00+04:00",
      "MaximumIndividualAmount": {
        "Amount": "500.00",
        "Currency": "OMR"
      },
      "PeriodicLimits": [
        {
          "PeriodType": "Month",
          "PeriodAlignment": "Calendar",
          "Amount": "2000.00",
          "Currency": "OMR"
        }
      ]
    },
    "Initiation": {
      "DebtorAccount": {
        "SchemeName": "IBAN",
        "Identification": "OM02NBOB0000000987654321"
      },
      "CreditorAccount": {
        "SchemeName": "IBAN",
        "Identification": "OM02DHOF0000000123456789"
      }
    }
  }
}
```

**E-Mandate Initiation Request:**
```json
{
  "mandateType": "RCUR",
  "creditorId": "CORP123",
  "debtorIBAN": "OM02NBOB0000000987654321",
  "creditorIBAN": "OM02DHOF0000000123456789",
  "maxAmount": "500.000",
  "frequency": "MNTH",
  "validFrom": "2026-01-22",
  "validTo": "2027-01-22",
  "description": "Monthly subscription"
}
```

**Transformation Logic:**
```javascript
function transformVRPConsentToEMandate(obieRequest) {
  const ctrl = obieRequest.Data.ControlParameters;
  const init = obieRequest.Data.Initiation;

  return {
    mandateType: "RCUR",
    debtorIBAN: init.DebtorAccount.Identification,
    creditorIBAN: init.CreditorAccount.Identification,
    maxAmount: ctrl.MaximumIndividualAmount.Amount,
    frequency: mapOBIEPeriodToEMandateFrequency(ctrl.PeriodicLimits?.[0]?.PeriodType),
    validFrom: formatDate(ctrl.ValidFromDateTime),
    validTo: formatDate(ctrl.ValidToDateTime)
  };
}

function mapOBIEPeriodToEMandateFrequency(periodType) {
  const map = {
    "Day": "DAIL",
    "Week": "WEEK",
    "Fortnight": "FRTN",
    "Month": "MNTH",
    "Quarter": "QURT",
    "Year": "YEAR"
  };
  return map[periodType] || "MNTH";
}
```

---

## 6. EasyBiz API Considerations

EasyBiz APIs are **B2B payment collection** focused and don't map directly to OBIE consumer-facing patterns. However, they could be used for:

| EasyBiz API | Potential OBIE Use | Notes |
|-------------|-------------------|-------|
| Create Customer | N/A | B2B onboarding, not consumer AIS |
| Virtual Account | N/A | Collection mechanism, not OBIE scope |
| Payment Collection | Could inform `/domestic-payments` status | As payment receiver notification |
| Payment Status | Event notification source | Webhook to OBIE event API |

**Recommendation:** EasyBiz remains as a separate B2B service, not exposed via OBIE APIs. However, payment events from EasyBiz can feed into OBIE event notifications for TPPs that need real-time payment confirmations.

---

## 7. Gap Analysis

### 7.1 Critical Gaps (Must Have)

| Gap | OBIE Requirement | Current State | Implementation |
|-----|------------------|---------------|----------------|
| **Consent Management** | Full consent lifecycle | None | Build consent service |
| **Consent API** | `/account-access-consents`, `/payment-consents` | None | New endpoints |
| **Payment Status** | Persistent payment status with history | Fire-and-forget | Add payment store |
| **Event Notifications** | Real-time webhooks to TPPs | None | Build event service |
| **FAPI Security** | mTLS, PKCE, PAR, signed JWTs | Partial (mTLS exists) | Configure Keycloak |

### 7.2 Important Gaps (Should Have)

| Gap | OBIE Requirement | Current State | Implementation |
|-----|------------------|---------------|----------------|
| **Standing Orders** | `/standing-orders` endpoint | N/A | Requires Finacle change |
| **Scheduled Payments** | `/scheduled-payments` endpoint | N/A | Requires Finacle change |
| **Offers** | `/offers` endpoint | N/A | Marketing integration |
| **Products** | `/products` endpoint | N/A | Product catalog |
| **Party Info** | `/party` endpoint | Partial | Extend customer API |

### 7.3 Nice-to-Have Gaps

| Gap | OBIE Requirement | Notes |
|-----|------------------|-------|
| Statements | PDF statement download | Low priority |
| International Payments | `/international-payments` | Future phase |
| File Payments | Bulk payment files | B2B use case |

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Months 1-2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Month 1-2: Foundation                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 1-2: Infrastructure                                                    │
│  ├── [ ] Deploy consent database                                             │
│  ├── [ ] Configure Keycloak FAPI 2.0 realm                                   │
│  ├── [ ] Set up OBIE API Gateway (Istio VirtualService)                      │
│  └── [ ] TPP sandbox environment                                             │
│                                                                              │
│  Week 3-4: Consent Service Core                                              │
│  ├── [ ] Implement consent CRUD operations                                   │
│  ├── [ ] Consent state machine                                               │
│  ├── [ ] TPP registry integration                                            │
│  └── [ ] Audit logging                                                       │
│                                                                              │
│  Week 5-8: DEH Integration                                                   │
│  ├── [ ] Authorization URL redirect handling                                 │
│  ├── [ ] Consent authorization screens (Arabic/English)                      │
│  ├── [ ] Account selection UI                                                │
│  └── [ ] Consent dashboard                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: AIS Implementation (Months 3-4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Month 3-4: Account Information Service                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 9-10: Account Access Consent API                                       │
│  ├── [ ] POST /account-access-consents                                       │
│  ├── [ ] GET /account-access-consents/{id}                                   │
│  ├── [ ] DELETE /account-access-consents/{id}                                │
│  └── [ ] Integration tests                                                   │
│                                                                              │
│  Week 11-12: Account Endpoints                                               │
│  ├── [ ] GET /accounts adapter (→ Corporate /operative/accounts)             │
│  ├── [ ] GET /accounts/{id} adapter                                          │
│  ├── [ ] GET /accounts/{id}/balances adapter (→ /account/balance)            │
│  └── [ ] Consent scope enforcement                                           │
│                                                                              │
│  Week 13-14: Transaction Endpoints                                           │
│  ├── [ ] GET /accounts/{id}/transactions adapter (→ /account/history)        │
│  ├── [ ] Pagination support                                                  │
│  ├── [ ] Date range filtering                                                │
│  └── [ ] Transaction categorization                                          │
│                                                                              │
│  Week 15-16: Additional AIS Endpoints                                        │
│  ├── [ ] GET /accounts/{id}/beneficiaries (→ /beneficiary/list)              │
│  ├── [ ] GET /accounts/{id}/direct-debits (→ E-Mandate list)                 │
│  └── [ ] End-to-end testing with sandbox TPP                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: PIS Implementation (Months 5-6)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Month 5-6: Payment Initiation Service                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 17-18: Payment Consent API                                             │
│  ├── [ ] POST /domestic-payment-consents                                     │
│  ├── [ ] GET /domestic-payment-consents/{id}                                 │
│  ├── [ ] Funds confirmation check                                            │
│  └── [ ] DEH payment confirmation screen                                     │
│                                                                              │
│  Week 19-20: Domestic Payments                                               │
│  ├── [ ] POST /domestic-payments adapter (→ /fund/transfer)                  │
│  ├── [ ] GET /domestic-payments/{id}                                         │
│  ├── [ ] Payment status persistence                                          │
│  └── [ ] Idempotency key handling                                            │
│                                                                              │
│  Week 21-22: VRP (Variable Recurring Payments)                               │
│  ├── [ ] POST /domestic-vrp-consents (→ E-Mandate /initiate)                 │
│  ├── [ ] VRP consent status mapping                                          │
│  ├── [ ] POST /domestic-vrps execution                                       │
│  └── [ ] Control parameter validation                                        │
│                                                                              │
│  Week 23-24: Integration & Testing                                           │
│  ├── [ ] End-to-end payment flows                                            │
│  ├── [ ] Error scenario testing                                              │
│  ├── [ ] Performance testing                                                 │
│  └── [ ] Security penetration testing                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Production & Compliance (Month 7)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Month 7: Production Readiness                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 25-26: Security & Compliance                                           │
│  ├── [ ] Third-party penetration testing                                     │
│  ├── [ ] CBO compliance documentation                                        │
│  ├── [ ] TPP onboarding documentation                                        │
│  └── [ ] API documentation (Swagger/OpenAPI)                                 │
│                                                                              │
│  Week 27-28: Production Launch                                               │
│  ├── [ ] Production environment deployment                                   │
│  ├── [ ] Monitoring & alerting setup                                         │
│  ├── [ ] TPP sandbox opening                                                 │
│  └── [ ] First TPP pilot onboarding                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. API Endpoint Summary

### 9.1 Full Endpoint Inventory

| OBIE Endpoint | Method | Backend Source | Status |
|---------------|--------|----------------|--------|
| `/account-access-consents` | POST | Consent Service | New |
| `/account-access-consents/{id}` | GET | Consent Service | New |
| `/account-access-consents/{id}` | DELETE | Consent Service | New |
| `/accounts` | GET | Corporate `/operative/accounts` | Adapter |
| `/accounts/{id}` | GET | Corporate `/operative/accounts` | Adapter |
| `/accounts/{id}/balances` | GET | Corporate `/account/balance` | Adapter |
| `/accounts/{id}/transactions` | GET | Corporate `/account/history` | Adapter |
| `/accounts/{id}/beneficiaries` | GET | Corporate `/beneficiary/list` | Adapter |
| `/accounts/{id}/direct-debits` | GET | E-Mandate list | Adapter |
| `/balances` | GET | Aggregate | New |
| `/transactions` | GET | Aggregate | New |
| `/beneficiaries` | GET | Aggregate | New |
| `/domestic-payment-consents` | POST | Consent Service | New |
| `/domestic-payment-consents/{id}` | GET | Consent Service | New |
| `/domestic-payment-consents/{id}/funds-confirmation` | GET | Corporate `/account/balance` | New |
| `/domestic-payments` | POST | Corporate `/fund/transfer` | Adapter |
| `/domestic-payments/{id}` | GET | Payment Store | New |
| `/domestic-vrp-consents` | POST | E-Mandate `/initiate` | Adapter |
| `/domestic-vrp-consents/{id}` | GET | E-Mandate status | Adapter |
| `/domestic-vrps` | POST | E-Mandate `/bulkPayment/release` | Adapter |
| `/domestic-vrps/{id}` | GET | E-Mandate `/bulkPayment/response` | Adapter |

### 9.2 Data Transformation Summary

| Transformation | Source Format | Target Format | Complexity |
|----------------|---------------|---------------|------------|
| Account ID | Bank account number | OBIE opaque ID | Low |
| IBAN | Account + Branch | OM country code + DHOF + number | Low |
| Balance | Decimal string | OBIE Amount object | Low |
| Transaction | BD transaction format | OBTransaction4 | Medium |
| Beneficiary | BD beneficiary format | OBBeneficiary5 | Medium |
| Payment request | OBWriteDomestic2 | BD fund transfer | Medium |
| Mandate/VRP | OBDomesticVRPConsent | E-Mandate initiation | High |

---

## 10. Error Code Mapping

| OBIE Error Code | HTTP Status | Bank Dhofar Code | Description |
|-----------------|-------------|------------------|-------------|
| UK.OBIE.Field.Invalid | 400 | Various validation codes | Invalid field format |
| UK.OBIE.Field.Missing | 400 | Required field missing | Missing mandatory field |
| UK.OBIE.Resource.ConsentMismatch | 403 | N/A | Account not in consent |
| UK.OBIE.Resource.InvalidConsentStatus | 403 | N/A | Consent not authorized |
| UK.OBIE.Resource.NotFound | 404 | 404, ACCOUNT_NOT_FOUND | Resource doesn't exist |
| UK.OBIE.Rules.InsufficientFunds | 400 | INSUFFICIENT_BALANCE | Balance check failed |
| UK.OBIE.Signature.Invalid | 401 | Auth failure | JWS signature invalid |
| UK.OBIE.UnexpectedError | 500 | System errors | Backend failure |

---

## Appendix A: IBAN Format for Oman

```
Format: OM## BBBB #### #### #### ###

Where:
  OM   = Country code (Oman)
  ##   = Check digits (calculated)
  BBBB = Bank code (4 chars, e.g., DHOF for Bank Dhofar)
  ###...# = Account number (up to 19 digits, padded)

Example:
  Account: 0123456789
  Bank: DHOF
  IBAN: OM02DHOF0000000123456789
```

---

## Appendix B: OBIE Permission to API Scope Mapping

| Permission | Required Scope | APIs Enabled |
|------------|----------------|--------------|
| ReadAccountsBasic | accounts | GET /accounts (basic info only) |
| ReadAccountsDetail | accounts | GET /accounts (with IBAN) |
| ReadBalances | accounts | GET /accounts/{id}/balances |
| ReadTransactionsBasic | accounts | GET /accounts/{id}/transactions (basic) |
| ReadTransactionsDetail | accounts | GET /accounts/{id}/transactions (full) |
| ReadBeneficiariesBasic | accounts | GET /accounts/{id}/beneficiaries |
