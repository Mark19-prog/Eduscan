from __future__ import annotations

import hashlib
import json
import uuid
from datetime import date, timedelta
from pathlib import Path

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .auth import create_token, current_user, hash_password, require_roles, seed_users, verify_password
from .config import settings
from .database import SessionLocal, engine, get_db
from .migrations import run_migrations
from .models import (
    AttendanceCorrection, AttendanceEvent, BiometricAuditEvent, BiometricModel, BiometricSample, CalendarException,
    ClassSchedule, ExcusedAbsence, GradeChangeAudit, GradeComponent, GradeLevel, GradeScore, GradingPeriod,
    Intervention, Person, RecordDisposalAudit, RosterImportAudit, SchoolSection, SchoolYear, SmsOutbox, Subject, User,
)
from .schemas import (
    AttendanceCorrectionPayload, AttendanceSettingsPayload, BiometricChangeReason, CalendarExceptionPayload,
    CompliancePayload, ExcusedAbsencePayload, GradebookPayload, GradeLevelPayload, GradingPeriodPayload,
    InterventionPayload, LoginRequest, LoginResponse, PasswordChangePayload, PersonCreate, RecognitionResult,
    RecordDisposalPayload, SchedulePayload, SchoolYearPayload, SectionPayload, SmsSettingsPayload, SubjectPayload,
    UserCreate, UserUpdate,
)
from .services.attendance import close_day, list_rows, record_gate_match, save_correction
from .services.backup import BACKUP_DIR, create_secure_backup, stage_secure_restore
from .services.biometrics import biometric_service
from .services.disposal import dispose_person_records
from .services.roster import import_roster
from .services.scheduler import attendance_scheduler
from .services.settings_store import get_json, set_json, set_secret
from .services.sf2 import generate_sf2, generate_temporary_log, save_template, template_path
from .services.sms import dispatch_outbox, dispatch_queued, dispatch_record_by_id, mask_phone, send_record, sms_config


app = FastAPI(title="EduScan API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    run_migrations(engine)
    with SessionLocal() as db:
        seed_users(db)
        biometric_service.purge_obsolete_models(db)
        seed_reference_data(db)
    if settings.attendance_scheduler_enabled:
        attendance_scheduler.start()


@app.on_event("shutdown")
def shutdown() -> None:
    if settings.attendance_scheduler_enabled:
        attendance_scheduler.stop()


def seed_reference_data(db: Session) -> None:
    today = date.today()
    start_year = today.year if today.month >= 6 else today.year - 1
    school_year_name = f"{start_year}-{start_year + 1}"
    school_year = db.scalar(select(SchoolYear).where(SchoolYear.name == school_year_name))
    if not school_year:
        school_year = SchoolYear(name=school_year_name, starts_on=date(start_year, 6, 1),
                                 ends_on=date(start_year + 1, 3, 31), active=True)
        db.add(school_year); db.flush()
        quarter_starts = (date(start_year, 6, 1), date(start_year, 8, 16), date(start_year, 10, 16), date(start_year + 1, 1, 2))
        quarter_ends = (date(start_year, 8, 15), date(start_year, 10, 15), date(start_year, 12, 20), date(start_year + 1, 3, 31))
        for quarter in range(1, 5):
            db.add(GradingPeriod(school_year_id=school_year.id, name=f"Quarter {quarter}", quarter=quarter,
                                 starts_on=quarter_starts[quarter - 1], ends_on=quarter_ends[quarter - 1], active=True))
    grade = db.scalar(select(GradeLevel).where(GradeLevel.name == "10"))
    if not grade:
        grade = GradeLevel(name="10", sequence=10, active=True); db.add(grade); db.flush()
    if not db.scalar(select(SchoolSection).where(SchoolSection.grade_level_id == grade.id, SchoolSection.name == "Rizal")):
        db.add(SchoolSection(grade_level_id=grade.id, name="Rizal", active=True))
    if not db.scalar(select(Subject).where(Subject.code == "MATH")):
        db.add(Subject(code="MATH", name="Mathematics", active=True))
    db.commit()


def person_json(person: Person, db: Session, include_private: bool = True) -> dict:
    count = db.scalar(select(func.count(BiometricSample.id)).where(BiometricSample.person_id == person.id)) or 0
    return {
        "id": person.id, "external_id": person.external_id, "lrn": person.lrn, "full_name": person.full_name,
        "sex": person.sex, "role": person.role, "grade": person.grade, "section": person.section,
        "assignment": person.assignment, "guardian_phone": person.guardian_phone if include_private else None,
        "biometric_consent": person.biometric_consent, "active": person.active,
        "sample_count": count, "enrolled": count >= settings.min_samples,
    }


def correction_json(item: AttendanceCorrection) -> dict:
    return {
        "id": item.id, "person_id": item.person_id, "person_name": item.person.full_name,
        "attendance_date": item.attendance_date, "status": item.status, "time_in": item.time_in,
        "time_out": item.time_out, "reason": item.reason, "actor_name": item.actor_name,
        "actor_role": item.actor_role, "before": json.loads(item.before_json), "created_at": item.created_at,
    }


def biometric_enrollment_json(person: Person, db: Session, include_samples: bool = False) -> dict:
    snapshot = biometric_service.enrollment_snapshot(db, person)
    result = {
        "person_id": person.id, "external_id": person.external_id, "full_name": person.full_name,
        "role": person.role, "grade": person.grade, "section": person.section,
        "assignment": person.assignment, "biometric_consent": person.biometric_consent,
        **snapshot,
    }
    if include_samples:
        samples = db.scalars(
            select(BiometricSample).where(BiometricSample.person_id == person.id)
            .order_by(BiometricSample.created_at, BiometricSample.id)
        ).all()
        result["samples"] = [{"id": item.id, "quality_score": item.quality_score,
                              "created_at": item.created_at} for item in samples]
    return result


def biometric_audit_json(item: BiometricAuditEvent) -> dict:
    return {
        "id": item.id, "person_id": item.person_id, "external_id": item.person_external_id,
        "person_name": item.person_name, "action": item.action, "reason": item.reason,
        "actor_name": item.actor_name, "actor_role": item.actor_role,
        "before": json.loads(item.before_json), "after": json.loads(item.after_json),
        "model_version": item.model_version, "created_at": item.created_at,
    }


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> dict:
    db.execute(select(1))
    active_model = db.scalar(select(BiometricModel).where(BiometricModel.active.is_(True)).order_by(BiometricModel.id.desc()))
    return {
        "ok": True,
        "database": engine.url.get_backend_name(),
        "biometric_enabled": settings.biometric_enabled,
        "active_model": active_model.version if active_model else None,
    }


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return LoginResponse(access_token=create_token(user), role=user.role, full_name=user.full_name)


@app.get("/api/auth/me")
def me(user: User = Depends(current_user)) -> dict:
    return {"id": user.id, "username": user.username, "role": user.role, "full_name": user.full_name}


@app.post("/api/auth/change-password")
def change_password(payload: PasswordChangePayload, db: Session = Depends(get_db),
                    user: User = Depends(current_user)) -> dict:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=422, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=422, detail="New password must be different")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"changed": True}


