"""TPP registry business logic."""

from __future__ import annotations

import logging
from typing import Any

from app.core.database import acquire
from app.models.tpp import CreateTPPRequest, TPPResponse, UpdateTPPRequest

logger = logging.getLogger(__name__)


def _row_to_response(row: dict[str, Any]) -> TPPResponse:
    """Map a database row to a TPPResponse."""
    return TPPResponse(
        tpp_id=row["tpp_id"],
        tpp_name=row["tpp_name"],
        tpp_name_ar=row["tpp_name_ar"],
        registration_number=row["registration_number"],
        is_aisp=row["is_aisp"],
        is_pisp=row["is_pisp"],
        is_cisp=row["is_cisp"],
        client_id=row["client_id"],
        redirect_uris=row["redirect_uris"],
        jwks_uri=row["jwks_uri"],
        software_statement=row["software_statement"],
        logo_uri=row["logo_uri"],
        status=row["status"],
        onboarded_at=row["onboarded_at"],
    )


async def create_tpp(req: CreateTPPRequest) -> TPPResponse:
    """Register a new TPP."""
    sql = """
        INSERT INTO tpp_registry
            (tpp_id, tpp_name, tpp_name_ar, registration_number,
             is_aisp, is_pisp, is_cisp,
             client_id, redirect_uris, jwks_uri, software_statement,
             logo_uri, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
    """
    async with acquire() as conn:
        row = await conn.fetchrow(
            sql,
            req.tpp_id,
            req.tpp_name,
            req.tpp_name_ar,
            req.registration_number,
            req.is_aisp,
            req.is_pisp,
            req.is_cisp,
            req.client_id,
            req.redirect_uris,
            req.jwks_uri,
            req.software_statement,
            req.logo_uri,
            req.status.value,
        )
    logger.info("TPP registered: %s (%s)", req.tpp_id, req.tpp_name)
    return _row_to_response(dict(row))


async def get_tpp(tpp_id: str) -> TPPResponse | None:
    """Get a single TPP by ID."""
    sql = "SELECT * FROM tpp_registry WHERE tpp_id = $1"
    async with acquire() as conn:
        row = await conn.fetchrow(sql, tpp_id)
    if row is None:
        return None
    return _row_to_response(dict(row))


async def update_tpp(tpp_id: str, req: UpdateTPPRequest) -> TPPResponse | None:
    """Update a TPP record. Only non-None fields are changed."""
    # Build SET clause dynamically from provided fields.
    updates: dict[str, Any] = {}
    if req.tpp_name is not None:
        updates["tpp_name"] = req.tpp_name
    if req.tpp_name_ar is not None:
        updates["tpp_name_ar"] = req.tpp_name_ar
    if req.registration_number is not None:
        updates["registration_number"] = req.registration_number
    if req.is_aisp is not None:
        updates["is_aisp"] = req.is_aisp
    if req.is_pisp is not None:
        updates["is_pisp"] = req.is_pisp
    if req.is_cisp is not None:
        updates["is_cisp"] = req.is_cisp
    if req.redirect_uris is not None:
        updates["redirect_uris"] = req.redirect_uris
    if req.jwks_uri is not None:
        updates["jwks_uri"] = req.jwks_uri
    if req.software_statement is not None:
        updates["software_statement"] = req.software_statement
    if req.logo_uri is not None:
        updates["logo_uri"] = req.logo_uri
    if req.status is not None:
        updates["status"] = req.status.value

    if not updates:
        return await get_tpp(tpp_id)

    set_parts: list[str] = []
    params: list[Any] = []
    for idx, (col, val) in enumerate(updates.items(), start=1):
        set_parts.append(f"{col} = ${idx}")
        params.append(val)

    params.append(tpp_id)
    where_idx = len(params)

    sql = f"UPDATE tpp_registry SET {', '.join(set_parts)} WHERE tpp_id = ${where_idx} RETURNING *"
    async with acquire() as conn:
        row = await conn.fetchrow(sql, *params)
    if row is None:
        return None
    logger.info("TPP updated: %s", tpp_id)
    return _row_to_response(dict(row))


async def list_tpps(status: str | None = None) -> list[TPPResponse]:
    """List all TPPs, optionally filtered by status."""
    if status:
        sql = "SELECT * FROM tpp_registry WHERE status = $1 ORDER BY onboarded_at DESC"
        async with acquire() as conn:
            rows = await conn.fetch(sql, status)
    else:
        sql = "SELECT * FROM tpp_registry ORDER BY onboarded_at DESC"
        async with acquire() as conn:
            rows = await conn.fetch(sql)
    return [_row_to_response(dict(r)) for r in rows]
