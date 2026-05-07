"""
Integration test fixtures.
Patches SQLAlchemy JSONB → JSON so tests run on in-memory SQLite.
"""
import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import JSON

# Monkey-patch JSONB to behave as JSON for SQLite in tests
JSONB.__class_getitem__ = lambda cls, item: JSON()


def pytest_configure(config):
    """Replace JSONB with JSON for SQLite compatibility in test suite."""
    import sqlalchemy.dialects.postgresql as pg_types
    pg_types.JSONB = JSON
