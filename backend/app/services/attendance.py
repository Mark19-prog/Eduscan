from __future__ import annotations

import json
import uuid
from datetime import date, datetime, time, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AttendanceCorrection, AttendanceEvent, CalendarException, ClassSchedule, ExcusedAbsence, Person, User
from .settings_store import get_json
from .sms import queue_notice


MANILA = timezone(timedelta(hours=8), "Asia/Manila")


def local_now() -> datetime:
    return datetime.now(MANILA)


def attendance_config(db: Session) -> dict:
    return {"absence_cutoff": "09:00", "duplicate_cooldown_seconds": 45, "auto_close_enabled": True,
            **get_json(db, "attendance", {})}


def calendar_exception(db: Session, day: date) -> CalendarException | None:
    return db.scalar(select(CalendarException).where(CalendarException.event_date == day))


def is_instructional_day(db: Session, day: date) -> bool:
    if day.weekday() >= 5:
        return False
    exception = calendar_exception(db, day)
    return not exception or exception.event_type == "Special Schedule"


def effective_absence_cutoff(db: Session, day: date) -> time:
    exception = calendar_exception(db, day)
    if exception and exception.event_type == "Special Schedule" and exception.absence_cutoff:
        return exception.absence_cutoff
    return time.fromisoformat(attendance_config(db)["absence_cutoff"])


def applicable_schedule(db: Session, person: Person, day: date) -> ClassSchedule | None:
    if person.role != "Student" or not person.grade or not person.section:
        return None
    schedules = db.scalars(
        select(ClassSchedule).where(
            ClassSchedule.grade == person.grade,
            ClassSchedule.section == person.section,
            ClassSchedule.active.is_(True),
        ).order_by(ClassSchedule.start_time)
    ).all()
    return next((item for item in schedules if str(day.weekday()) in item.weekdays.split(",")), None)


def raw_row(db: Session, person: Person, day: date) -> dict:
    events = db.scalars(
        select(AttendanceEvent).where(AttendanceEvent.person_id == person.id, AttendanceEvent.event_date == day)
        .order_by(AttendanceEvent.event_time, AttendanceEvent.created_at)
    ).all()
    time_in_event = next((event for event in events if event.direction == "Time In"), None)
    time_out_event = next((event for event in reversed(events) if event.direction == "Time Out"), None)
    absence_event = next((event for event in events if event.status == "Absent"), None)
    exception = calendar_exception(db, day)
    excused = db.scalar(select(ExcusedAbsence).where(
        ExcusedAbsence.person_id == person.id, ExcusedAbsence.event_date == day,
    ))
    status = "No scan"
    source = "—"
    if time_in_event:
        last_gate_event = next((event for event in reversed(events) if event.direction in {"Time In", "Time Out"}), time_in_event)
        status = "Time Out" if last_gate_event.direction == "Time Out" else time_in_event.status
        source = last_gate_event.source
    elif excused:
        status, source = "Excused", f"Excused by {excused.actor_name}"
    elif exception and exception.event_type in {"Holiday", "Suspended"}:
        status, source = exception.event_type, exception.reason
    elif day.weekday() >= 5:
        status, source = "Weekend", "Non-instructional day"
    elif absence_event:
        status, source = "Absent", absence_event.source
    correction = db.scalar(
        select(AttendanceCorrection).where(
            AttendanceCorrection.person_id == person.id,
            AttendanceCorrection.attendance_date == day,
        ).order_by(AttendanceCorrection.created_at.desc())
    )
    row = {
        "person_id": person.id,
        "external_id": person.external_id,
        "lrn": person.lrn,
        "full_name": person.full_name,
        "sex": person.sex,
        "role": person.role,
        "grade": person.grade,
        "section": person.section,
        "assignment": person.assignment,
        "time_in": time_in_event.event_time if time_in_event else None,
        "time_out": time_out_event.event_time if time_out_event else None,
        "status": status,
        "source": source,
        "correction_reason": None,
    }
    if correction:
        row.update(time_in=correction.time_in, time_out=correction.time_out, status=correction.status,
                   source=f"Corrected by {correction.actor_name}", correction_reason=correction.reason)
    return row


def list_rows(db: Session, day: date) -> list[dict]:
    people = db.scalars(select(Person).where(Person.active.is_(True)).order_by(Person.role, Person.full_name)).all()
    return [raw_row(db, person, day) for person in people]


