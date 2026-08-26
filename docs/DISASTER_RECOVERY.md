# EduScan disaster-recovery procedure

Owner: School system administrator / records officer

Approval: School head and designated Data Protection Officer (DPO)
Applies to: configured SQLite or MySQL database, application secret, encryption key, encrypted face samples, LBPH models, and SF2 templates

## Recovery objectives

- Target recovery point: the most recent verified daily backup.
- Target recovery time for the gate station: 60 minutes after replacement hardware and the backup are available.
- Keep at least one current encrypted `.edubak` copy on separate school-controlled media; the gate laptop must not hold the only copy.
- Keep the backup passphrase in the approved school password vault, separated from the backup file.
- Never restore a database without its matching `.encryption_key`, biometric/model files, and `.app_secret` when present.

## Creating an operational backup

1. Sign in as an administrator and open Administration > Backup & recovery.
2. Enter a unique passphrase of at least 12 characters and create the backup.
3. For SQLite, EduScan uses the SQLite online backup API. For MySQL, it uses a transaction-consistent `mysqldump` through the restricted application account.
4. Download the `.edubak` file to approved encrypted removable storage or the approved secured repository.
5. Record the filename, database backend, date, custodian, storage location, and authorization reference in the school backup register.
6. Do not treat creation as proof of recoverability. The full restoration drill remains a later controlled testing activity and must be completed on isolated equipment before production acceptance.

## Integrity verification and staging

1. Open Administration > Backup & recovery.
2. Select an approved `.edubak`, enter its passphrase, type `STAGE RESTORE`, and submit.
3. EduScan decrypts the package, rejects unsafe archive paths, verifies every SHA-256 manifest hash, checks that the backup database type matches the active deployment, and writes the verified files to `backend\data\pending_restore`.
4. A wrong passphrase, damaged package, backend mismatch, unsafe path, or failed hash stops staging without modifying the active data.
5. Do not stage another package while a verified restore is pending.

## Applying a SQLite restore

1. Stop and restart EduScan after successful staging.
2. Before database initialization, EduScan moves the current SQLite database and local artifacts to a timestamped `backend\data\pre_restore_*` folder.
3. EduScan then activates the staged database, encryption key, application secret when present, biometric samples, models, and templates as one recovery set.
4. Complete the recovery validation checklist before reopening the scanner.

## Applying a MySQL restore

1. Stop EduScan and confirm that the API is no longer listening on port 8000.
2. From the project directory, run:

   ```powershell
   .\scripts\apply-mysql-restore.ps1
   ```

3. Type `APPLY MYSQL RESTORE` exactly.
4. Enter a new passphrase for the automatic pre-restore safety backup.
5. Enter a MySQL administrator username and password. The restricted runtime account deliberately lacks routine table-drop authority.
6. The tool creates an encrypted backup of the current MySQL database and local artifacts before importing anything.
7. It imports the staged SQL while the API is offline. If MySQL rejects or interrupts the import, local encryption artifacts remain unchanged and the safety backup remains available.
8. After a successful import, it verifies `schema_migrations` and `users`, preserves the previous local artifacts in a timestamped `pre_restore_*` folder, activates the matching staged artifacts, and removes the plaintext staged SQL.
9. Start EduScan and complete the recovery validation checklist.

## Recovery validation checklist

- `/api/health` reports the expected database backend.
- The expected administrator, teacher, and scanner accounts can sign in; restored tokens from another installation are not relied upon.
- Expected students and employees appear under Administration.
- Face enrollment counts and the active LBPH model are present.
- Attendance, gradebooks, grade audit, calendar, and SMS outbox records open correctly.
- A temporary attendance workbook and a sample SF2 workbook generate successfully.
- On authorized test equipment, one consented test face is recognized and one test SMS is delivered.
- The operator records backup filename, restore time, row/reference checks, operator, errors, and approving officer in the recovery log.

The device checks, restoration timing, and user acceptance in this section are intentionally deferred until the project’s formal testing phase. They must not be reported as passed until actually performed and signed.

## Rollback if validation fails

1. Stop EduScan immediately and do not collect new gate scans.
2. Preserve logs and the failed restored state for investigation.
3. For MySQL, stage the automatic pre-restore `.edubak` and repeat the controlled offline MySQL procedure. For SQLite, restore the matching set from the latest `pre_restore_*` folder.
4. Do not mix a database from one recovery set with keys, biometric files, or models from another.
5. Repeat the validation checklist and document the failure and corrective action.
6. Notify the administrator and DPO; use the approved breach-response procedure if loss, alteration, or unauthorized access is suspected.

Keep `pre_restore_*` folders only until the approving officer accepts the recovery, then dispose of them under the approved records schedule and secure-deletion procedure.
