# PowerShell script to start both backend and frontend servers
# Usage: powershell -ExecutionPolicy Bypass -File .\start.ps1

# Save current location
$PROJECT_PATH = Get-Location

# Go to project root (one level up from scripts)
Set-Location $PROJECT_PATH
Set-Location ..

# Activate virtual environment if it exists
$venvActivate = ".venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    Write-Host "Activating virtual environment..." -ForegroundColor Green
    & $venvActivate
} else {
    Write-Host "Virtual environment not found: $venvActivate" -ForegroundColor Red
    exit 1
}

# Array to store child processes for cleanup
$global:childProcesses = @()

# Function to cleanup child processes and their descendants
function Cleanup-Processes {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    
    # Kill all Python and uvicorn processes (more aggressive cleanup)
    try {
        Get-Process -Name "python","uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host "Stopped all Python and uvicorn processes" -ForegroundColor Green
    } catch {
        Write-Host "Error stopping some processes: $_" -ForegroundColor Red
    }
    
    # Also try to kill the PowerShell windows we spawned
    foreach ($process in $global:childProcesses) {
        try {
            if (!$process.HasExited) {
                # Kill the process tree (including child processes)
                Start-Process "taskkill" -ArgumentList "/PID", $process.Id, "/T", "/F" -Wait -WindowStyle Hidden
                Write-Host "Stopped process tree for PID: $($process.Id)" -ForegroundColor Green
            }
        } catch {
            Write-Host "Failed to stop process ID: $($process.Id)" -ForegroundColor Red
        }
    }
}

# Register cleanup function for script exit only (no visible jobs)
$null = Register-EngineEvent PowerShell.Exiting -Action { 
    Cleanup-Processes 
} -SupportEvent

Write-Host "Starting budgeting dashboard application..." -ForegroundColor Cyan

# Create logs directory and clean it up
$logsDir = "scripts\logs"
if (Test-Path $logsDir) {
    Write-Host "Cleaning up old log files..." -ForegroundColor Yellow
    Remove-Item "$logsDir\*" -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "Creating logs directory..." -ForegroundColor Green
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

# Function to start backend server
function Start-Backend {
    Write-Host "Starting backend server..." -ForegroundColor Green
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $backendLogFile = "logs/backend_$timestamp.log"
    Write-Host "Backend output will be logged to: $backendLogFile" -ForegroundColor Cyan
    $process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'src\backend'; uvicorn backend_server:app 2>&1 | Tee-Object -FilePath '../../scripts/$backendLogFile'" -WindowStyle Hidden -PassThru
    $global:childProcesses += $process
    return $process
}

# Function to start frontend server
function Start-Frontend {
    Write-Host "Starting frontend server..." -ForegroundColor Green
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $frontendLogFile = "logs/frontend_$timestamp.log"
    Write-Host "Frontend output will be logged to: $frontendLogFile" -ForegroundColor Cyan
    $process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'src\frontend'; python main.py 2>&1 | Tee-Object -FilePath '../../scripts/$frontendLogFile'" -WindowStyle Hidden -PassThru
    $global:childProcesses += $process
    return $process
}

# Start both services
try {
    $backendProcess = Start-Backend
    Start-Sleep -Seconds 2  # Give backend time to start
    $frontendProcess = Start-Frontend
    
    Write-Host ""
    Write-Host "Both services started successfully!" -ForegroundColor Green
    Write-Host "Backend and frontend are running in the background with hidden windows." -ForegroundColor Cyan
    Write-Host "Output logs are being saved to timestamped files in the scripts/logs/ directory." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop both services." -ForegroundColor Yellow
    Write-Host ""
    
    # Keep the script running and wait for user input
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            # Check if processes are still alive
            if ($backendProcess.HasExited -or $frontendProcess.HasExited) {
                Write-Host "One or more services have stopped. Exiting..." -ForegroundColor Red
                break
            }
        }
    } catch [System.Management.Automation.PipelineStoppedException] {
        # Handle Ctrl+C gracefully
        Write-Host "`nReceived stop signal. Cleaning up..." -ForegroundColor Yellow
    } finally {
        Cleanup-Processes
    }
    
} catch {
    Write-Host "Error starting services: $_" -ForegroundColor Red
    Cleanup-Processes
    exit 1
}