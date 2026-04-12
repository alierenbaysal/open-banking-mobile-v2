"""OBIE-compliant error response formatting."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class OBIEErrorResponse:
    """Build OBIE v4.0 error envelope."""

    @staticmethod
    def build(
        status_code: int,
        error_code: str,
        message: str,
        path: str = "",
        url: str = "",
    ) -> dict[str, Any]:
        return {
            "Code": str(status_code),
            "Id": str(uuid.uuid4()),
            "Message": message,
            "Errors": [
                {
                    "ErrorCode": error_code,
                    "Message": message,
                    "Path": path,
                    "Url": url,
                }
            ],
        }


class OBIEError(Exception):
    """Raise to return an OBIE-formatted error from any endpoint."""

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        path: str = "",
        url: str = "",
    ):
        self.status_code = status_code
        self.body = OBIEErrorResponse.build(status_code, error_code, message, path, url)
        super().__init__(message)


async def obie_error_handler(_request: Request, exc: OBIEError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.body)


def not_found(resource: str, resource_id: str) -> OBIEError:
    return OBIEError(
        status_code=404,
        error_code="UK.OBIE.Resource.NotFound",
        message=f"{resource} '{resource_id}' not found",
    )


def bad_request(message: str, path: str = "") -> OBIEError:
    return OBIEError(
        status_code=400,
        error_code="UK.OBIE.Field.Invalid",
        message=message,
        path=path,
    )


def unauthorized(message: str = "Unauthorized") -> OBIEError:
    return OBIEError(
        status_code=401,
        error_code="UK.OBIE.Header.Missing",
        message=message,
    )


def forbidden(message: str = "Forbidden") -> OBIEError:
    return OBIEError(
        status_code=403,
        error_code="UK.OBIE.Resource.ConsentMismatch",
        message=message,
    )
