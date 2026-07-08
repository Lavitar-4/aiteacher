$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

# Helper to find a free TCP port starting from a given port
function Get-FreePort([int]$startPort) {
    $port = $startPort
    while ($true) {
        $inUse = $false
        try {
            $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
            $listener.Start()
            $listener.Stop()
        } catch {
            $inUse = $true
        }
        if (-not $inUse) {
            return $port
        }
        $port++
    }
}

Write-Host "Scanning for available ports..."
$backendPort = Get-FreePort 8000
$frontendPort = Get-FreePort 3000

Write-Host "Backend dynamically allocated port:  $backendPort"
Write-Host "Frontend dynamically allocated port: $frontendPort"

# Find python path dynamically (prefer stable versions like 3.10, 3.11, 3.12, 3.13 over experimental 3.14+)
$pythonSystemPath = $null
$pythonSearchPaths = @(
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python313\python.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python312\python.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python311\python.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Python\Python310\python.exe",
    "C:\Python313\python.exe",
    "C:\Python312\python.exe",
    "C:\Python311\python.exe",
    "C:\Python310\python.exe"
)

foreach ($p in $pythonSearchPaths) {
    if (Test-Path $p) {
        $pythonSystemPath = $p
        break
    }
}

if (-not $pythonSystemPath) {
    # If not found in common paths, check the PATH env
    $pythonSystemPath = (Get-Command python -ErrorAction SilentlyContinue).Source
}

if (-not $pythonSystemPath) {
    $pythonSystemPath = "python"
}

# Create backend virtual environment if not exists
$venvDir = Join-Path $backendDir "venv"
if (Test-Path $venvDir) {
    if (-not (Test-Path (Join-Path $venvDir "Scripts\python.exe"))) {
        Write-Host "Warning: Found incompatible virtual environment (possibly created on Linux/WSL). Re-creating..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $venvDir -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path $venvDir)) {
  Write-Host "Creating backend virtual environment..."
  Start-Process -FilePath $pythonSystemPath -ArgumentList "-m", "venv", $venvDir -Wait
}

# Set Python Executable from virtual environment
$pythonExe = Join-Path $backendDir "venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = $pythonSystemPath
}

# Install backend dependencies if not already installed (venv setup)
$pipExe = Join-Path $backendDir "venv\Scripts\pip.exe"
if (Test-Path $pipExe) {
    Write-Host "Checking/Installing backend dependencies..."
    Start-Process -FilePath $pipExe -ArgumentList "install", "-r", (Join-Path $backendDir "requirements.txt") -Wait
}

# Find NPM dynamically
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) {
    $npmCmd = (Get-Command npm -ErrorAction SilentlyContinue).Source
}
if (-not $npmCmd) {
    if (Test-Path "C:\Program Files\nodejs\npm.cmd") {
        $npmCmd = "C:\Program Files\nodejs\npm.cmd"
    } else {
        $npmCmd = "npm.cmd"
    }
}

# Install frontend dependencies if node_modules doesn't exist
if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies (npm install)..."
    Start-Process -FilePath $npmCmd -ArgumentList "install" -WorkingDirectory $frontendDir -Wait
}

# Configure Environment Variables dynamically
$env:NEXT_PUBLIC_API_URL = "http://127.0.0.1:$backendPort"
$env:CORS_ORIGINS = "http://localhost:$frontendPort,http://127.0.0.1:$frontendPort,http://localhost:3000,http://127.0.0.1:3000"
$env:PORT = $frontendPort

# Ollama has been removed in favor of Gemini API
Write-Host "Starting Backend on http://127.0.0.1:$backendPort ..."
$backend = Start-Process -FilePath $pythonExe `
  -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "$backendPort" `
  -WorkingDirectory $backendDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $backendDir "uvicorn.out.log") `
  -RedirectStandardError (Join-Path $backendDir "uvicorn.err.log") `
  -PassThru
$backend.Id | Set-Content (Join-Path $backendDir "codex-uvicorn.pid")

Write-Host "Starting Frontend on http://127.0.0.1:$frontendPort ..."
$frontend = Start-Process -FilePath $npmCmd `
  -ArgumentList "run", "dev", "--", "-p", "$frontendPort" `
  -WorkingDirectory $frontendDir `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $frontendDir "next.out.log") `
  -RedirectStandardError (Join-Path $frontendDir "next.err.log") `
  -PassThru
$frontend.Id | Set-Content (Join-Path $frontendDir "codex-next.pid")

Write-Host "Waiting 5 seconds for services to initialize..."
Start-Sleep -s 5

$backendOk = $false
$frontendOk = $false

try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$backendPort/" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
        $backendOk = $true
    }
} catch {
    # If connection refused or error
}

try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$frontendPort/" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        $frontendOk = $true
    }
} catch {
    # If connection refused or error
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "🎉 PHYSICS AI TEACHER STACK STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "👉 Backend API:   http://127.0.0.1:$backendPort" -ForegroundColor Cyan
if ($backendOk) { Write-Host "   Status: Active & Responding" -ForegroundColor Green } else { Write-Host "   Status: Not Responding (check backend/uvicorn.err.log)" -ForegroundColor Red }
Write-Host "👉 Frontend App:  http://127.0.0.1:$frontendPort" -ForegroundColor Cyan
if ($frontendOk) { Write-Host "   Status: Active & Responding" -ForegroundColor Green } else { Write-Host "   Status: Not Responding (check frontend/next.err.log)" -ForegroundColor Red }
Write-Host "==================================================" -ForegroundColor Green
Write-Host "App band karne ke liye running window me 'stop-all.ps1' run karein."
Write-Host ""
