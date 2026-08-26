param(
  [string]$MySqlBin = "C:\Program Files\MySQL\MySQL Server 8.4\bin",
  [string]$ServerHost = "127.0.0.1",
  [int]$Port = 3306,
  [string]$DatabaseName = "eduscan",
  [string]$AppUser = "eduscan_app"
)

$ErrorActionPreference = "Stop"

if ($DatabaseName -notmatch '^[A-Za-z0-9_]+$' -or $AppUser -notmatch '^[A-Za-z0-9_]+$') {
  throw "Database and application account names may contain only letters, numbers, and underscores."
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendRoot = Join-Path $projectRoot "backend"
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"
$mysql = Join-Path $MySqlBin "mysql.exe"
$envFile = Join-Path $backendRoot ".env"

if (-not (Test-Path -LiteralPath $mysql)) {
  throw "mysql.exe was not found at $mysql. Pass -MySqlBin with the installed MySQL bin directory."
}
if (-not (Test-Path -LiteralPath $python)) {
  throw "The backend virtual environment is missing. Run .\scripts\setup.ps1 first."
}
if (-not (Test-NetConnection -ComputerName $ServerHost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)) {
  throw "MySQL is not accepting connections at ${ServerHost}:$Port. Complete MySQL Configurator and start the MySQL84 service first."
}
if (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue) {
  throw "EduScan API is still running on port 8000. Close its PowerShell window before migration so SQLite cannot change during the verified copy."
}

function ConvertFrom-SecureValue([Security.SecureString]$Value) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$secureRootPassword = Read-Host "MySQL root password" -AsSecureString
$rootPassword = ConvertFrom-SecureValue $secureRootPassword
$secureBackupPassphrase = Read-Host "New EduScan backup passphrase (at least 12 characters)" -AsSecureString
$backupPassphrase = ConvertFrom-SecureValue $secureBackupPassphrase
if ($backupPassphrase.Length -lt 12) {
  throw "The backup passphrase must contain at least 12 characters."
}

$passwordBytes = New-Object byte[] 36
$passwordGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $passwordGenerator.GetBytes($passwordBytes)
} finally {
  $passwordGenerator.Dispose()
}
$appPassword = [Convert]::ToBase64String($passwordBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
$escapedSqlPassword = $appPassword.Replace("'", "''")

try {
  $env:MYSQL_PWD = $rootPassword
  $provisionSql = @"
CREATE DATABASE IF NOT EXISTS ``$DatabaseName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS '$AppUser'@'localhost' IDENTIFIED BY '$escapedSqlPassword';
ALTER USER '$AppUser'@'localhost' IDENTIFIED BY '$escapedSqlPassword';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON ``$DatabaseName``.* TO '$AppUser'@'localhost';
"@
  $provisionSql | & $mysql --protocol=TCP --host=$ServerHost --port=$Port --user=root --batch
  if ($LASTEXITCODE -ne 0) { throw "MySQL rejected the administrator credentials or provisioning statements." }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
  $rootPassword = $null
}

try {
  $env:MYSQL_PWD = $appPassword
  & $mysql --protocol=TCP --host=$ServerHost --port=$Port --user=$AppUser --database=$DatabaseName --batch --execute="SELECT DATABASE() AS database_name, CURRENT_USER() AS application_account;"
  if ($LASTEXITCODE -ne 0) { throw "The restricted EduScan MySQL account could not connect." }
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

try {
  $env:EDUSCAN_BACKUP_PASSPHRASE = $backupPassphrase
  Push-Location $backendRoot
  & $python -c "import os; from app.services.backup import create_secure_backup; print('Encrypted pre-migration backup:', create_secure_backup(os.environ['EDUSCAN_BACKUP_PASSPHRASE']))"
  if ($LASTEXITCODE -ne 0) { throw "The encrypted pre-migration backup failed." }
} finally {
  Pop-Location
  Remove-Item Env:EDUSCAN_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  $backupPassphrase = $null
}

$encodedPassword = [Uri]::EscapeDataString($appPassword)
$databaseUrl = "mysql+pymysql://${AppUser}:${encodedPassword}@${ServerHost}:$Port/${DatabaseName}?charset=utf8mb4"
try {
  $env:MYSQL_DATABASE_URL = $databaseUrl
  Push-Location $backendRoot
  & $python ".\tools\migrate_sqlite_to_mysql.py" --confirm "MIGRATE TO MYSQL"
  if ($LASTEXITCODE -ne 0) { throw "Migration verification failed. backend\.env was not changed." }
} finally {
  Pop-Location
  Remove-Item Env:MYSQL_DATABASE_URL -ErrorAction SilentlyContinue
}

if (Test-Path -LiteralPath $envFile) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Copy-Item -LiteralPath $envFile -Destination "$envFile.pre-mysql-$stamp" -Force
  $lines = Get-Content -LiteralPath $envFile
} else {
  $lines = @()
}
$replaced = $false
$updated = foreach ($line in $lines) {
  if ($line -match '^\s*DATABASE_URL=') {
    "DATABASE_URL=$databaseUrl"
    $replaced = $true
  } else {
    $line
  }
}
if (-not $replaced) {
  $updated = @($updated) + "DATABASE_URL=$databaseUrl"
}
[IO.File]::WriteAllLines($envFile, $updated, [Text.UTF8Encoding]::new($false))

$appPassword = $null
Write-Host "EduScan MySQL provisioning, encrypted backup, data migration, and .env cutover completed." -ForegroundColor Green
Write-Host "Start EduScan, then confirm http://127.0.0.1:8000/api/health reports database=mysql."
