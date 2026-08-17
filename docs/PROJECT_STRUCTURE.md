# EduScan project structure

This guide explains how EduScan is organized, how a request moves through the system, and what each maintained project file is responsible for. Runtime databases, encrypted biometric artifacts, generated reports, logs, dependency folders, and local secrets are intentionally excluded from Git.

## System overview

EduScan is a local-first client-server application with layered responsibilities:

1. The React client renders role-based administrator, teacher, and gate-scanner interfaces.
2. `src/api/client.js` sends authenticated HTTP requests to the local FastAPI server.
3. FastAPI endpoints validate requests, enforce roles, and delegate work to backend services.
4. Service modules implement attendance, LBPH biometrics, SMS, spreadsheet reporting, imports, backups, disposal, and scheduling.
5. SQLAlchemy persists structured records in SQLite by default. MySQL can be selected through `DATABASE_URL`.
6. Encrypted face samples and LBPH model artifacts are stored outside the web root, while their metadata and audit history are stored in SQL.

The normal single-laptop deployment uses these local addresses:

- Web client: `http://127.0.0.1:5174`
- Backend API: `http://127.0.0.1:8000/api`
- API documentation: `http://127.0.0.1:8000/docs`

Internet access is not required for the core application after dependencies are installed. Android SMS delivery requires only a local network connection to the gateway phone and cellular SMS service. External reference links and the optional Google-hosted font require internet access.

## Request and data flow

```text
Browser interface
    -> src/api/client.js
    -> FastAPI routes in backend/app/main.py
    -> role checks and Pydantic request validation
    -> backend service module
    -> SQLAlchemy / SQLite and encrypted local artifacts
    -> JSON, XLSX, or file response
    -> browser interface
```

Gate recognition follows a specialized path:

```text
Camera frame
    -> browser JPEG capture
    -> POST /api/biometrics/recognize-many
    -> Haar face detection
    -> LBPH prediction for each detected face
    -> duplicate suppression and confidence checks
    -> alternating time-in/time-out attendance event
    -> optional guardian SMS outbox and Android gateway dispatch
```

## Root files

- `.gitignore` — excludes dependencies, build output, local environment files, databases, biometric artifacts, logs, caches, and secrets while retaining the approved SF2 template.
- `README.md` — primary installation, operation, verification, SMS, biometric-storage, and deployment guide.
- `index.html` — Vite HTML entry document containing the React root element and favicon reference.
- `package.json` — frontend package metadata, runtime dependencies, and development commands.
- `package-lock.json` — locks exact npm dependency versions for repeatable installation.
- `vite.config.js` — enables React support in the Vite development and build pipeline.

## Public assets

- `public/favicon.svg` — browser-tab icon.
- `public/icons.svg` — reusable static icon asset retained in the public bundle.
- `public/logo.png` — school/EduScan logo used by login, administrator, teacher, and scanner headers.

## Frontend entry and shared files

- `src/main.jsx` — mounts the React application and loads the active global stylesheet.
- `src/App.jsx` — declares application routes and client-side role guards for administrator, teacher, and scanner accounts.
- `src/api/client.js` — central API helper, authentication token storage, JSON/FormData handling, camera-frame capture, and local date/time formatting.
- `src/styles/index.css` — active global design system and responsive styles, including the enlarged scanner camera, multi-face guide, and full-screen presentation.
- `src/App.css` — original Vite starter stylesheet retained for reference; it is not imported by the current entry point.
- `src/index.css` — original Vite starter stylesheet retained for reference; the current entry point imports `src/styles/index.css` instead.
- `src/assets/hero.png` — retained local image asset that is not currently referenced by a page.
- `src/assets/react.svg` — retained Vite starter asset that is not currently referenced.
- `src/assets/vite.svg` — retained Vite starter asset that is not currently referenced.

## Frontend layouts

