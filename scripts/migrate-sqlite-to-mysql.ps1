param(
  [string]$MySqlDatabaseUrl = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendRoot = Join-Path $projectRoot "backend"
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
  throw "Backend environment is missing. Run .\scripts\setup.ps1 first."
}
if (-not $MySqlDatabaseUrl) {
  $secureUrl = Read-Host "MySQL SQLAlchemy URL" -AsSecureString
  $urlPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureUrl)
  try {
    $MySqlDatabaseUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($urlPointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($urlPointer)
  }
}
if ($MySqlDatabaseUrl -notmatch '^mysql\+pymysql://') {
  throw "Use a mysql+pymysql:// SQLAlchemy URL. Percent-encode special password characters."
}

$env:MYSQL_DATABASE_URL = $MySqlDatabaseUrl
Push-Location $backendRoot
try {
  & $python ".\tools\migrate_sqlite_to_mysql.py" --confirm "MIGRATE TO MYSQL"
  if ($LASTEXITCODE -ne 0) { throw "Migration verification failed. backend\.env was not changed." }
} finally {
  Pop-Location
  Remove-Item Env:MYSQL_DATABASE_URL -ErrorAction SilentlyContinue
}

Write-Host "Migration copy verified. Review the output, back up backend\.env, then set DATABASE_URL to the same MySQL URL."
