$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPidFile = Join-Path $root "backend\codex-uvicorn.pid"
$frontendPidFile = Join-Path $root "frontend\codex-next.pid"

function Stop-FromPidFile([string]$pidFile) {
  if (Test-Path $pidFile) {
    $pidValue = Get-Content $pidFile | Select-Object -First 1
    if ($pidValue) {
      # taskkill /T kills the process AND all its child processes (e.g. node.exe, python.exe)
      taskkill /PID ([int]$pidValue) /F /T *>&1 | Out-Null
    }
    Remove-Item $pidFile -Force
  }
}

Stop-FromPidFile $backendPidFile
Stop-FromPidFile $frontendPidFile

Write-Host "Stopped tracked backend/frontend processes (if running)."
