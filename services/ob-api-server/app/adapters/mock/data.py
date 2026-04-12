"""Synthetic OBIE-compliant data fixtures for Bank Dhofar mock adapter.

All monetary values use OMR (Omani Rial) with 3 decimal places.
IBANs follow OM02DHOF... format.
Dates are ISO 8601 with +04:00 (Gulf Standard Time).
"""

from __future__ import annotations

# ── Test Accounts ────────────────────────────────────────────────────────

ACCOUNTS = [
    {
        "AccountId": "DHOF-10001",
        "Currency": "OMR",
        "AccountType": "Personal",
        "AccountSubType": "CurrentAccount",
        "Description": "Current Account - Salary",
        "Nickname": "My Salary Account",
        "Status": "Enabled",
        "StatusUpdateDateTime": "2025-01-15T08:00:00+04:00",
        "OpeningDate": "2020-03-10T00:00:00+04:00",
        "Account": [
            {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0001010012345601",
                "Name": "Ahmed bin Said Al-Busaidi",
                "SecondaryIdentification": "10001",
            }
        ],
    },
    {
        "AccountId": "DHOF-10002",
        "Currency": "OMR",
        "AccountType": "Personal",
        "AccountSubType": "Savings",
        "Description": "Savings Account",
        "Nickname": "Savings",
        "Status": "Enabled",
        "StatusUpdateDateTime": "2025-01-15T08:00:00+04:00",
        "OpeningDate": "2021-06-01T00:00:00+04:00",
        "Account": [
            {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0001010012345602",
                "Name": "Ahmed bin Said Al-Busaidi",
                "SecondaryIdentification": "10002",
            }
        ],
    },
    {
        "AccountId": "DHOF-10003",
        "Currency": "OMR",
        "AccountType": "Business",
        "AccountSubType": "CurrentAccount",
        "Description": "Business Current Account",
        "Nickname": "Al-Busaidi Trading",
        "Status": "Enabled",
        "StatusUpdateDateTime": "2025-02-01T10:30:00+04:00",
        "OpeningDate": "2019-11-20T00:00:00+04:00",
        "Account": [
            {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0001010098765401",
                "Name": "Al-Busaidi Trading LLC",
                "SecondaryIdentification": "10003",
            }
        ],
    },
    {
        "AccountId": "DHOF-10004",
        "Currency": "OMR",
        "AccountType": "Personal",
        "AccountSubType": "CurrentAccount",
        "Description": "Al Yusr Islamic Current Account",
        "Nickname": "Islamic Account",
        "Status": "Enabled",
        "StatusUpdateDateTime": "2025-03-01T09:00:00+04:00",
        "OpeningDate": "2023-01-15T00:00:00+04:00",
        "Account": [
            {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0002010055667701",
                "Name": "Fatima bint Khalid Al-Hinai",
                "SecondaryIdentification": "10004",
            }
        ],
    },
    {
        "AccountId": "DHOF-10005",
        "Currency": "USD",
        "AccountType": "Personal",
        "AccountSubType": "CurrentAccount",
        "Description": "USD Foreign Currency Account",
        "Nickname": "USD Account",
        "Status": "Enabled",
        "StatusUpdateDateTime": "2025-01-20T11:00:00+04:00",
        "OpeningDate": "2022-09-05T00:00:00+04:00",
        "Account": [
            {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0001020012345601",
                "Name": "Ahmed bin Said Al-Busaidi",
                "SecondaryIdentification": "10005",
            }
        ],
    },
]

# ── Balances ─────────────────────────────────────────────────────────────