def record_gate_match(db: Session, person: Person, distance: float, now: datetime | None = None) -> dict:
    now = now or local_now()
    day, clock = now.date(), now.timetz().replace(tzinfo=None)
    config = attendance_config(db)
    recent = db.scalar(
        select(AttendanceEvent).where(
            AttendanceEvent.person_id == person.id,
            AttendanceEvent.event_date == day,
            AttendanceEvent.direction.in_(["Time In", "Time Out"]),
        ).order_by(AttendanceEvent.created_at.desc())
    )
    utc_now = datetime.utcnow()
    if recent and (utc_now - recent.created_at).total_seconds() < int(config["duplicate_cooldown_seconds"]):
        remaining = int(config["duplicate_cooldown_seconds"] - (utc_now - recent.created_at).total_seconds())
        return {"recorded": False, "message": f"Duplicate scan ignored; try again in {max(1, remaining)} seconds"}
    day_events = db.scalars(
        select(AttendanceEvent).where(
            AttendanceEvent.person_id == person.id,
            AttendanceEvent.event_date == day,
            AttendanceEvent.direction.in_(["Time In", "Time Out"]),
        ).order_by(AttendanceEvent.event_time)
    ).all()
    direction = "Time In" if not day_events or day_events[-1].direction == "Time Out" else "Time Out"
    first_arrival = direction == "Time In" and not any(item.direction == "Time In" for item in day_events)
    schedule = applicable_schedule(db, person, day) if first_arrival else None
    status = "Present" if direction == "Time In" else "Time Out"
    event_type = "time_in" if direction == "Time In" else "time_out"
    day_exception = calendar_exception(db, day)
    schedule_start = day_exception.start_time if day_exception and day_exception.event_type == "Special Schedule" and day_exception.start_time else (schedule.start_time if schedule else None)
    if first_arrival and schedule_start:
        grace = schedule.late_grace_minutes if schedule else 15
        late_boundary = (datetime.combine(day, schedule_start) + timedelta(minutes=grace)).time()
        if clock > late_boundary:
            status, event_type = "Late", "tardiness"
    event = AttendanceEvent(
        id=str(uuid.uuid4()), person_id=person.id, event_date=day, event_time=clock,
        direction=direction, status=status, recognition_distance=distance, source="Gate camera / LBPH",
    )
    db.add(event)
    db.commit()

    values = {
        "time": now.strftime("%I:%M %p"),
        "date": now.strftime("%Y-%m-%d"),
        "class_name": f"{schedule.subject} — Grade {schedule.grade} {schedule.section}" if schedule else (person.assignment or person.role),
        "className": f"{schedule.subject} — Grade {schedule.grade} {schedule.section}" if schedule else (person.assignment or person.role),
        "class_start": schedule_start.strftime("%I:%M %p") if schedule_start else "not configured",
        "classStart": schedule_start.strftime("%I:%M %p") if schedule_start else "not configured",
        "absence_cutoff": config["absence_cutoff"], "absenceCutoff": config["absence_cutoff"],
    }
    sms = queue_notice(db, person, event_type, values)
    return {
        "recorded": True,
        "id": event.id,
        "direction": direction,
        "status": status,
        "date": day.isoformat(),
        "time": clock.isoformat(timespec="seconds"),
        "sms_status": sms.status if sms else "not-applicable",
        "sms_id": sms.id if sms else None,
    }


def close_day(db: Session, day: date) -> int:
    if not is_instructional_day(db, day):
        return 0
    config = attendance_config(db)
    cutoff = effective_absence_cutoff(db, day)
    count = 0
    students = db.scalars(select(Person).where(Person.active.is_(True), Person.role == "Student")).all()
    for person in students:
        row = raw_row(db, person, day)
        if row["status"] != "No scan":
            continue
        event = AttendanceEvent(
            id=str(uuid.uuid4()), person_id=person.id, event_date=day, event_time=cutoff,
            direction="Daily Close", status="Absent", source="Authorized daily close",
        )
        db.add(event)
        db.commit()
        sms = queue_notice(db, person, "absence", {
            "time": cutoff.strftime("%H:%M"), "date": day.isoformat(), "class_name": f"Grade {person.grade} {person.section}",
            "className": f"Grade {person.grade} {person.section}", "class_start": "", "classStart": "",
            "absence_cutoff": cutoff.strftime("%H:%M"), "absenceCutoff": cutoff.strftime("%H:%M"),
        })
        count += 1
    return count


def save_correction(db: Session, payload, actor: User) -> AttendanceCorrection:
    person = db.get(Person, payload.person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    before = raw_row(db, person, payload.attendance_date)
    record = AttendanceCorrection(
        id=str(uuid.uuid4()), person_id=person.id, attendance_date=payload.attendance_date,
        status=payload.status, time_in=payload.time_in, time_out=payload.time_out, reason=payload.reason.strip(),
        actor_user_id=actor.id, actor_name=actor.full_name, actor_role=actor.role,
        before_json=json.dumps(before, default=str),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
