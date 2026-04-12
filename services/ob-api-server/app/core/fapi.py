"""FAPI (Financial-grade API) header utilities."""

from __future__ import annotations

import uuid

from fastapi import Request


def get_interaction_id(request: Request) -> str:
    """Return x-fapi-interaction-id from request or generate a new one."""
    return request.headers.get("x-fapi-interaction-id", str(uuid.uuid4()))


def get_customer_ip(request: Request) -> str | None:
    return request.headers.get("x-fapi-customer-ip-address")


def get_auth_date(request: Request) -> str | None:
    return request.headers.get("x-fapi-auth-date")


def get_customer_last_logged_time(request: Request) -> str | None:
    return request.headers.get("x-fapi-customer-last-logged-time")