- `src/layouts/PublicLayout.jsx` — minimal outlet wrapper for login and the gate-scanner route.
- `src/layouts/AdminLayout.jsx` — administrator navigation shell for dashboard, attendance, grading, reports, setup, and maintenance.
- `src/layouts/TeacherLayout.jsx` — teacher navigation shell for advisory reporting, attendance, roster, and interventions.

## Frontend pages

- `src/pages/Login/Login.jsx` — authenticates a user and redirects them to the interface allowed for their role.
- `src/pages/Dashboard/Dashboard.jsx` — administrator summary of daily attendance, gate events, SMS status, and reporting shortcuts.
- `src/pages/Scanner/Scanner.jsx` — controls camera access, periodic multi-face recognition, recent gate events, enrollment access, and normal/full-screen camera presentation.
- `src/pages/Attendance/Attendance.jsx` — displays attendance by date and role, runs authorized daily closing, downloads temporary logs, and records attributable corrections.
- `src/pages/Grading/Grading.jsx` — administrator grading workspace that loads learners and delegates configurable grade handling to the shared grading component.
- `src/pages/Reports/Reports.jsx` — official SF2 template status, upload, and monthly export interface.
- `src/pages/Setup/SystemSetup.jsx` — attendance rules, special calendars, SMS gateway configuration, privacy/legal evidence, access rules, and correction procedures.
- `src/pages/Administration/Administration.jsx` — administrative CRUD for people, accounts, academic references, roster imports, full record disposal, backups, and restoration.
- `src/pages/Teacher/SF2Dashboard.jsx` — teacher landing page combining subject selection, attendance, analytics, grade entry, and SF2 access.
- `src/pages/Teacher/MyAdvisory.jsx` — teacher roster view and learner profile access.
- `src/pages/Teacher/TruancyInterventions.jsx` — identifies repeated absence/tardiness cases and records intervention actions.

## Frontend components

- `src/components/Scanner/StudentRegistrationModal.jsx` — captures official person details, authorization confirmation, enrollment frames, and LBPH training requests.
- `src/components/Setup/BiometricEnrollmentManager.jsx` — lists biometric enrollments and provides audited view, replace, retrain, and delete operations.
- `src/components/Teacher/SubjectSelector.jsx` — selects the current teacher class/subject context and schedule.
- `src/components/Teacher/SectionAttendance.jsx` — renders section attendance with learner status interactions.
- `src/components/Teacher/AdviserAnalyticsWidget.jsx` — summarizes advisory attendance patterns.
- `src/components/Teacher/GradingModule.jsx` — manages teacher-defined grade components, scores, weighted results, transmutation, and change reasons.
- `src/components/Teacher/SF2ReportGenerator.jsx` — provides teacher-facing SF2 template and export controls.
- `src/components/Teacher/StudentProfileModal.jsx` — displays an individual learner profile from the roster.

## Backend foundation

- `backend/requirements.txt` — pinned Python dependencies for FastAPI, SQLAlchemy, OpenCV LBPH, encryption, HTTP, and XLSX processing.
- `backend/.env.example` — documented environment-variable template; copy to `.env` locally and never commit actual secrets.
- `backend/app/__init__.py` — marks the backend application directory as a Python package.
- `backend/app/main.py` — creates the FastAPI application, starts migrations and background scheduling, seeds references, and defines authenticated API endpoints.
- `backend/app/config.py` — loads environment settings, resolves data paths, manages the encryption key, and applies a staged restore before database startup.
- `backend/app/database.py` — creates the SQLAlchemy engine/session and applies SQLite foreign-key, WAL, and busy-timeout reliability settings.
- `backend/app/migrations.py` — applies idempotent versioned schema changes and records them in `schema_migrations`.
- `backend/app/models.py` — SQLAlchemy tables for accounts, people, academics, attendance, biometrics, SMS, grades, imports, disposal, settings, and interventions.
- `backend/app/schemas.py` — Pydantic request and response models used to validate API data.
- `backend/app/auth.py` — password hashing, token creation/validation, current-user resolution, role enforcement, and initial account seeding.

