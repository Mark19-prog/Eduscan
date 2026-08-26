$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendRoot = Join-Path $projectRoot "backend"
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
  throw "The backend virtual environment is missing. Run .\scripts\setup.ps1 first."
}
if (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue) {
  throw "EduScan API is running on port 8000. Stop EduScan before applying a MySQL restore."
}

function ConvertFrom-SecureValue([Security.SecureString]$Value) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$confirmation = Read-Host "Type APPLY MYSQL RESTORE"
if ($confirmation -cne "APPLY MYSQL RESTORE") {
  throw "Restore cancelled because the confirmation text did not match."
}
$securePassphrase = Read-Host "New passphrase for the automatic pre-restore safety backup" -AsSecureString
$backupPassphrase = ConvertFrom-SecureValue $securePassphrase
if ($backupPassphrase.Length -lt 12) {
  throw "The safety-backup passphrase must contain at least 12 characters."
}
$adminUser = Read-Host "MySQL administrator username [root]"
if ([string]::IsNullOrWhiteSpace($adminUser)) { $adminUser = "root" }
$secureAdminPassword = Read-Host "MySQL administrator password" -AsSecureString
$adminPassword = ConvertFrom-SecureValue $secureAdminPassword
if ([string]::IsNullOrEmpty($adminPassword)) {
  throw "The MySQL administrator password is required."
}

try {
  $env:EDUSCAN_RESTORE_CONFIRM = $confirmation
  $env:EDUSCAN_BACKUP_PASSPHRASE = $backupPassphrase
  $env:EDUSCAN_MYSQL_ADMIN_USER = $adminUser
  $env:EDUSCAN_MYSQL_ADMIN_PASSWORD = $adminPassword
  Push-Location $backendRoot
  & $python ".\tools\apply_mysql_restore.py"
  if ($LASTEXITCODE -ne 0) {
    throw "MySQL restore did not complete. Read the message above before taking any recovery action."
  }
} finally {
  Pop-Location
  Remove-Item Env:EDUSCAN_RESTORE_CONFIRM -ErrorAction SilentlyContinue
  Remove-Item Env:EDUSCAN_BACKUP_PASSPHRASE -ErrorAction SilentlyContinue
  Remove-Item Env:EDUSCAN_MYSQL_ADMIN_USER -ErrorAction SilentlyContinue
  Remove-Item Env:EDUSCAN_MYSQL_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  $backupPassphrase = $null
  $adminPassword = $null
}
