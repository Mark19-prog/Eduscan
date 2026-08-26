# SQLite to MySQL migration

EduScan supports SQLite and MySQL through SQLAlchemy. Changing the database engine does not replace application authentication: EduScan passwords remain salted `scrypt` hashes, access tokens remain signed, and endpoint roles remain enforced by FastAPI. MySQL is useful when the school needs a separately administered database service, multiple application stations, database-account isolation, centralized monitoring, and server-managed backups.

## Prerequisites

1. Make an encrypted EduScan backup and stop the API and scanner before cutover.
2. Install MySQL Community Server 8.4 on the school-controlled server or laptop.
3. Keep MySQL bound to localhost unless a documented multi-station deployment requires a protected LAN connection.
4. Create an empty `eduscan` database and a dedicated application account. Do not use the MySQL `root` account in `backend/.env`.

On Windows, first finish **MySQL Configurator** as an administrator. Use port 3306, keep the server bound to this laptop unless a protected multi-station deployment is approved, configure the `MySQL84` Windows service for automatic startup, and set a strong root password. Installing the server files alone does not initialize a data directory or start the server.

For the guided local setup, close EduScan so port 8000 is no longer active, then run:

```powershell
.\scripts\configure-eduscan-mysql.ps1
```

The script securely prompts for the root password and a new backup passphrase. It creates a random restricted application credential, creates an encrypted pre-migration backup, provisions the database/account, copies and verifies all tables, backs up an existing `.env`, and switches `DATABASE_URL` only after verification succeeds. Passwords are not placed in PowerShell history.

Alternatively, create the database and application account manually by running these statements from an authenticated MySQL administrator session and replacing the sample password:

```sql
CREATE DATABASE eduscan CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'eduscan_app'@'localhost' IDENTIFIED BY 'replace-with-a-long-random-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
ON eduscan.* TO 'eduscan_app'@'localhost';
```

The application account intentionally does not receive global administration privileges.

## Copy and verify the data

From the project root in PowerShell:

```powershell
.\scripts\migrate-sqlite-to-mysql.ps1
```

The script prompts securely so the connection URL is not stored in PowerShell command history.

Enter a URL in this form. Percent-encode reserved characters in the password:

```text
mysql+pymysql://eduscan_app:encoded-password@127.0.0.1:3306/eduscan?charset=utf8mb4
```

The migration utility:

- applies all versioned migrations to the source and target;
- refuses to run if any application table in MySQL already contains data;
- copies tables in foreign-key order while preserving primary keys and password hashes;
- verifies the final row count of every application table; and
- never changes or deletes SQLite records; it may apply pending versioned schema migrations before reading them.

## Cut over only after verification

1. Copy `backend/.env` to a protected backup location.
2. Set `DATABASE_URL` in `backend/.env` to the verified MySQL URL.
3. Start EduScan.
4. Open `http://127.0.0.1:8000/api/health` and confirm that `database` is `mysql`.
5. Test administrator, teacher, and scanner login; attendance; grade save/audit; SF2 generation; SMS outbox; and biometric recognition.
6. Retain the original SQLite database read-only until the school formally accepts the MySQL cutover.

## Rollback

Stop EduScan, restore the previous `DATABASE_URL=sqlite:///./data/eduscan.db`, and restart. Because the copy tool does not delete or rewrite SQLite records, rollback does not require reversing the MySQL import. Reconcile any records created after the cutover before returning to SQLite.

## Backup and restoration after migration

Administration > Backup & recovery now runs `mysqldump --single-transaction` for MySQL and places the SQL snapshot, application secret, encryption key, encrypted biometric samples/models, and report templates in one passphrase-encrypted `.edubak` package. Copy approved backups to separate encrypted school-controlled media.

Restoration is intentionally offline. Stage and integrity-check the `.edubak` file in the interface, stop EduScan, and run:

```powershell
.\scripts\apply-mysql-restore.ps1
```

The script requires explicit confirmation, creates a fresh encrypted safety backup of the current system, securely prompts for a MySQL administrator credential with table-replacement authority, imports the staged dump, verifies core tables, and then swaps the matching local secrets and artifacts. The normal `eduscan_app` account remains restricted and is not granted routine `DROP` authority. Follow `docs/DISASTER_RECOVERY.md` for validation and rollback.
