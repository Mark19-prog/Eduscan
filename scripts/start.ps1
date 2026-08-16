$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendRoot = Join-Path $projectRoot "backend"
$python = Join-Path $backendRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
  throw "Backend environment is missing. Run .\scripts\setup.ps1 first."
}

$logDirectory = Join-Path $projectRoot "logs"
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$api = Start-Process -FilePath $python -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000" -WorkingDirectory $backendRoot -RedirectStandardOutput (Join-Path $logDirectory "api.stdout.log") -RedirectStandardError (Join-Path $logDirectory "api.stderr.log") -WindowStyle Hidden -PassThru
$web = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "--host", "127.0.0.1", "--port", "5174" -WorkingDirectory $projectRoot -RedirectStandardOutput (Join-Path $logDirectory "web.stdout.log") -RedirectStandardError (Join-Path $logDirectory "web.stderr.log") -WindowStyle Hidden -PassThru

Write-Host "EduScan API PID: $($api.Id)  http://127.0.0.1:8000/api/health"
Write-Host "EduScan web PID: $($web.Id)  http://127.0.0.1:5174"
Write-Host "Logs: $logDirectory"
