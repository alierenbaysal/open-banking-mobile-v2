"""OBIE v4.0 Payment Initiation Service response models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OBDomesticPaymentConsent(BaseModel):
    ConsentId: str
    Status: str = "AwaitingAuthorisation"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)
    Risk: dict[str, Any] = Field(default_factory=dict)


class OBDomesticPayment(BaseModel):
    DomesticPaymentId: str
    ConsentId: str
    Status: str = "AcceptedSettlementInProcess"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)


class OBDomesticScheduledPaymentConsent(BaseModel):
    ConsentId: str
    Status: str = "AwaitingAuthorisation"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)
    Risk: dict[str, Any] = Field(default_factory=dict)


class OBDomesticScheduledPayment(BaseModel):
    DomesticScheduledPaymentId: str
    ConsentId: str
    Status: str = "InitiationPending"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)


class OBDomesticStandingOrderConsent(BaseModel):
    ConsentId: str
    Status: str = "AwaitingAuthorisation"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)
    Risk: dict[str, Any] = Field(default_factory=dict)


class OBDomesticStandingOrder(BaseModel):
    DomesticStandingOrderId: str
    ConsentId: str
    Status: str = "InitiationPending"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)


class OBInternationalPaymentConsent(BaseModel):
    ConsentId: str
    Status: str = "AwaitingAuthorisation"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)
    Risk: dict[str, Any] = Field(default_factory=dict)


class OBInternationalPayment(BaseModel):
    InternationalPaymentId: str
    ConsentId: str
    Status: str = "AcceptedSettlementInProcess"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)
