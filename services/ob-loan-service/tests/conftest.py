"""Shared fixtures."""

import os

# Provide minimal env vars so app.config.Settings can construct in unit tests
# without actually connecting to anything.
os.environ.setdefault("DATABASE_URL", "postgres://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
