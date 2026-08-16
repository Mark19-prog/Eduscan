# EduScan Disaster-Recovery Procedure

Owner: School system administrator / records officer
Approval: School head and designated Data Protection Officer (DPO)
Applies to: SQLite database, encryption key, encrypted face samples, LBPH models, and SF2 templates

## Recovery objectives

- Target recovery point: the most recent verified daily backup.
- Target recovery time for the gate station: 60 minutes after replacement hardware and the backup are available.
- Store at least one current encrypted `.edubak` copy on separate school-controlled media. Do not keep the only copy on the gate laptop.
- Keep the backup passphrase in the approved school password vault, separated from the backup file.

## Scheduled backup test

1. Sign in as an administrator and open Administration > Backup & recovery.
2. Create a backup with a unique passphrase of at least 12 characters.
3. Download the resulting `.edubak` file to approved encrypted removable storage or the approved secured repository.
4. Record the filename, date, custodian, storage location, and authorization reference in the school backup register.
5. Run `scripts\test-disaster-recovery.ps1`. This uses isolated temporary data and verifies encryption, manifest hashes, decryption, and restore staging without touching production data.
6. Once per grading period, perform the full restoration drill below on a separate test computer.

## Full restoration drill or incident recovery

1. Stop EduScan on the recovery computer. Preserve the failed disk or current `backend\data` directory as evidence; do not overwrite it.
2. Install the same EduScan release and dependencies on the recovery computer.
3. Start EduScan once, sign in as an administrator, and open Administration > Backup & recovery.
4. Select the approved `.edubak` file, enter its passphrase, type `STAGE RESTORE`, and submit.
5. Confirm that the system reports successful integrity verification and requests a restart. A rejected hash, wrong passphrase, or malformed archive must stop the procedure.
6. Stop and restart EduScan. At startup it moves the current database/key/artifacts to a timestamped `backend\data\pre_restore_*` folder, then applies the verified staged copy as one recovery set.
7. Sign in and validate all of the following before returning the station to service:
   - `/api/health` reports a working database.
   - The expected students and employees appear under Administration.
   - Face enrollment counts and the active LBPH model are present.
   - Attendance, gradebook, grade audit, calendar, and SMS outbox records open correctly.
   - A temporary attendance workbook and a sample SF2 workbook generate successfully.
   - One authorized test face can be recognized and one Android gateway test SMS is delivered.
8. Record the backup filename, restoration time, validation results, operator, and approving officer in the recovery log.
9. Keep the `pre_restore_*` folder only until the approving officer accepts the restored system. Then dispose of it under the approved records schedule using secure deletion.

## Rollback if validation fails

1. Stop EduScan immediately and do not collect new gate scans.
2. Rename the failed restored `backend\data` set for investigation.
3. Move the matching files from the latest `pre_restore_*` folder back to `backend\data`: `eduscan.db`, `.encryption_key`, `biometrics`, `models`, and `templates`.
4. Restart and repeat the validation checklist.
5. Document the failure and notify the administrator and DPO. Escalate suspected loss, alteration, or unauthorized access through the approved breach-response procedure.

Never restore only `eduscan.db` without its matching `.encryption_key` and biometric/model files. A mismatched key makes encrypted samples and LBPH models unreadable.
