# 대구 골든타임 — 개발 서버 포트 점검
# 사용: powershell -File scripts/dev/check-dev-ports.ps1

$ports = @(8000, 5173, 8001) # 8001 is cleanup-only legacy check

Write-Host "`n=== Port check ===" -ForegroundColor Cyan

foreach ($port in $ports) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) {
        Write-Host "  [$port] FREE" -ForegroundColor Green
        continue
    }

    $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
    Write-Host "  [$port] IN USE ($($pids.Count) listener(s))" -ForegroundColor Yellow
    foreach ($procId in $pids) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
        if ($proc) {
            $cmd = $proc.CommandLine
            if ($cmd.Length -gt 100) { $cmd = $cmd.Substring(0, 100) + "..." }
            Write-Host "    PID $procId | $($proc.Name) | $cmd"
        } else {
            Write-Host "    PID $procId | (process not found - zombie socket?)"
        }
    }
}

Write-Host "`n=== Python / uvicorn processes ===" -ForegroundColor Cyan
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)"
    $cmd = $p.CommandLine
    if ($cmd -match "uvicorn|multiprocessing") {
        Write-Host "  PID $($_.Id) | $cmd"
    }
}

Write-Host "`n=== API probe (if backend up) ===" -ForegroundColor Cyan
foreach ($port in @(8000, 8001)) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/hospitals/runtime-config" -UseBasicParsing -TimeoutSec 2
        if ($port -eq 8001) {
            Write-Host "  :$port runtime-config -> $($r.StatusCode) $($r.Content) [cleanup-only port; should be unused]" -ForegroundColor Yellow
        } else {
            Write-Host "  :$port runtime-config -> $($r.StatusCode) $($r.Content)" -ForegroundColor Green
        }
    } catch {
        Write-Host "  :$port -> not responding" -ForegroundColor DarkGray
    }
}

Write-Host ""