@app.get("/api/admin/users")
def admin_users(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> list[dict]:
    return [{"id": item.id, "username": item.username, "role": item.role, "full_name": item.full_name,
             "active": item.active, "created_at": item.created_at}
            for item in db.scalars(select(User).order_by(User.full_name)).all()]


@app.post("/api/admin/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db),
                _: User = Depends(require_roles("admin"))) -> dict:
    if db.scalar(select(User).where(User.username == payload.username)):
        raise HTTPException(status_code=409, detail="Username is already in use")
    item = User(username=payload.username, password_hash=hash_password(payload.password), role=payload.role,
                full_name=payload.full_name, active=payload.active)
    db.add(item); db.commit(); db.refresh(item)
    return {"id": item.id}


@app.put("/api/admin/users/{user_id}")
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db),
                actor: User = Depends(require_roles("admin"))) -> dict:
    item = db.get(User, user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Account was not found")
    if payload.role not in {"admin", "teacher", "scanner"}:
        raise HTTPException(status_code=422, detail="Role must be admin, teacher, or scanner")
    if item.id == actor.id and (not payload.active or payload.role != "admin"):
        raise HTTPException(status_code=422, detail="You cannot remove your own active administrator access")
    item.role, item.full_name, item.active = payload.role, payload.full_name, payload.active
    if payload.new_password:
        item.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"saved": True}


@app.delete("/api/admin/users/{user_id}")
def deactivate_user(user_id: int, db: Session = Depends(get_db),
                    actor: User = Depends(require_roles("admin"))) -> dict:
    item = db.get(User, user_id)
    if not item:
        raise HTTPException(status_code=404, detail="Account was not found")
    if item.id == actor.id:
        raise HTTPException(status_code=422, detail="You cannot deactivate your own account")
    item.active = False; db.commit()
    return {"deactivated": True}


@app.get("/api/persons")
def persons(role: str | None = None, grade: str | None = None, section: str | None = None,
            db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "teacher"))) -> list[dict]:
    query = select(Person).where(Person.active.is_(True)).order_by(Person.full_name)
    if role:
        query = query.where(Person.role == role)
    if grade:
        query = query.where(Person.grade == grade)
    if section:
        query = query.where(Person.section == section)
    return [person_json(item, db) for item in db.scalars(query).all()]


