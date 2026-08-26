from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, func, select, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import Base
from app.migrations import run_migrations
import app.models  # noqa: F401 -- registers every mapped table with Base.metadata


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Copy an EduScan SQLite database into an empty MySQL schema.")
    parser.add_argument("--source", default="sqlite:///./data/eduscan.db", help="Source SQLite SQLAlchemy URL")
    parser.add_argument("--confirm", required=True, help="Must be exactly MIGRATE TO MYSQL")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.confirm != "MIGRATE TO MYSQL":
        raise SystemExit("Confirmation text must be exactly: MIGRATE TO MYSQL")
    target_url = os.getenv("MYSQL_DATABASE_URL", "").strip()
    if not target_url:
        raise SystemExit("Set MYSQL_DATABASE_URL for the restricted EduScan MySQL account before running this tool.")
    if not target_url.startswith("mysql+"):
        raise SystemExit("MYSQL_DATABASE_URL must be a MySQL SQLAlchemy URL such as mysql+pymysql://...")

    source = create_engine(args.source)
    target = create_engine(target_url, pool_pre_ping=True)
    source_path = Path(source.url.database or "").resolve()
    if not source_path.exists():
        raise SystemExit(f"Source SQLite database was not found: {source_path}")

    run_migrations(source)
    run_migrations(target)
    tables = list(Base.metadata.sorted_tables)
    copied: dict[str, int] = {}

    with source.connect() as source_connection, target.begin() as target_connection:
        occupied = {table.name: target_connection.scalar(select(func.count()).select_from(table)) or 0 for table in tables}
        nonempty = {name: count for name, count in occupied.items() if count}
        if nonempty:
            details = ", ".join(f"{name}={count}" for name, count in sorted(nonempty.items()))
            raise SystemExit(f"Target database is not empty; migration stopped without changing it ({details}).")

        target_connection.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        try:
            for table in tables:
                rows = [dict(row._mapping) for row in source_connection.execute(select(table)).all()]
                if rows:
                    target_connection.execute(table.insert(), rows)
                copied[table.name] = len(rows)
        finally:
            target_connection.execute(text("SET FOREIGN_KEY_CHECKS=1"))

    with target.connect() as connection:
        for table in tables:
            target_count = connection.scalar(select(func.count()).select_from(table)) or 0
            if target_count != copied[table.name]:
                raise SystemExit(f"Verification failed for {table.name}: copied {copied[table.name]}, found {target_count}")

    print("EDUSCAN SQLITE TO MYSQL MIGRATION VERIFIED")
    print("=" * 68)
    print(f"Source: {source_path}")
    print(f"Target: {target.url.render_as_string(hide_password=True)}")
    print()
    for table_name, count in copied.items():
        print(f"  {table_name:<32} {count:>8} row(s)")
    print()
    print(f"Verified {sum(copied.values())} total row(s) across {len(copied)} application tables.")
    print("SQLite records were not changed or deleted; pending schema migrations may have been applied.")
    print("Update backend/.env only after reviewing this result.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
