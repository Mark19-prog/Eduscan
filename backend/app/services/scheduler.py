from __future__ import annotations

import threading
from datetime import datetime, timezone

from sqlalchemy import select

from ..database import SessionLocal
from ..models import BackupRun
from .attendance import MANILA, attendance_config, close_due_attendance, is_instructional_day
from .backup import rotate_scheduled_backups, run_managed_backup
from .settings_store import get_json, get_secret
from .sf2 import generate_temporary_log
from .sms import dispatch_outbox


class AttendanceScheduler:
    def __init__(self) -> None:
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="eduscan-attendance-close", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=3)

    def run_once(self, now: datetime | None = None) -> dict:
        current = now or datetime.now(MANILA)
        day = current.date()
        with SessionLocal() as db:
            config = attendance_config(db)
            if not config.get("auto_close_enabled", True):
                return {"closed": False, "reason": "disabled"}
            if not is_instructional_day(db, day):
                return {"closed": False, "reason": "non-instructional"}
            created = close_due_attendance(db, day, current.timetz().replace(tzinfo=None))
            if created:
                generate_temporary_log(db, day)
                dispatch_outbox()
            return {"closed": bool(created), "created": created,
                    "reason": "closed due schedules" if created else "no due unclosed schedules"}

    def _run(self) -> None:
        while not self._stop.wait(30):
            try:
                self.run_once()
            except Exception:
                # The next interval retries; operational failures remain visible in API/outbox logs.
                pass
            try:
                # Due retries continue even when daily closing has already run.
                dispatch_outbox()
            except Exception:
                pass
            try:
                self.run_scheduled_backup()
            except Exception:
                continue

    def run_scheduled_backup(self, now: datetime | None = None) -> dict:
        current = now or datetime.now(MANILA)
        with SessionLocal() as db:
            config = get_json(db, "backup.schedule", {"enabled": False})
            if not config.get("enabled"):
                return {"created": False, "reason": "disabled"}
            run_time = datetime.strptime(str(config.get("run_time", "18:00:00")), "%H:%M:%S").time()
            if current.time().replace(tzinfo=None) < run_time:
                return {"created": False, "reason": "not due"}
            last = db.scalar(select(BackupRun).where(
                BackupRun.trigger == "Scheduled", BackupRun.status == "Completed",
            ).order_by(BackupRun.created_at.desc()))
            if last:
                last_local = last.created_at.replace(tzinfo=timezone.utc).astimezone(MANILA)
                if config.get("frequency", "Daily") == "Daily" and last_local.date() == current.date():
                    return {"created": False, "reason": "already completed today"}
                if config.get("frequency") == "Weekly" and last_local.isocalendar()[:2] == current.isocalendar()[:2]:
                    return {"created": False, "reason": "already completed this week"}
            passphrase = get_secret(db, "backup.schedule.passphrase", "")
            if not passphrase:
                return {"created": False, "reason": "passphrase missing"}
            run = run_managed_backup(db, passphrase, "Scheduled", None, str(config.get("destination", "")))
            rotate_scheduled_backups(db, int(config.get("retention_count", 14)))
            return {"created": run.status == "Completed", "run_id": run.id, "status": run.status}


attendance_scheduler = AttendanceScheduler()
