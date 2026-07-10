# 대구 골든타임 — 백엔드 단일 기동 (8000)
# 사용: powershell -File scripts/dev/start-backend.ps1

$port = 8000
$busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if ($busy) {
    Write-Host "Port $port is already in use. Run stop-dev-servers.ps1 first." -ForegroundColor Red
    & "$PSScriptRoot/check-dev-ports.ps1"
    exit 1
}

$backend = Resolve-Path "$PSScriptRoot/../../backend"
Write-Host "Starting backend on http://127.0.0.1:$port ..." -ForegroundColor Cyan
Set-Location $backend
uvicorn main:app --reload --host 127.0.0.1 --port $port
