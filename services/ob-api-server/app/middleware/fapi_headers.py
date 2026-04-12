"""FAPI header middleware — injects x-fapi-interaction-id on every response."""

from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response


class FAPIHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        interaction_id = request.headers.get("x-fapi-interaction-id") or str(uuid.uuid4())
        request.state.fapi_interaction_id = interaction_id

        response = await call_next(request)
        response.headers["x-fapi-interaction-id"] = interaction_id
        return response
