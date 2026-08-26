$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Push-Location $projectRoot
try {
  $changes = @(& git status --porcelain)
  if ($LASTEXITCODE -ne 0) {
    throw "This folder is not a readable Git repository."
  }
  if ($changes.Count -gt 0) {
    throw "Source changes are present. Commit or copy them aside before updating so Git does not overwrite your work."
  }
  & git pull --ff-only origin main
  if ($LASTEXITCODE -ne 0) {
    throw "Git could not fast-forward to origin/main. Resolve the Git message above before retrying."
  }
} finally {
  Pop-Location
}

& (Join-Path $PSScriptRoot "setup.ps1")
Write-Host "EduScan is updated. Run .\scripts\start.ps1 when ready."
