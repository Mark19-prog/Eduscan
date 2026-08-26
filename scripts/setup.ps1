param(
  [string]$Sf2Template = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendRoot = Join-Path $projectRoot "backend"
$venvPython = Join-Path $backendRoot ".venv\Scripts\python.exe"

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm was not found. Install the Node.js LTS release, reopen PowerShell, and rerun setup."
}

if (-not (Test-Path -LiteralPath $venvPython)) {
  $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
  if ($pythonCommand) {
    & $pythonCommand.Source -3.12 -m venv (Join-Path $backendRoot ".venv")
  } else {
    $pythonCommand = Get-Command python -ErrorAction Stop
    & $pythonCommand.Source -m venv (Join-Path $backendRoot ".venv")
  }
}

& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $backendRoot "requirements.txt")

$environmentFile = Join-Path $backendRoot ".env"
if (-not (Test-Path -LiteralPath $environmentFile)) {
  Copy-Item -LiteralPath (Join-Path $backendRoot ".env.example") -Destination $environmentFile
}

if ($Sf2Template) {
  $sourceTemplate = (Resolve-Path -LiteralPath $Sf2Template).Path
  $templateDirectory = Join-Path $backendRoot "data\templates"
  New-Item -ItemType Directory -Path $templateDirectory -Force | Out-Null
  Copy-Item -LiteralPath $sourceTemplate -Destination (Join-Path $templateDirectory "School Form 2 (SF2) Daily Attendance Report of Learners.xlsx") -Force
}

Push-Location $projectRoot
try { & npm.cmd ci } finally { Pop-Location }
Write-Host "EduScan dependencies installed. Review backend\.env, then run scripts\start.ps1."
