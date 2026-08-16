from __future__ import annotations

import threading
from datetime import datetime

from ..database import SessionLocal
from .attendance import MANILA, attendance_config, close_day, effective_absence_cutoff, is_instructional_day
from .settings_store import get_json, set_json
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
            state = get_json(db, "attendance:auto_close", {})
            if not config.get("auto_close_enabled", True):
                return {"closed": False, "reason": "disabled"}
            if state.get("last_date") == day.isoformat():
                return {"closed": False, "reason": "already closed"}
            if not is_instructional_day(db, day):
                set_json(db, "attendance:auto_close", {"last_date": day.isoformat(), "result": "non-instructional"})
                return {"closed": False, "reason": "non-instructional"}
            cutoff = effective_absence_cutoff(db, day)
            if current.timetz().replace(tzinfo=None) < cutoff:
                return {"closed": False, "reason": "before cutoff"}
            created = close_day(db, day)
            generate_temporary_log(db, day)
            dispatch_outbox()
            set_json(db, "attendance:auto_close", {"last_date": day.isoformat(), "created": created})
            return {"closed": True, "created": created}

    def _run(self) -> None:
        while not self._stop.wait(30):
            try:
                self.run_once()
            except Exception:
                # The next interval retries; operational failures remain visible in API/outbox logs.
                continue


attendance_scheduler = AttendanceScheduler()
