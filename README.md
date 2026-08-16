# EduScan

EduScan is the working local-first attendance, SMS, grading, and SF2 reporting system for San Jose National High School. It uses a browser camera and an OpenCV LBPH model on the school server; biometric frames are not sent to a cloud recognition provider.

## Implemented system

- Actual camera capture for enrollment and gate recognition
- OpenCV Haar face extraction and LBPH training/prediction
- Minimum-quality and one-face-only enrollment checks
- Encrypted biometric samples and models outside the web root; versioned LBPH models with SHA-256 integrity records
- Audited biometric CRUD; deletion purges encrypted samples, sample rows, obsolete LBPH files, and obsolete model rows while retaining only the required non-biometric audit record
- Persistent SQLAlchemy database (SQLite by default; MySQL supported through `DATABASE_URL`)
- Student, faculty, and non-teaching personnel attendance
- Verified matches alternate between time-in and time-out throughout the day, supporting repeated exits and re-entries
- Multi-face gate frames are detected and each distinct enrolled person is matched independently
- Teacher-defined schedules and tardiness grace periods
- Holidays, suspensions, weekends, excused absences, and authorized special schedules
- Automatic daily absence closing, temporary XLSX generation, and SMS dispatch at the authorized cutoff
- Immutable gate events plus attributable teacher/admin correction records
- Real Android SMS Gateway local-server integration for time-in, time-out, tardiness, and absence notices
- Encrypted gateway password storage and retryable SMS outbox
- Teacher-configurable quizzes, summative tests, periodic tests, overall grade input, and DepEd transmutation display
- School-year, grading-period, quarter, subject, grade-level, and section organization with grade-change audit history
- Administrative CRUD for accounts, students, employees, grade levels, sections, and subjects
- Approved XLSX roster preview/import plus alphabetically arranged male/female SF2 placement
- Separate full school-record disposal with an attributable, non-identifying disposal audit
- Passphrase-encrypted backup/restoration of SQLite, its encryption key, biometric artifacts, models, and templates
- Recorded database migrations and tested disaster-recovery procedure
- Real temporary attendance XLSX and official SF2 XLSX generation using the supplied template and sex-specific row blocks
- Privacy notice, access matrix, correction procedure, retention process, and deployment evidence register under System Setup

## Install

Requirements: Windows, Python 3.12, Node.js/npm, a webcam, and optionally MySQL plus a dedicated Android phone for SMS.

From PowerShell in the project directory:

```powershell
.\scripts\setup.ps1 -Sf2Template "C:\path\to\School Form 2 (SF2) Daily Attendance Report of Learners.xlsx"
```

The setup creates `backend/.venv`, installs the backend and frontend dependencies, creates `backend/.env`, and optionally copies the official SF2 workbook.

Review `backend/.env` before deployment. Change `EDUSCAN_SECRET_KEY`, keep the generated encryption key backed up securely, set allowed origins, and configure either SQLite or MySQL. Example MySQL URL:

```text
DATABASE_URL=mysql+pymysql://eduscan:strong-password@127.0.0.1:3306/eduscan?charset=utf8mb4
```

Create the MySQL database and restricted application account first. Versioned startup migrations record every applied schema revision in `schema_migrations`. SQLite creates `backend/data/eduscan.db` automatically and is suitable for one local capstone gate station.

## Run

```powershell
.\scripts\start.ps1
```

- Web application: `http://127.0.0.1:5174`
- API health: `http://127.0.0.1:8000/api/health`
- API documentation: `http://127.0.0.1:8000/docs`
- Logs: `logs/`

Initial local accounts (change before real deployment):

- Administrator: `admin` / `admin123`
- Teacher: `teacher` / `teacher123`
- Gate scanner: `scanner` / `scanner123`

## First-use sequence

1. Log in as administrator.
2. In System Setup, create each grade/section class schedule and set the late grace period.
3. In System Setup > Android SMS, enter the phone gateway URL/credentials, save, and send a test message.
4. Open Gate Station > Enroll person. Enter the official identity/roster fields, confirm the documented authorization, capture 20 frames, and save/train.
5. Enroll every authorized student/personnel member. The model is retrained after each enrollment.
6. Log in with the scanner account on the secured gate laptop, enable the camera, and start recognition.
7. Review Attendance and make corrections with reasons. The server closes absences automatically at the authorized cutoff; administrators can run the same controlled action manually for operational recovery.
8. Upload the official SF2 template in Reports if it was not supplied during setup, then generate and verify the monthly workbook.
9. Open Administration to configure academic references, accounts, approved roster imports, and the encrypted backup schedule.

## Verification

```powershell
npm run verify
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend\tests -v
```

The backend test creates an isolated temporary SQLite database and biometric file area. It verifies biometric CRUD and cleanup, real multi-person LBPH prediction, repeated entry/exit events, calendar exceptions, excused absences, grade audit, complete linked-record disposal, approved roster import, alphabetical SF2 placement, and encrypted backup/restore staging. Camera hardware and Android SMS delivery still require their real devices.

The tested recovery runbook is in `docs/DISASTER_RECOVERY.md`. Its isolated verification command is:

```powershell
.\scripts\test-disaster-recovery.ps1
```

## Android phone SMS gateway

Use [SMS Gateway for Android](https://github.com/capcom6/android-sms-gateway) in Local Server mode. Keep the phone and EduScan server on the same protected school network. The backend sends HTTP Basic-authenticated `POST /message` requests to the phone. Do not expose the gateway directly to the internet. Use a school-controlled SIM, confirm the carrier plan permits the intended institutional messages, reserve the phone IP, enable kiosk/battery-exemption settings, and monitor the outbox.

## Biometric storage

LBPH does not produce a reusable single face vector suitable for a document column. EduScan stores quality-checked grayscale face crops as individually Fernet-encrypted files under `backend/data/biometrics`, and stores paths, hashes, consent state, and model metadata in SQL. The trained LBPH YAML is also Fernet-encrypted under `backend/data/models` and is decrypted only to a short-lived local file while OpenCV loads it. This keeps structured records in SQL while treating biometric artifacts as encrypted files. Back up `backend/data/.encryption_key` securely; losing it makes the samples and models unreadable.

## Deployment responsibility

The code keeps biometric operation available for controlled development and technical evaluation. Before processing real students at the gate, complete the System Setup evidence register and obtain the written determination required by the school DPO, records officer, Schools Division Office/DepEd, and applicable Philippine privacy/AI rules. A software checkbox cannot substitute for those approvals.
