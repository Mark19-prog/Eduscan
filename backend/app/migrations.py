from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.engine import Engine

from .database import Base


MIGRATIONS = (
    ("0001_initial_versioned_schema", "Create the complete versioned EduScan schema"),
)


def run_migrations(engine: Engine) -> list[str]:
    """Apply idempotent, recorded schema migrations instead of untracked create_all calls."""
    applied_now: list[str] = []
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "version VARCHAR(80) PRIMARY KEY, description VARCHAR(255) NOT NULL, applied_at DATETIME NOT NULL)"
        ))
        applied = {row[0] for row in connection.execute(text("SELECT version FROM schema_migrations"))}
        for version, description in MIGRATIONS:
            if version in applied:
                continue
            if version == "0001_initial_versioned_schema":
                Base.metadata.create_all(bind=connection)
            connection.execute(
                text("INSERT INTO schema_migrations (version, description, applied_at) VALUES (:version, :description, :applied_at)"),
                {"version": version, "description": description, "applied_at": datetime.utcnow()},
            )
            applied_now.append(version)
    return applied_now
