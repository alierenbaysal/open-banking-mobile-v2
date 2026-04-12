"""OBIE v4.0 Account Information Service response models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OBAccount(BaseModel):
    AccountId: str
    Currency: str = "OMR"
    AccountType: str = "Personal"
    AccountSubType: str = "CurrentAccount"
    Description: str | None = None
    Nickname: str | None = None
    Account: list[dict[str, Any]] = Field(default_factory=list)
    Status: str = "Enabled"
    StatusUpdateDateTime: str | None = None
    OpeningDate: str | None = None


class OBBalance(BaseModel):
    AccountId: str
    Amount: dict[str, str]
    CreditDebitIndicator: str
    Type: str
    DateTime: str
    CreditLine: list[dict[str, Any]] = Field(default_factory=list)


class OBTransaction(BaseModel):
    AccountId: str
    TransactionId: str
    TransactionReference: str | None = None
    Amount: dict[str, str]
    CreditDebitIndicator: str
    Status: str
    BookingDateTime: str
    ValueDateTime: str | None = None
    TransactionInformation: str | None = None
    BankTransactionCode: dict[str, str] | None = None
    Balance: dict[str, Any] | None = None


class OBBeneficiary(BaseModel):
    AccountId: str
    BeneficiaryId: str
    Reference: str | None = None
    CreditorAgent: dict[str, str] | None = None
    CreditorAccount: dict[str, str] | None = None


class OBDirectDebit(BaseModel):
    AccountId: str
    DirectDebitId: str
    MandateIdentification: str
    DirectDebitStatusCode: str = "Active"
    Name: str
    PreviousPaymentDateTime: str | None = None
    PreviousPaymentAmount: dict[str, str] | None = None


class OBStandingOrder(BaseModel):
    AccountId: str
    StandingOrderId: str
    Frequency: str
    Reference: str | None = None
    FirstPaymentDateTime: str | None = None
    FirstPaymentAmount: dict[str, str] | None = None
    NextPaymentDateTime: str | None = None
    NextPaymentAmount: dict[str, str] | None = None
    FinalPaymentDateTime: str | None = None
    FinalPaymentAmount: dict[str, str] | None = None
    StandingOrderStatusCode: str = "Active"
    CreditorAccount: dict[str, str] | None = None


class OBScheduledPayment(BaseModel):
    AccountId: str
    ScheduledPaymentId: str
    ScheduledPaymentDateTime: str
    ScheduledType: str = "Execution"
    Reference: str | None = None
    InstructedAmount: dict[str, str] | None = None
    CreditorAccount: dict[str, str] | None = None


class OBStatement(BaseModel):
    AccountId: str
    StatementId: str
    StatementReference: str | None = None
    Type: str = "RegularPeriodic"
    StartDateTime: str
    EndDateTime: str
    CreationDateTime: str
    StatementAmount: list[dict[str, Any]] = Field(default_factory=list)


class OBProduct(BaseModel):
    AccountId: str
    ProductId: str
    ProductType: str = "PersonalCurrentAccount"
    ProductName: str | None = None


class OBParty(BaseModel):
    PartyId: str
    PartyType: str = "Sole"
    Name: str | None = None
    EmailAddress: str | None = None
    Phone: str | None = None


class OBAccountAccessConsent(BaseModel):
    ConsentId: str
    Status: str = "AwaitingAuthorisation"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Permissions: list[str] = Field(default_factory=list)
    ExpirationDateTime: str | None = None
    TransactionFromDateTime: str | None = None
    TransactionToDateTime: str | None = None
