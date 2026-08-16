from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(30), index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Person(Base):
    __tablename__ = "persons"
    id: Mapped[int] = mapped_column(primary_key=True)
    external_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    lrn: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(180), index=True)
    sex: Mapped[str] = mapped_column(String(10))
    role: Mapped[str] = mapped_column(String(40), index=True)
    grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    section: Mapped[str | None] = mapped_column(String(80), nullable=True)
    assignment: Mapped[str | None] = mapped_column(String(180), nullable=True)
    guardian_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    biometric_consent: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    samples: Mapped[list["BiometricSample"]] = relationship(back_populates="person", cascade="all, delete-orphan")


class ClassSchedule(Base):
    __tablename__ = "class_schedules"
    id: Mapped[int] = mapped_column(primary_key=True)
    grade: Mapped[str] = mapped_column(String(20), index=True)
    section: Mapped[str] = mapped_column(String(80), index=True)
    subject: Mapped[str] = mapped_column(String(120))
    teacher_name: Mapped[str] = mapped_column(String(180))
    weekdays: Mapped[str] = mapped_column(String(40), default="0,1,2,3,4")
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    late_grace_minutes: Mapped[int] = mapped_column(Integer, default=15)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class SchoolYear(Base):
    __tablename__ = "school_years"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class GradingPeriod(Base):
    __tablename__ = "grading_periods"
    __table_args__ = (UniqueConstraint("school_year_id", "quarter", name="uq_school_year_quarter"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    school_year_id: Mapped[int] = mapped_column(ForeignKey("school_years.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    quarter: Mapped[int] = mapped_column(Integer)
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    school_year: Mapped[SchoolYear] = relationship()


class GradeLevel(Base):
    __tablename__ = "grade_levels"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class SchoolSection(Base):
    __tablename__ = "school_sections"
    __table_args__ = (UniqueConstraint("grade_level_id", "name", name="uq_grade_level_section"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    grade_level_id: Mapped[int] = mapped_column(ForeignKey("grade_levels.id"), index=True)
    name: Mapped[str] = mapped_column(String(80), index=True)
    adviser_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    grade_level: Mapped[GradeLevel] = relationship()


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class CalendarException(Base):
    __tablename__ = "calendar_exceptions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    event_date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(40), index=True)
    reason: Mapped[str] = mapped_column(Text)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    absence_cutoff: Mapped[time | None] = mapped_column(Time, nullable=True)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(180))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class ExcusedAbsence(Base):
    __tablename__ = "excused_absences"
    __table_args__ = (UniqueConstraint("person_id", "event_date", name="uq_person_excused_date"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
    event_date: Mapped[date] = mapped_column(Date, index=True)
    reason: Mapped[str] = mapped_column(Text)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(180))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    person: Mapped[Person] = relationship()


class AttendanceEvent(Base):
    __tablename__ = "attendance_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
    event_date: Mapped[date] = mapped_column(Date, index=True)
    event_time: Mapped[time] = mapped_column(Time)
    direction: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(30))
    recognition_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(80), default="Gate camera")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    person: Mapped[Person] = relationship()


class AttendanceCorrection(Base):
    __tablename__ = "attendance_corrections"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
    attendance_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(30))
    time_in: Mapped[time | None] = mapped_column(Time, nullable=True)
    time_out: Mapped[time | None] = mapped_column(Time, nullable=True)
    reason: Mapped[str] = mapped_column(Text)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(180))
    actor_role: Mapped[str] = mapped_column(String(30))
    before_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    person: Mapped[Person] = relationship()


class BiometricSample(Base):
    __tablename__ = "biometric_samples"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
    encrypted_path: Mapped[str] = mapped_column(String(500))
    sha256: Mapped[str] = mapped_column(String(64))
    quality_score: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    person: Mapped[Person] = relationship(back_populates="samples")


class BiometricModel(Base):
    __tablename__ = "biometric_models"
    id: Mapped[int] = mapped_column(primary_key=True)
    version: Mapped[str] = mapped_column(String(80), unique=True)
    file_path: Mapped[str] = mapped_column(String(500))
    sha256: Mapped[str] = mapped_column(String(64))
    threshold: Mapped[float] = mapped_column(Float)
    person_count: Mapped[int] = mapped_column(Integer)
    sample_count: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BiometricAuditEvent(Base):
    __tablename__ = "biometric_audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
    person_external_id: Mapped[str] = mapped_column(String(80))
    person_name: Mapped[str] = mapped_column(String(180))
    action: Mapped[str] = mapped_column(String(30), index=True)
    reason: Mapped[str] = mapped_column(Text)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    actor_name: Mapped[str] = mapped_column(String(180))
    actor_role: Mapped[str] = mapped_column(String(30))
    before_json: Mapped[str] = mapped_column(Text)
    after_json: Mapped[str] = mapped_column(Text)
    model_version: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    person: Mapped[Person] = relationship()


class SmsOutbox(Base):
    __tablename__ = "sms_outbox"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    person_id: Mapped[int | None] = mapped_column(ForeignKey("persons.id"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(30), index=True)
    recipient: Mapped[str] = mapped_column(String(30))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    gateway_message_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    person: Mapped[Person | None] = relationship()


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    encrypted_value: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GradeComponent(Base):
    __tablename__ = "grade_components"
    __table_args__ = (UniqueConstraint("class_key", "category", "sequence", name="uq_grade_component_order"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    class_key: Mapped[str] = mapped_column(String(160), index=True)
    category: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(120))
    weight: Mapped[float] = mapped_column(Float)
    max_score: Mapped[float] = mapped_column(Float, default=100)
    sequence: Mapped[int] = mapped_column(Integer)


class GradeScore(Base):
    __tablename__ = "grade_scores"
    __table_args__ = (UniqueConstraint("person_id", "component_id", name="uq_person_component_score"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
    component_id: Mapped[int] = mapped_column(ForeignKey("grade_components.id"), index=True)
    score: Mapped[float] = mapped_column(Float)
    updated_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GradeChangeAudit(Base):
    __tablename__ = "grade_change_audits"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    class_key: Mapped[str] = mapped_column(String(240), index=True)
    school_year: Mapped[str] = mapped_column(String(30))
    quarter: Mapped[int] = mapped_column(Integer)
    subject: Mapped[str] = mapped_column(String(120))
    reason: Mapped[str] = mapped_column(Text)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    actor_name: Mapped[str] = mapped_column(String(180))
    actor_role: Mapped[str] = mapped_column(String(30))
    before_json: Mapped[str] = mapped_column(Text)
    after_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class RosterImportAudit(Base):
    __tablename__ = "roster_import_audits"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_sha256: Mapped[str] = mapped_column(String(64))
    approved_reference: Mapped[str] = mapped_column(String(300))
    inserted_count: Mapped[int] = mapped_column(Integer)
    updated_count: Mapped[int] = mapped_column(Integer)
    skipped_count: Mapped[int] = mapped_column(Integer)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(180))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class RecordDisposalAudit(Base):
    __tablename__ = "record_disposal_audits"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    subject_reference_hash: Mapped[str] = mapped_column(String(64), index=True)
    reason: Mapped[str] = mapped_column(Text)
    authorization_reference: Mapped[str] = mapped_column(String(300))
    removed_counts_json: Mapped[str] = mapped_column(Text)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(180))
    actor_role: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)


class Intervention(Base):
    __tablename__ = "interventions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("persons.id"), index=True)
    intervention_type: Mapped[str] = mapped_column(String(80))
    note: Mapped[str] = mapped_column(Text)
    actor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    actor_name: Mapped[str] = mapped_column(String(180))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    person: Mapped[Person] = relationship()
