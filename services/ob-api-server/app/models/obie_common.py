"""Common OBIE v4.0 response models: Links, Meta, OBError."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Links(BaseModel):
    Self: str
    First: str | None = None
    Prev: str | None = None
    Next: str | None = None
    Last: str | None = None


class Meta(BaseModel):
    TotalPages: int = 1
    FirstAvailableDateTime: str | None = None
    LastAvailableDateTime: str | None = None


class OBError(BaseModel):
    ErrorCode: str
    Message: str
    Path: str = ""
    Url: str = ""


class OBErrorResponse(BaseModel):
    Code: str
    Id: str
    Message: str
    Errors: list[OBError] = Field(default_factory=list)


def build_links(self_url: str) -> dict[str, Any]:
    return {"Self": self_url}


def build_meta(total_pages: int = 1) -> dict[str, Any]:
    return {"TotalPages": total_pages}
