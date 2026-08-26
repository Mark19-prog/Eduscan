from __future__ import annotations

from datetime import datetime

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from .database import Base
from . import models as _models  # noqa: F401 -- register every mapped table before create_all


MIGRATIONS = (
    ("0001_initial_versioned_schema", "Create the complete versioned EduScan schema"),
    ("0002_attendance_reporting_controls", "Add learner movement fields and audited attendance-day reset"),
    ("0003_attendance_reporting_schema_repair", "Ensure attendance reporting tables and movement columns exist"),
    ("0004_section_adviser_account_link", "Link adviser authorization to a teacher account identifier"),
    ("0005_station_security_sms_controls", "Add account security and SMS idempotency controls"),
    ("0006_remove_station_direction_mode", "Remove the rejected manual scanner direction mode"),
    ("0007_personnel_attendance_schedules", "Add faculty and non-teaching duty schedules"),
    ("0008_completion_workflows", "Add reporting, grade finalization, audit, retention, SMS reconciliation, liveness review, and backup scheduling"),
)


def _add_column_if_missing(connection, table: str, column: str, definition: str) -> None:
    columns = {item["name"] for item in inspect(connection).get_columns(table)}
    if column not in columns:
        connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))


def _create_index_if_missing(connection, table: str, name: str, columns: str, unique: bool = False) -> None:
    indexes = inspect(connection).get_indexes(table)
    wanted_columns = [item.strip() for item in columns.split(",")]
    if any(item["name"] == name or (
        item.get("column_names") == wanted_columns and (not unique or item.get("unique"))
    ) for item in indexes):
        return
    qualifier = "UNIQUE " if unique else ""
    connection.execute(text(f"CREATE {qualifier}INDEX {name} ON {table} ({columns})"))


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
            elif version in {"0002_attendance_reporting_controls", "0003_attendance_reporting_schema_repair"}:
                Base.metadata.create_all(bind=connection)
                _add_column_if_missing(connection, "persons", "enrollment_status", "VARCHAR(30) NOT NULL DEFAULT 'Regular'")
                _add_column_if_missing(connection, "persons", "enrollment_start_date", "DATE NULL")
                _add_column_if_missing(connection, "persons", "enrollment_end_date", "DATE NULL")
                _add_column_if_missing(connection, "persons", "transfer_school", "VARCHAR(180) NULL")
            elif version == "0004_section_adviser_account_link":
                Base.metadata.create_all(bind=connection)
                _add_column_if_missing(connection, "school_sections", "adviser_user_id", "INTEGER NULL")
                connection.execute(text(
                    "UPDATE school_sections SET adviser_user_id = ("
                    "SELECT users.id FROM users WHERE LOWER(TRIM(users.full_name)) = LOWER(TRIM(school_sections.adviser_name)) "
                    "AND users.role = 'teacher' AND users.active = 1 LIMIT 1) "
                    "WHERE adviser_user_id IS NULL AND adviser_name IS NOT NULL"
                ))
            elif version == "0005_station_security_sms_controls":
                Base.metadata.create_all(bind=connection)
                _add_column_if_missing(connection, "users", "must_change_password", "BOOLEAN NOT NULL DEFAULT 1")
                _add_column_if_missing(connection, "users", "failed_login_count", "INTEGER NOT NULL DEFAULT 0")
                _add_column_if_missing(connection, "users", "locked_until", "DATETIME NULL")
                _add_column_if_missing(connection, "users", "password_changed_at", "DATETIME NULL")
                _add_column_if_missing(connection, "users", "last_login_at", "DATETIME NULL")
                _add_column_if_missing(connection, "sms_outbox", "idempotency_key", "VARCHAR(160) NULL")
                _add_column_if_missing(connection, "sms_outbox", "next_attempt_at", "DATETIME NULL")
                _create_index_if_missing(connection, "sms_outbox", "uq_sms_outbox_idempotency_key",
                                         "idempotency_key", unique=True)
                _create_index_if_missing(connection, "sms_outbox", "ix_sms_outbox_next_attempt_at",
                                         "next_attempt_at")
            elif version == "0006_remove_station_direction_mode":
                connection.execute(text("DELETE FROM system_settings WHERE `key` LIKE 'scanner:mode:%'"))
            elif version == "0007_personnel_attendance_schedules":
                Base.metadata.create_all(bind=connection)
            elif version == "0008_completion_workflows":
                Base.metadata.create_all(bind=connection)
                _add_column_if_missing(connection, "class_schedules", "absence_cutoff", "TIME NULL")
                _add_column_if_missing(connection, "personnel_schedules", "absence_cutoff", "TIME NULL")
                _add_column_if_missing(connection, "grade_scores", "status", "VARCHAR(30) NOT NULL DEFAULT 'Scored'")
                _add_column_if_missing(connection, "sms_outbox", "delivered_at", "DATETIME NULL")
                _add_column_if_missing(connection, "sms_outbox", "cancelled_at", "DATETIME NULL")
                _add_column_if_missing(connection, "sms_outbox", "exhausted_at", "DATETIME NULL")
                _add_column_if_missing(connection, "sms_outbox", "gateway_status_checked_at", "DATETIME NULL")
                _create_index_if_missing(connection, "grade_scores", "ix_grade_scores_status", "status")
            connection.execute(
                text("INSERT INTO schema_migrations (version, description, applied_at) VALUES (:version, :description, :applied_at)"),
                {"version": version, "description": description, "applied_at": datetime.utcnow()},
            )
            applied_now.append(version)
    return applied_now