@app.post("/api/persons")
def create_person(payload: PersonCreate, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    if db.scalar(select(Person).where(Person.external_id == payload.external_id)):
        raise HTTPException(status_code=409, detail="External ID is already registered")
    if payload.lrn and db.scalar(select(Person).where(Person.lrn == payload.lrn)):
        raise HTTPException(status_code=409, detail="LRN is already registered")
    if payload.role == "Student" and (not payload.grade or not payload.section):
        raise HTTPException(status_code=422, detail="Student grade and section are required")
    person = Person(**payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person_json(person, db)


@app.patch("/api/persons/{person_id}")
def update_person(person_id: int, payload: PersonCreate, db: Session = Depends(get_db),
                  _: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    for key, value in payload.model_dump().items():
        setattr(person, key, value)
    db.commit()
    return person_json(person, db)


@app.get("/api/admin/persons")
def admin_persons(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> list[dict]:
    return [person_json(item, db) for item in db.scalars(select(Person).order_by(Person.active.desc(), Person.full_name)).all()]


@app.post("/api/admin/persons/{person_id}/active")
def set_person_active(person_id: int, active: bool = Form(...), db: Session = Depends(get_db),
                      _: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    person.active = active; db.commit()
    return person_json(person, db)


@app.delete("/api/admin/persons/{person_id}/records")
def dispose_person(person_id: int, payload: RecordDisposalPayload, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    return dispose_person_records(db, person, user, payload.reason, payload.authorization_reference, payload.confirmation)


@app.get("/api/admin/disposals")
def disposal_audits(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> list[dict]:
    items = db.scalars(select(RecordDisposalAudit).order_by(RecordDisposalAudit.created_at.desc()).limit(500)).all()
    return [{"id": item.id, "disposal_reference": item.subject_reference_hash[:12], "reason": item.reason,
             "authorization_reference": item.authorization_reference, "removed_counts": json.loads(item.removed_counts_json),
             "actor_name": item.actor_name, "actor_role": item.actor_role, "created_at": item.created_at} for item in items]


@app.post("/api/admin/roster/import")
async def roster_import(file: UploadFile = File(...), approved_reference: str = Form(...),
                        dry_run: bool = Form(True), db: Session = Depends(get_db),
                        user: User = Depends(require_roles("admin"))) -> dict:
    filename = file.filename or "roster.xlsx"
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=422, detail="Upload an approved .xlsx roster workbook")
    return import_roster(db, await file.read(), filename, approved_reference, user, dry_run)


@app.get("/api/admin/roster/imports")
def roster_imports(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> list[dict]:
    items = db.scalars(select(RosterImportAudit).order_by(RosterImportAudit.created_at.desc()).limit(200)).all()
    return [{"id": item.id, "filename": item.filename, "file_sha256": item.file_sha256,
             "approved_reference": item.approved_reference, "inserted_count": item.inserted_count,
             "updated_count": item.updated_count, "skipped_count": item.skipped_count,
             "actor_name": item.actor_name, "created_at": item.created_at} for item in items]


@app.get("/api/admin/backups")
def list_backups(_: User = Depends(require_roles("admin"))) -> list[dict]:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    return [{"filename": path.name, "size_bytes": path.stat().st_size,
             "created_at": __import__("datetime").datetime.fromtimestamp(path.stat().st_mtime)}
            for path in sorted(BACKUP_DIR.glob("*.edubak"), key=lambda item: item.stat().st_mtime, reverse=True)]


@app.post("/api/admin/backups")
def create_backup(passphrase: str = Form(...), _: User = Depends(require_roles("admin"))) -> dict:
    path = create_secure_backup(passphrase)
    return {"created": True, "filename": path.name, "size_bytes": path.stat().st_size}


@app.get("/api/admin/backups/{filename}")
def download_backup(filename: str, _: User = Depends(require_roles("admin"))):
    if Path(filename).name != filename or not filename.endswith(".edubak"):
        raise HTTPException(status_code=404, detail="Backup was not found")
    path = BACKUP_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Backup was not found")
    return FileResponse(path, filename=filename, media_type="application/octet-stream")


@app.post("/api/admin/backups/restore")
async def restore_backup(file: UploadFile = File(...), passphrase: str = Form(...),
                         confirmation: str = Form(...), _: User = Depends(require_roles("admin"))) -> dict:
    if confirmation != "STAGE RESTORE":
        raise HTTPException(status_code=422, detail="Type STAGE RESTORE to confirm recovery staging")
    if not (file.filename or "").lower().endswith(".edubak"):
        raise HTTPException(status_code=422, detail="Upload an EduScan .edubak file")
    data = await file.read(251 * 1024 * 1024)
    if len(data) > 250 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Backup exceeds the 250 MB recovery limit")
    return stage_secure_restore(data, passphrase)


@app.post("/api/biometrics/enroll/{person_id}")
async def enroll(person_id: int, frames: list[UploadFile] = File(...),
                 reason: str = Form("Initial facial enrollment"), db: Session = Depends(get_db),
                 user: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    if len(frames) > 40:
        raise HTTPException(status_code=422, detail="Enrollment accepts at most 40 frames")
    contents = [await frame.read() for frame in frames]
    return biometric_service.enroll(db, person, contents, user, reason)


@app.get("/api/biometrics/enrollments")
def biometric_enrollments(db: Session = Depends(get_db),
                          _: User = Depends(require_roles("admin"))) -> list[dict]:
    people = db.scalars(
        select(Person).join(BiometricSample).group_by(Person.id).order_by(Person.full_name)
    ).all()
    return [biometric_enrollment_json(person, db) for person in people]


@app.get("/api/biometrics/enrollments/audit")
def biometric_audit(person_id: int | None = None, limit: int = Query(default=500, ge=1, le=2000),
                    db: Session = Depends(get_db),
                    _: User = Depends(require_roles("admin"))) -> list[dict]:
    query = select(BiometricAuditEvent)
    if person_id is not None:
        query = query.where(BiometricAuditEvent.person_id == person_id)
    query = query.order_by(BiometricAuditEvent.created_at.desc()).limit(limit)
    return [biometric_audit_json(item) for item in db.scalars(query).all()]


@app.get("/api/biometrics/enrollments/{person_id}")
def biometric_enrollment(person_id: int, db: Session = Depends(get_db),
                         _: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    result = biometric_enrollment_json(person, db, include_samples=True)
    if not result["sample_count"]:
        raise HTTPException(status_code=404, detail="This person does not have a facial enrollment")
    return result


@app.post("/api/biometrics/enrollments/{person_id}")
async def create_biometric_enrollment(person_id: int, frames: list[UploadFile] = File(...),
                                      reason: str = Form("Initial facial enrollment"),
                                      db: Session = Depends(get_db),
                                      user: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    if len(frames) > 40:
        raise HTTPException(status_code=422, detail="Enrollment accepts at most 40 frames")
    return biometric_service.enroll(db, person, [await frame.read() for frame in frames], user, reason,
                                    require_existing=False)


@app.put("/api/biometrics/enrollments/{person_id}")
async def update_biometric_enrollment(person_id: int, frames: list[UploadFile] = File(...),
                                      reason: str = Form(...), db: Session = Depends(get_db),
                                      user: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    if len(frames) > 40:
        raise HTTPException(status_code=422, detail="Enrollment accepts at most 40 frames")
    return biometric_service.enroll(db, person, [await frame.read() for frame in frames], user, reason,
                                    require_existing=True)


@app.delete("/api/biometrics/enrollments/{person_id}")
def delete_biometric_enrollment(person_id: int, payload: BiometricChangeReason,
                                db: Session = Depends(get_db),
                                user: User = Depends(require_roles("admin"))) -> dict:
    person = db.get(Person, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    return biometric_service.delete_enrollment(db, person, user, payload.reason)


@app.post("/api/biometrics/train")
def train(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    return biometric_service.train(db)


@app.get("/api/biometrics/status")
def biometric_status(db: Session = Depends(get_db), _: User = Depends(current_user)) -> dict:
    active = db.scalar(select(BiometricModel).where(BiometricModel.active.is_(True)).order_by(BiometricModel.id.desc()))
    return {
        "enabled": settings.biometric_enabled, "minimum_samples": settings.min_samples,
        "threshold": settings.lbph_threshold,
        "model": None if not active else {"version": active.version, "person_count": active.person_count,
                                            "sample_count": active.sample_count, "created_at": active.created_at},
    }


@app.post("/api/biometrics/recognize", response_model=RecognitionResult)
async def recognize(background_tasks: BackgroundTasks, frame: UploadFile = File(...), db: Session = Depends(get_db),
                    _: User = Depends(require_roles("admin", "scanner"))) -> RecognitionResult:
    person, distance, quality = biometric_service.recognize(db, await frame.read())
    if person is None:
        return RecognitionResult(recognized=False, message="Face was not recognized with sufficient confidence",
                                 distance=round(distance, 2), quality_score=quality)
    event = record_gate_match(db, person, distance)
    if event.get("recorded"):
        generate_temporary_log(db, date.fromisoformat(event["date"]))
        if event.get("sms_id"):
            background_tasks.add_task(dispatch_record_by_id, event["sms_id"])
    return RecognitionResult(recognized=True, message=event["message"] if not event.get("recorded") else "Identity verified and attendance recorded",
                             person={"id": person.id, "full_name": person.full_name, "role": person.role},
                             distance=round(distance, 2), quality_score=quality,
                             attendance_event=event)


@app.post("/api/biometrics/recognize-many")
async def recognize_many(background_tasks: BackgroundTasks, frame: UploadFile = File(...),
                         db: Session = Depends(get_db),
                         _: User = Depends(require_roles("admin", "scanner"))) -> dict:
    matches = biometric_service.recognize_many(db, await frame.read())
    results = []
    for person, distance, quality, box in matches:
        if person is None:
            results.append({"recognized": False, "message": "Face was not recognized with sufficient confidence",
                            "distance": round(distance, 2), "quality_score": quality, "box": box})
            continue
        event = record_gate_match(db, person, distance)
        if event.get("recorded"):
            if event.get("sms_id"):
                background_tasks.add_task(dispatch_record_by_id, event["sms_id"])
        results.append({"recognized": True, "message": event["message"] if not event.get("recorded") else "Identity verified and attendance recorded",
                        "person": {"id": person.id, "full_name": person.full_name, "role": person.role},
                        "distance": round(distance, 2), "quality_score": quality,
                        "attendance_event": event, "box": box})
    if any(item.get("attendance_event", {}).get("recorded") for item in results):
        generate_temporary_log(db, date.today())
    return {"face_count": len(matches), "recognized_count": sum(item["recognized"] for item in results),
            "results": results}


@app.get("/api/attendance")
def attendance(day: date = Query(alias="date"), db: Session = Depends(get_db),
               _: User = Depends(require_roles("admin", "teacher"))) -> list[dict]:
    return list_rows(db, day)


@app.get("/api/gate/recent")
def gate_recent(day: date = Query(alias="date"), db: Session = Depends(get_db),
                _: User = Depends(require_roles("admin", "scanner"))) -> list[dict]:
    events = db.scalars(select(AttendanceEvent).where(
        AttendanceEvent.event_date == day, AttendanceEvent.direction.in_(["Time In", "Time Out"]),
    ).order_by(AttendanceEvent.created_at.desc()).limit(30)).all()
    return [{"id": item.id, "name": item.person.full_name, "role": item.person.role,
             "direction": item.direction, "status": item.status, "time": item.event_time} for item in events]


@app.post("/api/attendance/close")
def attendance_close(background_tasks: BackgroundTasks, day: date = Query(alias="date"), db: Session = Depends(get_db),
                     _: User = Depends(require_roles("admin", "teacher"))) -> dict:
    created = close_day(db, day)
    generate_temporary_log(db, day)
    background_tasks.add_task(dispatch_outbox)
    return {"created": created}


@app.get("/api/attendance/corrections")
def corrections(db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "teacher"))) -> list[dict]:
    items = db.scalars(select(AttendanceCorrection).order_by(AttendanceCorrection.created_at.desc()).limit(500)).all()
    return [correction_json(item) for item in items]


@app.post("/api/attendance/corrections")
def correct(payload: AttendanceCorrectionPayload, db: Session = Depends(get_db),
            user: User = Depends(require_roles("admin", "teacher"))) -> dict:
    item = save_correction(db, payload, user)
    generate_temporary_log(db, payload.attendance_date)
    return correction_json(item)


@app.get("/api/attendance/temporary-log")
def temporary_log(day: date = Query(alias="date"), db: Session = Depends(get_db),
                  _: User = Depends(require_roles("admin", "teacher"))) -> FileResponse:
    path = generate_temporary_log(db, day)
    return FileResponse(path, filename=path.name, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@app.get("/api/schedules")
def schedules(db: Session = Depends(get_db), _: User = Depends(current_user)) -> list[dict]:
    return [{"id": item.id, "grade": item.grade, "section": item.section, "subject": item.subject,
             "teacher_name": item.teacher_name, "weekdays": item.weekdays, "start_time": item.start_time,
             "end_time": item.end_time, "late_grace_minutes": item.late_grace_minutes, "active": item.active}
            for item in db.scalars(select(ClassSchedule).order_by(ClassSchedule.grade, ClassSchedule.section, ClassSchedule.start_time)).all()]


@app.post("/api/schedules")
def save_schedule(payload: SchedulePayload, db: Session = Depends(get_db),
                  _: User = Depends(require_roles("admin", "teacher"))) -> dict:
    record = db.get(ClassSchedule, payload.id) if payload.id else ClassSchedule()
    for key, value in payload.model_dump(exclude={"id"}).items():
        setattr(record, key, value)
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id}


@app.delete("/api/schedules/{schedule_id}")
def remove_schedule(schedule_id: int, db: Session = Depends(get_db),
                    _: User = Depends(require_roles("admin", "teacher"))) -> dict:
    record = db.get(ClassSchedule, schedule_id)
    if not record:
        raise HTTPException(status_code=404, detail="Schedule was not found")
    db.delete(record)
    db.commit()
    return {"deleted": True}


@app.get("/api/calendar/exceptions")
def calendar_exceptions(db: Session = Depends(get_db),
                        _: User = Depends(require_roles("admin", "teacher"))) -> list[dict]:
    items = db.scalars(select(CalendarException).order_by(CalendarException.event_date.desc())).all()
    return [{"id": item.id, "event_date": item.event_date, "event_type": item.event_type,
             "reason": item.reason, "start_time": item.start_time, "end_time": item.end_time,
             "absence_cutoff": item.absence_cutoff, "actor_name": item.actor_name,
             "created_at": item.created_at} for item in items]


@app.post("/api/calendar/exceptions")
def save_calendar_exception(payload: CalendarExceptionPayload, db: Session = Depends(get_db),
                            user: User = Depends(require_roles("admin", "teacher"))) -> dict:
    item = db.scalar(select(CalendarException).where(CalendarException.event_date == payload.event_date))
    if not item:
        item = CalendarException(id=str(uuid.uuid4()), event_date=payload.event_date,
                                 actor_user_id=user.id, actor_name=user.full_name)
    if payload.event_type == "Special Schedule" and not payload.start_time:
        raise HTTPException(status_code=422, detail="A special schedule requires a start time")
    for key, value in payload.model_dump(exclude={"event_date"}).items():
        setattr(item, key, value)
    db.add(item); db.commit()
    return {"id": item.id}


@app.delete("/api/calendar/exceptions/{exception_id}")
def delete_calendar_exception(exception_id: str, db: Session = Depends(get_db),
                              _: User = Depends(require_roles("admin", "teacher"))) -> dict:
    item = db.get(CalendarException, exception_id)
    if not item:
        raise HTTPException(status_code=404, detail="Calendar exception was not found")
    db.delete(item); db.commit()
    return {"deleted": True}


@app.get("/api/attendance/excused")
def excused_absences(db: Session = Depends(get_db),
                     _: User = Depends(require_roles("admin", "teacher"))) -> list[dict]:
    items = db.scalars(select(ExcusedAbsence).order_by(ExcusedAbsence.event_date.desc(), ExcusedAbsence.created_at.desc())).all()
    return [{"id": item.id, "person_id": item.person_id, "person_name": item.person.full_name,
             "event_date": item.event_date, "reason": item.reason, "actor_name": item.actor_name,
             "created_at": item.created_at} for item in items]


@app.post("/api/attendance/excused")
def save_excused_absence(payload: ExcusedAbsencePayload, db: Session = Depends(get_db),
                         user: User = Depends(require_roles("admin", "teacher"))) -> dict:
    person = db.get(Person, payload.person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Person was not found")
    item = db.scalar(select(ExcusedAbsence).where(
        ExcusedAbsence.person_id == payload.person_id, ExcusedAbsence.event_date == payload.event_date,
    ))
    if not item:
        item = ExcusedAbsence(id=str(uuid.uuid4()), person_id=person.id, event_date=payload.event_date,
                              actor_user_id=user.id, actor_name=user.full_name)
    item.reason = payload.reason.strip(); db.add(item); db.commit()
    return {"id": item.id}


@app.delete("/api/attendance/excused/{excused_id}")
def delete_excused_absence(excused_id: str, db: Session = Depends(get_db),
                           _: User = Depends(require_roles("admin", "teacher"))) -> dict:
    item = db.get(ExcusedAbsence, excused_id)
    if not item:
        raise HTTPException(status_code=404, detail="Excused absence was not found")
    db.delete(item); db.commit()
    return {"deleted": True}


@app.get("/api/admin/academic-structure")
def academic_structure(db: Session = Depends(get_db), _: User = Depends(current_user)) -> dict:
    years = db.scalars(select(SchoolYear).order_by(SchoolYear.starts_on.desc())).all()
    periods = db.scalars(select(GradingPeriod).order_by(GradingPeriod.school_year_id.desc(), GradingPeriod.quarter)).all()
    grades = db.scalars(select(GradeLevel).order_by(GradeLevel.sequence, GradeLevel.name)).all()
    sections = db.scalars(select(SchoolSection).order_by(SchoolSection.grade_level_id, SchoolSection.name)).all()
    subjects = db.scalars(select(Subject).order_by(Subject.name)).all()
    return {
        "school_years": [{"id": item.id, "name": item.name, "starts_on": item.starts_on, "ends_on": item.ends_on, "active": item.active} for item in years],
        "grading_periods": [{"id": item.id, "school_year_id": item.school_year_id, "school_year": item.school_year.name,
                             "name": item.name, "quarter": item.quarter, "starts_on": item.starts_on,
                             "ends_on": item.ends_on, "active": item.active} for item in periods],
        "grade_levels": [{"id": item.id, "name": item.name, "sequence": item.sequence, "active": item.active} for item in grades],
        "sections": [{"id": item.id, "grade_level_id": item.grade_level_id, "grade": item.grade_level.name,
                      "name": item.name, "adviser_name": item.adviser_name, "active": item.active} for item in sections],
        "subjects": [{"id": item.id, "code": item.code, "name": item.name, "active": item.active} for item in subjects],
    }


def _save_reference(db: Session, model, payload, exclude: set[str] = {"id"}) -> dict:
    item = db.get(model, payload.id) if payload.id else model()
    if payload.id and not item:
        raise HTTPException(status_code=404, detail="Reference record was not found")
    for key, value in payload.model_dump(exclude=exclude).items():
        setattr(item, key, value)
    try:
        db.add(item); db.commit(); db.refresh(item)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="A matching reference record already exists") from exc
    return {"id": item.id}


@app.post("/api/admin/school-years")
def save_school_year(payload: SchoolYearPayload, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    if payload.ends_on <= payload.starts_on:
        raise HTTPException(status_code=422, detail="School year end date must follow its start date")
    return _save_reference(db, SchoolYear, payload)


@app.post("/api/admin/grading-periods")
def save_grading_period(payload: GradingPeriodPayload, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    if payload.ends_on <= payload.starts_on or not db.get(SchoolYear, payload.school_year_id):
        raise HTTPException(status_code=422, detail="Grading-period dates or school year are invalid")
    return _save_reference(db, GradingPeriod, payload)


@app.post("/api/admin/grade-levels")
def save_grade_level(payload: GradeLevelPayload, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    return _save_reference(db, GradeLevel, payload)


@app.post("/api/admin/sections")
def save_section(payload: SectionPayload, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    if not db.get(GradeLevel, payload.grade_level_id):
        raise HTTPException(status_code=422, detail="Grade level was not found")
    return _save_reference(db, SchoolSection, payload)


@app.post("/api/admin/subjects")
def save_subject(payload: SubjectPayload, db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    return _save_reference(db, Subject, payload)


@app.delete("/api/admin/reference/{kind}/{record_id}")
def delete_reference(kind: str, record_id: int, db: Session = Depends(get_db),
                     _: User = Depends(require_roles("admin"))) -> dict:
    models = {"school-years": SchoolYear, "grading-periods": GradingPeriod, "grade-levels": GradeLevel,
              "sections": SchoolSection, "subjects": Subject}
    model = models.get(kind)
    if not model:
        raise HTTPException(status_code=404, detail="Reference type was not found")
    item = db.get(model, record_id)
    if not item:
        raise HTTPException(status_code=404, detail="Reference record was not found")
    try:
        db.delete(item); db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This record is still referenced; deactivate it instead") from exc
    return {"deleted": True}


@app.get("/api/settings")
def read_settings(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    sms = sms_config(db)
    return {
        "attendance": {"absence_cutoff": "09:00", "duplicate_cooldown_seconds": 45,
                       "auto_close_enabled": True, **get_json(db, "attendance", {})},
        "sms": {**sms, "password": "", "password_configured": bool(sms["password"])},
        "compliance": get_json(db, "compliance", {}),
        "retention": get_json(db, "retention", {"sms_days": 90, "correction_audit_years": 5}),
    }


@app.put("/api/settings/attendance")
def save_attendance_settings(payload: AttendanceSettingsPayload, db: Session = Depends(get_db),
                             _: User = Depends(require_roles("admin"))) -> dict:
    value = {"absence_cutoff": payload.absence_cutoff.strftime("%H:%M"),
             "duplicate_cooldown_seconds": payload.duplicate_cooldown_seconds,
             "auto_close_enabled": payload.auto_close_enabled}
    set_json(db, "attendance", value)
    return value


@app.post("/api/attendance/auto-close/run")
def run_automatic_close(_: User = Depends(require_roles("admin"))) -> dict:
    return attendance_scheduler.run_once()


@app.put("/api/settings/sms")
def save_sms_settings(payload: SmsSettingsPayload, db: Session = Depends(get_db),
                      _: User = Depends(require_roles("admin"))) -> dict:
    set_json(db, "sms", {"enabled": payload.enabled, "gateway_url": payload.gateway_url, "username": payload.username,
                         "school_contact": payload.school_contact,
                         "templates": {"time_in": payload.time_in_template, "time_out": payload.time_out_template,
                                       "tardiness": payload.tardiness_template, "absence": payload.absence_template}})
    if payload.password is not None:
        set_secret(db, "sms.password", payload.password)
    return {"saved": True}


@app.put("/api/settings/compliance")
def save_compliance(payload: CompliancePayload, db: Session = Depends(get_db),
                    _: User = Depends(require_roles("admin"))) -> dict:
    set_json(db, "compliance", payload.model_dump())
    return payload.model_dump()


@app.get("/api/sms/outbox")
def outbox(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> list[dict]:
    items = db.scalars(select(SmsOutbox).order_by(SmsOutbox.created_at.desc()).limit(500)).all()
    return [{"id": item.id, "event_type": item.event_type, "recipient": mask_phone(item.recipient),
             "message": item.message, "status": item.status, "attempts": item.attempts,
             "last_error": item.last_error, "created_at": item.created_at, "sent_at": item.sent_at} for item in items]


@app.post("/api/sms/dispatch")
def dispatch(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    records = dispatch_queued(db)
    return {"processed": len(records), "sent": sum(record.status == "sent" for record in records)}


@app.post("/api/sms/test")
def test_sms(phone: str = Form(...), message: str = Form("EduScan Android gateway connection test."),
             db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))) -> dict:
    from .models import SmsOutbox
    from .services.sms import normalize_phone
    record = SmsOutbox(id=__import__("uuid").uuid4().hex, event_type="test", recipient=normalize_phone(phone), message=message, status="queued")
    db.add(record)
    db.commit()
    send_record(db, record)
    return {"status": record.status, "error": record.last_error}


@app.get("/api/sf2/template")
def sf2_status(_: User = Depends(require_roles("admin", "teacher"))) -> dict:
    try:
        path = template_path()
        return {"configured": True, "filename": path.name}
    except HTTPException:
        return {"configured": False, "filename": None}


@app.post("/api/sf2/template")
async def upload_sf2(file: UploadFile = File(...), _: User = Depends(require_roles("admin"))) -> dict:
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=422, detail="Upload an .xlsx SF2 workbook")
    path = save_template(await file.read())
    return {"configured": True, "filename": path.name}


@app.get("/api/sf2/export")
def sf2_export(year: int, month: int, grade: str, section: str, school_id: str = "",
               school_year: str = "", school_name: str = "SAN JOSE NATIONAL HIGH SCHOOL",
               db: Session = Depends(get_db), _: User = Depends(require_roles("admin", "teacher"))) -> FileResponse:
    if not 1 <= month <= 12:
        raise HTTPException(status_code=422, detail="Month must be between 1 and 12")
    path = generate_sf2(db, year, month, grade, section, school_id, school_year, school_name)
    return FileResponse(path, filename=path.name, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


def gradebook_data(class_key: str, db: Session) -> dict:
    components = db.scalars(select(GradeComponent).where(GradeComponent.class_key == class_key).order_by(GradeComponent.sequence)).all()
    component_ids = [item.id for item in components]
    scores = db.scalars(select(GradeScore).where(GradeScore.component_id.in_(component_ids))).all() if component_ids else []
    grouped_scores: dict[str, dict[str, float]] = {}
    for score in scores:
        grouped_scores.setdefault(str(score.person_id), {})[str(score.component_id)] = score.score
    rules = get_json(db, f"gradebook:{class_key}:rules", {"passing_grade": 75, "school_year": "2026-2027",
                                                            "quarter": 1, "subject": "Unspecified"})
    return {
        "class_key": class_key,
        "passing_grade": rules.get("passing_grade", 75),
        "school_year": rules.get("school_year", "2026-2027"),
        "quarter": rules.get("quarter", 1),
        "subject": rules.get("subject", "Unspecified"),
        "components": [{"id": str(item.id), "category": item.category, "label": item.label, "weight": item.weight,
                        "max_score": item.max_score, "sequence": item.sequence} for item in components],
        "scores": grouped_scores,
    }


@app.get("/api/gradebook/{class_key}")
def read_gradebook(class_key: str, db: Session = Depends(get_db),
                   _: User = Depends(require_roles("admin", "teacher"))) -> dict:
    return gradebook_data(class_key, db)


@app.put("/api/gradebook/{class_key}")
def save_gradebook(class_key: str, payload: GradebookPayload, db: Session = Depends(get_db),
                   user: User = Depends(require_roles("admin", "teacher"))) -> dict:
    if payload.class_key != class_key:
        raise HTTPException(status_code=422, detail="Class key does not match URL")
    weighted = [item for item in payload.components if item.get("category") != "Manual Overall"]
    if round(sum(float(item.get("weight", 0)) for item in weighted), 4) != 100:
        raise HTTPException(status_code=422, detail="Grade component weights must total exactly 100%")
    before = gradebook_data(class_key, db)
    old_ids = list(db.scalars(select(GradeComponent.id).where(GradeComponent.class_key == class_key)).all())
    if old_ids:
        db.execute(delete(GradeScore).where(GradeScore.component_id.in_(old_ids)))
        db.execute(delete(GradeComponent).where(GradeComponent.id.in_(old_ids)))
    key_map: dict[str, int] = {}
    for sequence, item in enumerate(payload.components):
        record = GradeComponent(class_key=class_key, category=str(item.get("category", "Assessment")),
                                label=str(item.get("label", f"Assessment {sequence + 1}")),
                                weight=float(item.get("weight", 0)), max_score=float(item.get("max_score", 100)), sequence=sequence)
        db.add(record)
        db.flush()
        key_map[str(item.get("id", sequence))] = record.id
    for person_id, person_scores in payload.scores.items():
        for client_id, score in person_scores.items():
            if client_id not in key_map or score in ("", None):
                continue
            numeric = float(score)
            if numeric < 0:
                raise HTTPException(status_code=422, detail="Scores cannot be negative")
            db.add(GradeScore(person_id=int(person_id), component_id=key_map[client_id], score=numeric, updated_by=user.id))
    db.flush()
    set_json(db, f"gradebook:{class_key}:rules", {"passing_grade": payload.passing_grade,
             "school_year": payload.school_year, "quarter": payload.quarter, "subject": payload.subject}, commit=False)
    after = gradebook_data(class_key, db)
    db.add(GradeChangeAudit(id=str(uuid.uuid4()), class_key=class_key, school_year=payload.school_year,
                           quarter=payload.quarter, subject=payload.subject, reason=payload.change_reason.strip(),
                           actor_user_id=user.id, actor_name=user.full_name, actor_role=user.role,
                           before_json=json.dumps(before, default=str), after_json=json.dumps(after, default=str)))
    db.commit()
    return {"saved": True, "component_count": len(key_map)}


@app.get("/api/gradebook/{class_key}/audit")
def gradebook_audit(class_key: str, db: Session = Depends(get_db),
                    _: User = Depends(require_roles("admin", "teacher"))) -> list[dict]:
    items = db.scalars(select(GradeChangeAudit).where(GradeChangeAudit.class_key == class_key)
                       .order_by(GradeChangeAudit.created_at.desc()).limit(200)).all()
    return [{"id": item.id, "school_year": item.school_year, "quarter": item.quarter,
             "subject": item.subject, "reason": item.reason, "actor_name": item.actor_name,
             "actor_role": item.actor_role, "before": json.loads(item.before_json),
             "after": json.loads(item.after_json), "created_at": item.created_at} for item in items]


@app.get("/api/dashboard")
def dashboard(day: date = Query(default_factory=date.today), db: Session = Depends(get_db),
              _: User = Depends(require_roles("admin", "teacher"))) -> dict:
    rows = list_rows(db, day)
    events = db.scalars(select(AttendanceEvent).where(AttendanceEvent.event_date == day).order_by(AttendanceEvent.created_at.desc()).limit(20)).all()
    return {
        "rows": rows,
        "events": [{"id": item.id, "person": item.person.full_name, "role": item.person.role, "time": item.event_time,
                    "direction": item.direction, "status": item.status} for item in events],
        "sms": {status: db.scalar(select(func.count(SmsOutbox.id)).where(SmsOutbox.status == status)) or 0
                for status in ("queued", "sent", "failed")},
    }


@app.get("/api/interventions")
def interventions(days: int = 90, threshold: int = 5, db: Session = Depends(get_db),
                  _: User = Depends(require_roles("admin", "teacher"))) -> list[dict]:
    if not 1 <= days <= 366 or not 1 <= threshold <= 100:
        raise HTTPException(status_code=422, detail="Intervention range is invalid")
    students = db.scalars(select(Person).where(Person.active.is_(True), Person.role == "Student").order_by(Person.full_name)).all()
    end = date.today()
    start = end - timedelta(days=days - 1)
    absence_dates: dict[int, list[date]] = {person.id: [] for person in students}
    cursor = start
    while cursor <= end:
        if cursor.weekday() < 5:
            for row in list_rows(db, cursor):
                if row["role"] == "Student" and row["status"] == "Absent":
                    absence_dates.setdefault(row["person_id"], []).append(cursor)
        cursor += timedelta(days=1)
    result = []
    for person in students:
        absent_dates = absence_dates.get(person.id, [])
        if len(absent_dates) < threshold:
            continue
        logs = db.scalars(select(Intervention).where(Intervention.person_id == person.id).order_by(Intervention.created_at.desc())).all()
        result.append({"person": person_json(person, db), "absence_count": len(absent_dates),
                       "last_absence": max(absent_dates), "logs": [{"id": item.id, "intervention_type": item.intervention_type,
                       "note": item.note, "actor_name": item.actor_name, "created_at": item.created_at} for item in logs]})
    return result


@app.post("/api/interventions")
def add_intervention(payload: InterventionPayload, db: Session = Depends(get_db),
                     user: User = Depends(require_roles("admin", "teacher"))) -> dict:
    person = db.get(Person, payload.person_id)
    if not person or person.role != "Student":
        raise HTTPException(status_code=404, detail="Student was not found")
    import uuid
    item = Intervention(id=str(uuid.uuid4()), person_id=person.id, intervention_type=payload.intervention_type.strip(),
                        note=payload.note.strip(), actor_user_id=user.id, actor_name=user.full_name)
    db.add(item)
    db.commit()
    return {"id": item.id, "created_at": item.created_at}
