# One-time setup + start on Windows (PowerShell). Production: one process on port 8000.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path backend\.venv)) {
    python -m venv backend\.venv
    backend\.venv\Scripts\python -m pip install -r backend\requirements.txt
}
if (-not (Test-Path frontend\dist)) {
    Push-Location frontend; npm install; npm run build; Pop-Location
}
Push-Location backend
if (-not (Test-Path data\lotse.db)) { .venv\Scripts\python seed.py }
.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Pop-Location
