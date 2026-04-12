"""Adapter registry — resolves the active adapter based on ADAPTER_MODE."""

from __future__ import annotations

from app.adapters.base import OBIEAdapter
from app.config import settings

_adapter_instance: OBIEAdapter | None = None


def get_adapter() -> OBIEAdapter:
    """Return the singleton adapter for the configured mode."""
    global _adapter_instance
    if _adapter_instance is None:
        mode = settings.adapter_mode.lower()
        if mode == "mock":
            from app.adapters.mock.adapter import MockAdapter

            _adapter_instance = MockAdapter()
        else:
            raise ValueError(f"Unknown adapter mode: {mode!r}. Available: mock")
    return _adapter_instance