BALANCES = {
    "DHOF-10001": [
        {
            "AccountId": "DHOF-10001",
            "Amount": {"Amount": "12540.350", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Type": "InterimAvailable",
            "DateTime": "2026-04-12T06:00:00+04:00",
            "CreditLine": [],
        },
        {
            "AccountId": "DHOF-10001",
            "Amount": {"Amount": "12840.350", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Type": "InterimBooked",
            "DateTime": "2026-04-12T06:00:00+04:00",
            "CreditLine": [],
        },
    ],
    "DHOF-10002": [
        {
            "AccountId": "DHOF-10002",
            "Amount": {"Amount": "45230.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Type": "InterimAvailable",
            "DateTime": "2026-04-12T06:00:00+04:00",
            "CreditLine": [],
        },
    ],
    "DHOF-10003": [
        {
            "AccountId": "DHOF-10003",
            "Amount": {"Amount": "89750.500", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Type": "InterimAvailable",
            "DateTime": "2026-04-12T06:00:00+04:00",
            "CreditLine": [
                {
                    "Included": True,
                    "Amount": {"Amount": "50000.000", "Currency": "OMR"},
                    "Type": "Available",
                }
            ],
        },
    ],
    "DHOF-10004": [
        {
            "AccountId": "DHOF-10004",
            "Amount": {"Amount": "3200.750", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Type": "InterimAvailable",
            "DateTime": "2026-04-12T06:00:00+04:00",
            "CreditLine": [],
        },
    ],
    "DHOF-10005": [
        {
            "AccountId": "DHOF-10005",
            "Amount": {"Amount": "8500.00", "Currency": "USD"},
            "CreditDebitIndicator": "Credit",
            "Type": "InterimAvailable",
            "DateTime": "2026-04-12T06:00:00+04:00",
            "CreditLine": [],
        },
    ],
}

# ── Transactions ─────────────────────────────────────────────────────────

TRANSACTIONS = {
    "DHOF-10001": [
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260401-001",
            "TransactionReference": "SAL-2026-04",
            "Amount": {"Amount": "2500.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-01T08:00:00+04:00",
            "ValueDateTime": "2026-04-01T08:00:00+04:00",
            "TransactionInformation": "Salary - Ministry of Finance",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "Salary"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260402-001",
            "TransactionReference": "POS-00412",
            "Amount": {"Amount": "45.200", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-02T12:30:00+04:00",
            "ValueDateTime": "2026-04-02T12:30:00+04:00",
            "TransactionInformation": "POS Purchase - Lulu Hypermarket Muscat",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260402-002",
            "TransactionReference": "POS-00413",
            "Amount": {"Amount": "12.500", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-02T14:15:00+04:00",
            "ValueDateTime": "2026-04-02T14:15:00+04:00",
            "TransactionInformation": "POS Purchase - Shell Petrol Station Al Khuwair",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260403-001",
            "TransactionReference": "TRF-98001",
            "Amount": {"Amount": "500.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-03T09:00:00+04:00",
            "ValueDateTime": "2026-04-03T09:00:00+04:00",
            "TransactionInformation": "Transfer to Savings Account",
            "BankTransactionCode": {"Code": "IssuedCreditTransfer", "SubCode": "InternalTransfer"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260403-002",
            "TransactionReference": "BILL-OOC-04",
            "Amount": {"Amount": "35.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-03T10:00:00+04:00",
            "ValueDateTime": "2026-04-03T10:00:00+04:00",
            "TransactionInformation": "Omantel - Mobile Bill Payment",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "BillPayment"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260404-001",
            "TransactionReference": "ATM-MQ-001",
            "Amount": {"Amount": "200.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-04T18:30:00+04:00",
            "ValueDateTime": "2026-04-04T18:30:00+04:00",
            "TransactionInformation": "ATM Withdrawal - Bank Dhofar Qurum Branch",
            "BankTransactionCode": {"Code": "IssuedCashConcentration", "SubCode": "ATM"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260405-001",
            "TransactionReference": "POS-00414",
            "Amount": {"Amount": "89.750", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-05T11:00:00+04:00",
            "ValueDateTime": "2026-04-05T11:00:00+04:00",
            "TransactionInformation": "POS Purchase - Oman Avenues Mall",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260406-001",
            "TransactionReference": "DD-NAWRAS-04",
            "Amount": {"Amount": "22.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-06T06:00:00+04:00",
            "ValueDateTime": "2026-04-06T06:00:00+04:00",
            "TransactionInformation": "Direct Debit - Ooredoo Oman",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "DirectDebit"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260407-001",
            "TransactionReference": "POS-00415",
            "Amount": {"Amount": "156.300", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-07T13:45:00+04:00",
            "ValueDateTime": "2026-04-07T13:45:00+04:00",
            "TransactionInformation": "POS Purchase - Carrefour City Centre Muscat",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260408-001",
            "TransactionReference": "RENT-04-2026",
            "Amount": {"Amount": "350.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-08T09:00:00+04:00",
            "ValueDateTime": "2026-04-08T09:00:00+04:00",
            "TransactionInformation": "Rent Payment - Al Mouj Muscat",
            "BankTransactionCode": {"Code": "IssuedCreditTransfer", "SubCode": "RentPayment"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260409-001",
            "TransactionReference": "POS-00416",
            "Amount": {"Amount": "8.500", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-09T07:30:00+04:00",
            "ValueDateTime": "2026-04-09T07:30:00+04:00",
            "TransactionInformation": "POS Purchase - Kargeen Cafe Madinat Qaboos",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260409-002",
            "TransactionReference": "TRF-INT-001",
            "Amount": {"Amount": "75.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-09T15:00:00+04:00",
            "ValueDateTime": "2026-04-09T15:00:00+04:00",
            "TransactionInformation": "Transfer to Fatima Al-Hinai",
            "BankTransactionCode": {"Code": "IssuedCreditTransfer", "SubCode": "DomesticTransfer"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260410-001",
            "TransactionReference": "BILL-MZEC-04",
            "Amount": {"Amount": "28.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-10T10:00:00+04:00",
            "ValueDateTime": "2026-04-10T10:00:00+04:00",
            "TransactionInformation": "Muscat Electricity - Bill Payment",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "BillPayment"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260410-002",
            "TransactionReference": "POS-00417",
            "Amount": {"Amount": "4.800", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-10T19:15:00+04:00",
            "ValueDateTime": "2026-04-10T19:15:00+04:00",
            "TransactionInformation": "POS Purchase - Al Fair Supermarket",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260411-001",
            "TransactionReference": "POS-00418",
            "Amount": {"Amount": "320.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-11T14:00:00+04:00",
            "ValueDateTime": "2026-04-11T14:00:00+04:00",
            "TransactionInformation": "POS Purchase - Omantel Store - iPhone Accessories",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260411-002",
            "TransactionReference": "REFUND-001",
            "Amount": {"Amount": "45.200", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-11T16:00:00+04:00",
            "ValueDateTime": "2026-04-11T16:00:00+04:00",
            "TransactionInformation": "Refund - Lulu Hypermarket Muscat",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "Refund"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260412-001",
            "TransactionReference": "POS-00419",
            "Amount": {"Amount": "15.750", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Pending",
            "BookingDateTime": "2026-04-12T08:30:00+04:00",
            "ValueDateTime": "2026-04-12T08:30:00+04:00",
            "TransactionInformation": "POS Purchase - Starbucks MQ",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260412-002",
            "TransactionReference": "POS-00420",
            "Amount": {"Amount": "62.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Pending",
            "BookingDateTime": "2026-04-12T10:00:00+04:00",
            "ValueDateTime": "2026-04-12T10:00:00+04:00",
            "TransactionInformation": "POS Purchase - Sharaf DG Oman",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260412-003",
            "TransactionReference": "FEE-SMS-04",
            "Amount": {"Amount": "1.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-12T00:01:00+04:00",
            "ValueDateTime": "2026-04-12T00:01:00+04:00",
            "TransactionInformation": "Monthly SMS Alert Fee",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "Fee"},
        },
        {
            "AccountId": "DHOF-10001",
            "TransactionId": "TXN-20260412-004",
            "TransactionReference": "INST-LOAN-04",
            "Amount": {"Amount": "150.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-12T06:00:00+04:00",
            "ValueDateTime": "2026-04-12T06:00:00+04:00",
            "TransactionInformation": "Personal Loan Instalment - Apr 2026",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "LoanRepayment"},
        },
    ],
    "DHOF-10002": [
        {
            "AccountId": "DHOF-10002",
            "TransactionId": "TXN-SAV-20260401-001",
            "TransactionReference": "TRF-98001",
            "Amount": {"Amount": "500.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-03T09:00:00+04:00",
            "ValueDateTime": "2026-04-03T09:00:00+04:00",
            "TransactionInformation": "Transfer from Current Account",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "InternalTransfer"},
        },
        {
            "AccountId": "DHOF-10002",
            "TransactionId": "TXN-SAV-20260401-002",
            "TransactionReference": "INT-Q1-2026",
            "Amount": {"Amount": "112.500", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-01T00:01:00+04:00",
            "ValueDateTime": "2026-04-01T00:01:00+04:00",
            "TransactionInformation": "Quarterly Interest Payment Q1 2026",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "Interest"},
        },
    ],
    "DHOF-10003": [
        {
            "AccountId": "DHOF-10003",
            "TransactionId": "TXN-BIZ-20260401-001",
            "TransactionReference": "INV-2026-0401",
            "Amount": {"Amount": "15000.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-01T10:00:00+04:00",
            "ValueDateTime": "2026-04-01T10:00:00+04:00",
            "TransactionInformation": "Customer Payment - Invoice INV-2026-0401",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "CommercialPayment"},
        },
        {
            "AccountId": "DHOF-10003",
            "TransactionId": "TXN-BIZ-20260405-001",
            "TransactionReference": "PAYROLL-04",
            "Amount": {"Amount": "8500.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-05T08:00:00+04:00",
            "ValueDateTime": "2026-04-05T08:00:00+04:00",
            "TransactionInformation": "Payroll - April 2026",
            "BankTransactionCode": {"Code": "IssuedCreditTransfer", "SubCode": "Payroll"},
        },
        {
            "AccountId": "DHOF-10003",
            "TransactionId": "TXN-BIZ-20260407-001",
            "TransactionReference": "RENT-OFFICE-04",
            "Amount": {"Amount": "1200.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-07T09:00:00+04:00",
            "ValueDateTime": "2026-04-07T09:00:00+04:00",
            "TransactionInformation": "Office Rent - CBD Area Muscat",
            "BankTransactionCode": {"Code": "IssuedCreditTransfer", "SubCode": "RentPayment"},
        },
        {
            "AccountId": "DHOF-10003",
            "TransactionId": "TXN-BIZ-20260410-001",
            "TransactionReference": "INV-2026-0410",
            "Amount": {"Amount": "22000.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-10T14:00:00+04:00",
            "ValueDateTime": "2026-04-10T14:00:00+04:00",
            "TransactionInformation": "Customer Payment - Invoice INV-2026-0410",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "CommercialPayment"},
        },
    ],
    "DHOF-10004": [
        {
            "AccountId": "DHOF-10004",
            "TransactionId": "TXN-ISL-20260401-001",
            "TransactionReference": "SAL-ISL-04",
            "Amount": {"Amount": "1800.000", "Currency": "OMR"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-01T08:00:00+04:00",
            "ValueDateTime": "2026-04-01T08:00:00+04:00",
            "TransactionInformation": "Salary - Sultan Qaboos University",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "Salary"},
        },
        {
            "AccountId": "DHOF-10004",
            "TransactionId": "TXN-ISL-20260405-001",
            "TransactionReference": "POS-ISL-001",
            "Amount": {"Amount": "125.500", "Currency": "OMR"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-05T16:00:00+04:00",
            "ValueDateTime": "2026-04-05T16:00:00+04:00",
            "TransactionInformation": "POS Purchase - Markaz Al Bahja Mall",
            "BankTransactionCode": {"Code": "IssuedDirectDebit", "SubCode": "POS"},
        },
    ],
    "DHOF-10005": [
        {
            "AccountId": "DHOF-10005",
            "TransactionId": "TXN-USD-20260401-001",
            "TransactionReference": "FX-BUY-USD",
            "Amount": {"Amount": "5000.00", "Currency": "USD"},
            "CreditDebitIndicator": "Credit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-01T11:00:00+04:00",
            "ValueDateTime": "2026-04-01T11:00:00+04:00",
            "TransactionInformation": "FX Purchase - OMR to USD",
            "BankTransactionCode": {"Code": "ReceivedCreditTransfer", "SubCode": "ForeignExchange"},
        },
        {
            "AccountId": "DHOF-10005",
            "TransactionId": "TXN-USD-20260408-001",
            "TransactionReference": "WIRE-OUT-001",
            "Amount": {"Amount": "1500.00", "Currency": "USD"},
            "CreditDebitIndicator": "Debit",
            "Status": "Booked",
            "BookingDateTime": "2026-04-08T10:00:00+04:00",
            "ValueDateTime": "2026-04-08T10:00:00+04:00",
            "TransactionInformation": "Wire Transfer - Amazon Seller Account",
            "BankTransactionCode": {"Code": "IssuedCreditTransfer", "SubCode": "InternationalTransfer"},
        },
    ],
}

# ── Beneficiaries ────────────────────────────────────────────────────────

BENEFICIARIES = {
    "DHOF-10001": [
        {
            "AccountId": "DHOF-10001",
            "BeneficiaryId": "BEN-001",
            "Reference": "Fatima Al-Hinai",
            "CreditorAgent": {"SchemeName": "BICFI", "Identification": "DHOFOMMU"},
            "CreditorAccount": {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0002010055667701",
                "Name": "Fatima bint Khalid Al-Hinai",
            },
        },
        {
            "AccountId": "DHOF-10001",
            "BeneficiaryId": "BEN-002",
            "Reference": "Muscat Municipality",
            "CreditorAgent": {"SchemeName": "BICFI", "Identification": "BMUSTOMMU"},
            "CreditorAccount": {
                "SchemeName": "IBAN",
                "Identification": "OM02BMUS0001090000012301",
                "Name": "Muscat Municipality",
            },
        },
        {
            "AccountId": "DHOF-10001",
            "BeneficiaryId": "BEN-003",
            "Reference": "Savings Transfer",
            "CreditorAgent": {"SchemeName": "BICFI", "Identification": "DHOFOMMU"},
            "CreditorAccount": {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0001010012345602",
                "Name": "Ahmed bin Said Al-Busaidi",
            },
        },
    ],
    "DHOF-10003": [
        {
            "AccountId": "DHOF-10003",
            "BeneficiaryId": "BEN-004",
            "Reference": "Supplier - Al Jazeera Trading",
            "CreditorAgent": {"SchemeName": "BICFI", "Identification": "NBOMOMMU"},
            "CreditorAccount": {
                "SchemeName": "IBAN",
                "Identification": "OM02NBOM0001010087654301",
                "Name": "Al Jazeera Trading LLC",
            },
        },
    ],
}

# ── Direct Debits ────────────────────────────────────────────────────────

DIRECT_DEBITS = {
    "DHOF-10001": [
        {
            "AccountId": "DHOF-10001",
            "DirectDebitId": "DD-001",
            "MandateIdentification": "OOREDOO-DD-2024",
            "DirectDebitStatusCode": "Active",
            "Name": "Ooredoo Oman",
            "PreviousPaymentDateTime": "2026-03-06T06:00:00+04:00",
            "PreviousPaymentAmount": {"Amount": "22.000", "Currency": "OMR"},
        },
        {
            "AccountId": "DHOF-10001",
            "DirectDebitId": "DD-002",
            "MandateIdentification": "MECW-DD-2023",
            "DirectDebitStatusCode": "Active",
            "Name": "Muscat Electricity",
            "PreviousPaymentDateTime": "2026-03-10T10:00:00+04:00",
            "PreviousPaymentAmount": {"Amount": "32.500", "Currency": "OMR"},
        },
    ],
}

# ── Standing Orders ──────────────────────────────────────────────────────

STANDING_ORDERS = {
    "DHOF-10001": [
        {
            "AccountId": "DHOF-10001",
            "StandingOrderId": "SO-001",
            "Frequency": "EvryWorkgDay",
            "Reference": "Savings Top-up",
            "FirstPaymentDateTime": "2025-01-01T09:00:00+04:00",
            "FirstPaymentAmount": {"Amount": "500.000", "Currency": "OMR"},
            "NextPaymentDateTime": "2026-05-01T09:00:00+04:00",
            "NextPaymentAmount": {"Amount": "500.000", "Currency": "OMR"},
            "StandingOrderStatusCode": "Active",
            "CreditorAccount": {
                "SchemeName": "IBAN",
                "Identification": "OM02DHOF0001010012345602",
                "Name": "Ahmed bin Said Al-Busaidi",
            },
        },
        {
            "AccountId": "DHOF-10001",
            "StandingOrderId": "SO-002",
            "Frequency": "EvryWorkgDay",
            "Reference": "Rent - Al Mouj",
            "FirstPaymentDateTime": "2025-06-08T09:00:00+04:00",
            "FirstPaymentAmount": {"Amount": "350.000", "Currency": "OMR"},
            "NextPaymentDateTime": "2026-05-08T09:00:00+04:00",
            "NextPaymentAmount": {"Amount": "350.000", "Currency": "OMR"},
            "FinalPaymentDateTime": "2027-06-08T09:00:00+04:00",
            "FinalPaymentAmount": {"Amount": "350.000", "Currency": "OMR"},
            "StandingOrderStatusCode": "Active",
            "CreditorAccount": {
                "SchemeName": "IBAN",
                "Identification": "OM02BMUS0003010000555501",
                "Name": "Al Mouj Muscat SAOC",
            },
        },
    ],
}

# ── Scheduled Payments ───────────────────────────────────────────────────

SCHEDULED_PAYMENTS = {
    "DHOF-10001": [
        {
            "AccountId": "DHOF-10001",
            "ScheduledPaymentId": "SP-001",
            "ScheduledPaymentDateTime": "2026-04-25T09:00:00+04:00",
            "ScheduledType": "Execution",
            "Reference": "Car Insurance - Oman United",
            "InstructedAmount": {"Amount": "180.000", "Currency": "OMR"},
            "CreditorAccount": {
                "SchemeName": "IBAN",
                "Identification": "OM02NBOM0001010034567801",
                "Name": "Oman United Insurance Co",
            },
        },
    ],
}

# ── Statements ───────────────────────────────────────────────────────────

STATEMENTS = {
    "DHOF-10001": [
        {
            "AccountId": "DHOF-10001",
            "StatementId": "STMT-202603",
            "StatementReference": "Mar-2026",
            "Type": "RegularPeriodic",
            "StartDateTime": "2026-03-01T00:00:00+04:00",
            "EndDateTime": "2026-03-31T23:59:59+04:00",
            "CreationDateTime": "2026-04-01T06:00:00+04:00",
            "StatementAmount": [
                {
                    "Amount": {"Amount": "2500.000", "Currency": "OMR"},
                    "CreditDebitIndicator": "Credit",
                    "Type": "PreviousClosingBalance",
                },
                {
                    "Amount": {"Amount": "12540.350", "Currency": "OMR"},
                    "CreditDebitIndicator": "Credit",
                    "Type": "ClosingBalance",
                },
            ],
        },
        {
            "AccountId": "DHOF-10001",
            "StatementId": "STMT-202602",
            "StatementReference": "Feb-2026",
            "Type": "RegularPeriodic",
            "StartDateTime": "2026-02-01T00:00:00+04:00",
            "EndDateTime": "2026-02-28T23:59:59+04:00",
            "CreationDateTime": "2026-03-01T06:00:00+04:00",
            "StatementAmount": [
                {
                    "Amount": {"Amount": "1800.000", "Currency": "OMR"},
                    "CreditDebitIndicator": "Credit",
                    "Type": "PreviousClosingBalance",
                },
                {
                    "Amount": {"Amount": "2500.000", "Currency": "OMR"},
                    "CreditDebitIndicator": "Credit",
                    "Type": "ClosingBalance",
                },
            ],
        },
    ],
}

# ── Products ─────────────────────────────────────────────────────────────

PRODUCTS = {
    "DHOF-10001": {
        "AccountId": "DHOF-10001",
        "ProductId": "PROD-PCA-001",
        "ProductType": "PersonalCurrentAccount",
        "ProductName": "Al Maha Current Account",
    },
    "DHOF-10002": {
        "AccountId": "DHOF-10002",
        "ProductId": "PROD-SAV-001",
        "ProductType": "Savings",
        "ProductName": "Al Wafra Savings Account",
    },
    "DHOF-10003": {
        "AccountId": "DHOF-10003",
        "ProductId": "PROD-BCA-001",
        "ProductType": "BusinessCurrentAccount",
        "ProductName": "Tijari Business Account",
    },
    "DHOF-10004": {
        "AccountId": "DHOF-10004",
        "ProductId": "PROD-ISL-001",
        "ProductType": "PersonalCurrentAccount",
        "ProductName": "Al Yusr Islamic Current Account",
    },
    "DHOF-10005": {
        "AccountId": "DHOF-10005",
        "ProductId": "PROD-FCY-001",
        "ProductType": "PersonalCurrentAccount",
        "ProductName": "Foreign Currency Account - USD",
    },
}

# ── Parties ──────────────────────────────────────────────────────────────

PARTIES = {
    "DHOF-10001": {
        "PartyId": "PARTY-001",
        "PartyType": "Sole",
        "Name": "Ahmed bin Said Al-Busaidi",
        "EmailAddress": "ahmed.busaidi@example.om",
        "Phone": "+96891234567",
    },
    "DHOF-10002": {
        "PartyId": "PARTY-001",
        "PartyType": "Sole",
        "Name": "Ahmed bin Said Al-Busaidi",
        "EmailAddress": "ahmed.busaidi@example.om",
        "Phone": "+96891234567",
    },
    "DHOF-10003": {
        "PartyId": "PARTY-002",
        "PartyType": "Sole",
        "Name": "Al-Busaidi Trading LLC",
        "EmailAddress": "info@albusaidi-trading.om",
        "Phone": "+96824567890",
    },
    "DHOF-10004": {
        "PartyId": "PARTY-003",
        "PartyType": "Sole",
        "Name": "Fatima bint Khalid Al-Hinai",
        "EmailAddress": "fatima.hinai@example.om",
        "Phone": "+96892345678",
    },
    "DHOF-10005": {
        "PartyId": "PARTY-001",
        "PartyType": "Sole",
        "Name": "Ahmed bin Said Al-Busaidi",
        "EmailAddress": "ahmed.busaidi@example.om",
        "Phone": "+96891234567",
    },
}