## Backend services

- `backend/app/services/__init__.py` — marks the services directory as a Python package.
- `backend/app/services/attendance.py` — instructional-day rules, applicable schedules, late evaluation, repeated gate-event handling, absence closing, and corrections.
- `backend/app/services/biometrics.py` — image decoding, face quality checks, encrypted sample storage, LBPH training/model integrity, single/multi-face prediction, and audited biometric cleanup.
- `backend/app/services/sms.py` — message templates, Philippine/international number normalization, outbox creation, Android gateway dispatch, masking, and retry processing.
- `backend/app/services/sf2.py` — validates and stores the official template, generates temporary logs, fills learner attendance, separates male/female blocks, alphabetizes names, and writes tardy marks.
- `backend/app/services/roster.py` — validates approved XLSX rosters, normalizes records, imports people, hashes the source file, and records import audits.
- `backend/app/services/backup.py` — creates passphrase-encrypted backups and verifies/stages two-phase restoration packages.
- `backend/app/services/disposal.py` — performs authorized linked-record deletion while preserving a non-identifying disposal audit.
- `backend/app/services/scheduler.py` — runs automatic attendance closing and queued SMS dispatch in a managed background thread.
- `backend/app/services/settings_store.py` — stores JSON configuration and Fernet-encrypted secrets in the system-settings table.

## Tests, scripts, and project records

- `backend/tests/test_smoke.py` — isolated integration tests covering biometric lifecycle, multi-face recognition, repeated attendance events, exceptions, grades, roster/SF2 behavior, disposal, and backup/restore.
- `scripts/setup.ps1` — creates the Python environment, installs backend/frontend dependencies, prepares `.env`, and optionally installs the approved SF2 template.
- `scripts/start.ps1` — launches the local FastAPI and Vite services in hidden processes and writes their output to `logs/`.
- `scripts/test-disaster-recovery.ps1` — runs the isolated disaster-recovery verification procedure.
- `docs/DISASTER_RECOVERY.md` — operational backup, restore, validation, and incident-recovery runbook.
- `docs/RAD_PROGRESS_REPORT.txt` — chronological capstone progress organized by RAD methodology phases.
- `docs/PROJECT_STRUCTURE.md` — this architecture and file-purpose guide.

## Runtime data not committed to Git

The following paths are created locally and should not be published:

- `backend/.env` — local secrets and deployment settings.
- `backend/.venv/` — installed Python environment.
- `backend/data/eduscan.db` and its WAL/SHM files — live SQLite records.
- `backend/data/.encryption_key` — key required to decrypt biometric samples and models.
- `backend/data/biometrics/` — encrypted face samples.
- `backend/data/models/` — encrypted LBPH model versions.
- `backend/data/exports/` — generated temporary logs and SF2 workbooks.
- `backend/data/backups/` — encrypted backup packages.
- `logs/` — local API and frontend process output.
- `node_modules/` and `dist/` — installed frontend dependencies and generated build output.

The approved workbook at `backend/data/templates/School Form 2 (SF2) Daily Attendance Report of Learners.xlsx` is intentionally retained because the report generator requires its official structure.

## Scanner camera update

The current gate-station interface provides:

- a larger 16:9 camera workspace with a responsive minimum height;
- more horizontal space for recognizing several people in one frame;
- a whole-frame multi-face positioning guide instead of a single-face oval;
- a full-screen button inside the camera and an additional expand control below it;
- a browser-support warning if the Fullscreen API is unavailable; and
- a narrower recent-events panel so the camera remains the primary gate-station surface.

These presentation changes are located only in `src/pages/Scanner/Scanner.jsx` and `src/styles/index.css`. Recognition processing continues to use the existing local multi-face LBPH endpoint.
