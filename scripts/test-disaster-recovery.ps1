$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$python = Join-Path $backendRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    throw 'Backend virtual environment is missing. Run scripts\setup.ps1 first.'
}

Push-Location $backendRoot
try {
    & $python -m unittest discover -s tests -p 'test_smoke.py' -k secure_backup -v
    if ($LASTEXITCODE -ne 0) { throw 'The isolated disaster-recovery verification failed.' }
}
finally {
    Pop-Location
}

Write-Host 'EduScan encrypted backup and restore-staging verification passed.' -ForegroundColor Green
