"""OBIE v4.0 Variable Recurring Payment models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class OBVRPConsent(BaseModel):
    ConsentId: str
    Status: str = "AwaitingAuthorisation"
    StatusUpdateDateTime: str
    CreationDateTime: str
    ControlParameters: dict[str, Any] = Field(default_factory=dict)
    Initiation: dict[str, Any] = Field(default_factory=dict)
    Risk: dict[str, Any] = Field(default_factory=dict)


class OBVRPPayment(BaseModel):
    DomesticVRPId: str
    ConsentId: str
    Status: str = "AcceptedSettlementInProcess"
    StatusUpdateDateTime: str
    CreationDateTime: str
    Initiation: dict[str, Any] = Field(default_factory=dict)
    Instruction: dict[str, Any] = Field(default_factory=dict)
