from __future__ import annotations

from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class UserPublic(BaseModel):
    id: int
    username: str
    role: str
    full_name: str
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9._-]+$")
    password: str = Field(min_length=10, max_length=200)
    role: str
    full_name: str = Field(min_length=3, max_length=160)
    active: bool = True

    @field_validator("role")
    @classmethod
    def valid_user_role(cls, value: str) -> str:
        if value not in {"admin", "teacher", "scanner"}:
            raise ValueError("Role must be admin, teacher, or scanner")
        return value


class UserUpdate(BaseModel):
    role: str
    full_name: str = Field(min_length=3, max_length=160)
    active: bool = True
    new_password: str | None = Field(default=None, min_length=10, max_length=200)


class PasswordChangePayload(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=200)


class PersonCreate(BaseModel):
    external_id: str = Field(min_length=2, max_length=80)
    lrn: str | None = Field(default=None, max_length=20)
    full_name: str = Field(min_length=3, max_length=180)
    sex: str
    role: str
    grade: str | None = None
    section: str | None = None
    assignment: str | None = None
    guardian_phone: str | None = None
    biometric_consent: bool = False

    @field_validator("sex")
    @classmethod
    def valid_sex(cls, value: str) -> str:
        if value not in {"Male", "Female"}:
            raise ValueError("Sex must be Male or Female for SF2 placement")
        return value

    @field_validator("role")
    @classmethod
    def valid_role(cls, value: str) -> str:
        allowed = {"Student", "Faculty", "Non-teaching Personnel"}
        if value not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return value


class PersonPublic(PersonCreate):
    id: int
    active: bool
    sample_count: int = 0
    enrolled: bool = False
    model_config = ConfigDict(from_attributes=True)


class SchedulePayload(BaseModel):
    id: int | None = None
    grade: str
    section: str
    subject: str
    teacher_name: str
    weekdays: str = "0,1,2,3,4"
    start_time: time
    end_time: time
    late_grace_minutes: int = Field(default=15, ge=0, le=180)
    active: bool = True


class AttendanceCorrectionPayload(BaseModel):
    person_id: int
    attendance_date: date
    status: str
    time_in: time | None = None
    time_out: time | None = None
    reason: str = Field(min_length=8, max_length=1000)


class AttendanceRow(BaseModel):
    person_id: int
    external_id: str
    lrn: str | None
    full_name: str
    sex: str
    role: str
    grade: str | None
    section: str | None
    assignment: str | None
    time_in: time | None
    time_out: time | None
    status: str
    source: str
    correction_reason: str | None = None


class RecognitionResult(BaseModel):
    recognized: bool
    message: str
    person: dict | None = None
    distance: float | None = None
    quality_score: float | None = None
    attendance_event: dict | None = None


class BiometricChangeReason(BaseModel):
    reason: str = Field(min_length=8, max_length=1000)


class RecordDisposalPayload(BaseModel):
    reason: str = Field(min_length=12, max_length=2000)
    authorization_reference: str = Field(min_length=5, max_length=300)
    confirmation: str = Field(min_length=1, max_length=80)


class SmsSettingsPayload(BaseModel):
    enabled: bool
    gateway_url: str
    username: str
    password: str | None = None
    school_contact: str
    time_in_template: str
    time_out_template: str
    tardiness_template: str
    absence_template: str


class AttendanceSettingsPayload(BaseModel):
    absence_cutoff: time
    duplicate_cooldown_seconds: int = Field(ge=5, le=3600)
    auto_close_enabled: bool = True


class CalendarExceptionPayload(BaseModel):
    event_date: date
    event_type: str
    reason: str = Field(min_length=5, max_length=1000)
    start_time: time | None = None
    end_time: time | None = None
    absence_cutoff: time | None = None

    @field_validator("event_type")
    @classmethod
    def valid_event_type(cls, value: str) -> str:
        if value not in {"Holiday", "Suspended", "Special Schedule"}:
            raise ValueError("Event type must be Holiday, Suspended, or Special Schedule")
        return value


class ExcusedAbsencePayload(BaseModel):
    person_id: int
    event_date: date
    reason: str = Field(min_length=5, max_length=1000)


class CompliancePayload(BaseModel):
    school_approval_reference: str = ""
    parent_consent_process_reference: str = ""
    dpo_pia_reference: str = ""
    sdo_deped_clearance_reference: str = ""
    ai_registry_reference: str = ""
    records_schedule_reference: str = ""
    acceptable_use_policy_reference: str = ""
    breach_response_reference: str = ""


class GradebookPayload(BaseModel):
    class_key: str
    school_year: str = Field(default="2026-2027", min_length=4, max_length=30)
    quarter: int = Field(default=1, ge=1, le=4)
    subject: str = Field(default="Unspecified", min_length=2, max_length=120)
    change_reason: str = Field(default="Authorized gradebook save", min_length=8, max_length=1000)
    passing_grade: int = Field(default=75, ge=60, le=100)
    components: list[dict]
    scores: dict[str, dict[str, float | str]]


class SchoolYearPayload(BaseModel):
    id: int | None = None
    name: str = Field(min_length=4, max_length=30)
    starts_on: date
    ends_on: date
    active: bool = True


class GradingPeriodPayload(BaseModel):
    id: int | None = None
    school_year_id: int
    name: str = Field(min_length=2, max_length=80)
    quarter: int = Field(ge=1, le=4)
    starts_on: date
    ends_on: date
    active: bool = True


class GradeLevelPayload(BaseModel):
    id: int | None = None
    name: str = Field(min_length=1, max_length=30)
    sequence: int = Field(default=0, ge=0, le=100)
    active: bool = True


class SectionPayload(BaseModel):
    id: int | None = None
    grade_level_id: int
    name: str = Field(min_length=1, max_length=80)
    adviser_name: str | None = Field(default=None, max_length=180)
    active: bool = True


class SubjectPayload(BaseModel):
    id: int | None = None
    code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=2, max_length=120)
    active: bool = True


class InterventionPayload(BaseModel):
    person_id: int
    intervention_type: str = Field(min_length=3, max_length=80)
    note: str = Field(min_length=8, max_length=3000)
