from __future__ import annotations

import re
import uuid
from datetime import datetime

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Person, SmsOutbox
from .settings_store import get_json, get_secret


DEFAULT_TEMPLATES = {
    "time_in": "EduScan: {name} entered San Jose National High School at {time} on {date}. If unexpected, contact {school_contact}.",
    "time_out": "EduScan: {name} left San Jose National High School at {time} on {date}. If unexpected, contact {school_contact}.",
    "tardiness": "EduScan: {name} arrived at {time} on {date} and was marked late for {class_name} (start: {class_start}). Contact {school_contact} for corrections.",
    "absence": "EduScan: No time-in was recorded for {name} by {absence_cutoff} on {date}; the learner was marked absent pending teacher review. Contact {school_contact}.",
}


def sms_config(db: Session) -> dict:
    stored = get_json(db, "sms", {})
    templates = {**DEFAULT_TEMPLATES, **stored.get("templates", {})}
    return {
        "enabled": bool(stored.get("enabled", settings.sms_gateway_enabled)),
        "gateway_url": stored.get("gateway_url", settings.sms_gateway_url),
        "username": stored.get("username", settings.sms_gateway_username),
        "password": get_secret(db, "sms.password", settings.sms_gateway_password),
        "school_contact": stored.get("school_contact", "the school office"),
        "templates": templates,
    }


def normalize_phone(phone: str) -> str:
    compact = re.sub(r"[^0-9+]", "", phone or "")
    if compact.startswith("09") and len(compact) == 11:
        compact = "+63" + compact[1:]
    elif compact.startswith("639") and len(compact) == 12:
        compact = "+" + compact
    if not re.fullmatch(r"\+?[1-9]\d{7,14}", compact):
        raise HTTPException(status_code=422, detail="Recipient phone number is not a valid international or Philippine mobile number")
    return compact


def render_message(db: Session, event_type: str, person: Person, values: dict) -> str:
    config = sms_config(db)
    template = config["templates"].get(event_type)
    if not template:
        raise HTTPException(status_code=422, detail=f"No SMS template is configured for {event_type}")
    context = {
        "name": person.full_name,
        "studentName": person.full_name,
        "school_contact": config["school_contact"],
        "schoolContact": config["school_contact"],
        **values,
    }
    try:
        return template.format_map(context)
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=f"SMS template uses an unknown field: {exc.args[0]}")


def queue_notice(db: Session, person: Person, event_type: str, values: dict) -> SmsOutbox | None:
    if person.role != "Student" or not person.guardian_phone:
        return None
    record = SmsOutbox(
        id=str(uuid.uuid4()),
        person_id=person.id,
        event_type=event_type,
        recipient=normalize_phone(person.guardian_phone),
        message=render_message(db, event_type, person, values),
        status="queued",
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def send_record(db: Session, record: SmsOutbox) -> SmsOutbox:
    config = sms_config(db)
    if not config["enabled"]:
        record.status = "queued"
        record.last_error = "Android SMS gateway is not enabled"
        db.commit()
        return record
    url = config["gateway_url"].rstrip("/") + "/message"
    record.attempts += 1
    try:
        response = httpx.post(
            url,
            auth=(config["username"], config["password"]),
            json={"textMessage": {"text": record.message}, "phoneNumbers": [record.recipient]},
            timeout=12,
        )
        response.raise_for_status()
        payload = response.json() if response.content else {}
        record.gateway_message_id = str(payload.get("id") or payload.get("messageId") or "") or None
        record.status = "sent"
        record.sent_at = datetime.utcnow()
        record.last_error = None
    except Exception as exc:  # Store a concise operational error; never expose the password.
        record.status = "failed"
        record.last_error = str(exc)[:1000]
    db.commit()
    db.refresh(record)
    return record


def dispatch_queued(db: Session, limit: int = 25) -> list[SmsOutbox]:
    records = db.scalars(
        select(SmsOutbox).where(SmsOutbox.status.in_(["queued", "failed"]), SmsOutbox.attempts < 3)
        .order_by(SmsOutbox.created_at).limit(limit)
    ).all()
    return [send_record(db, record) for record in records]


def mask_phone(phone: str) -> str:
    return f"{phone[:3]}••••{phone[-3:]}" if len(phone) > 7 else "••••"


def dispatch_record_by_id(record_id: str) -> None:
    from ..database import SessionLocal
    with SessionLocal() as db:
        record = db.get(SmsOutbox, record_id)
        if record and record.status in {"queued", "failed"} and record.attempts < 3:
            send_record(db, record)


def dispatch_outbox() -> None:
    from ..database import SessionLocal
    with SessionLocal() as db:
        dispatch_queued(db)
