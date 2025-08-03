# PowerShell script to activate venv and run backend server
# Usage: powershell -ExecutionPolicy Bypass -File .\start.ps1

# Save current location
$PROJECT_PATH = Get-Location

# Go to project root (two levels up)
Set-Location $PROJECT_PATH
Set-Location ..
Set-Location ..

# Activate virtual environment if it exists
$venvActivate = ".venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    & $venvActivate
} else {
    Write-Host "Virtual environment not found: $venvActivate" -ForegroundColor Red
    exit 1
}

# Go to backend source folder
Set-Location src\backend

# Run backend server
Write-Host "Starting backend server with uvicorn..." -ForegroundColor Cyan
uvicorn backend_server:app
