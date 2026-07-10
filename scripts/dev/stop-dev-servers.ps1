# 대구 골든타임 — 개발 서버 종료 (좀비 프로세스 정리)
# 사용: powershell -File scripts/dev/stop-dev-servers.ps1

$ports = @(8000, 8001, 8002, 8003, 5173) # 8001+ are cleanup-only safety targets
$killed = @()

foreach ($port in $ports) {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    foreach ($procId in $pids) {
        if ($procId -in $killed) { continue }
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        $killed += $procId
        Write-Host "Stopped PID $procId (port $port)"
    }
}

# uvicorn --reload 자식 프로세스 (부모가 죽은 좀비)
Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)" -ErrorAction SilentlyContinue
    if ($p.CommandLine -match "uvicorn|multiprocessing\.spawn") {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped Python PID $($_.Id)"
    }
}

Start-Sleep -Seconds 2

Write-Host "`nRemaining listeners on dev ports:"
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in $ports } |
    ForEach-Object { Write-Host "  port $($_.LocalPort) PID $($_.OwningProcess)" }

if (-not (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @(8000, 8001) })) {
    Write-Host "`nBackend default port 8000 is free (8001 also clear)." -ForegroundColor Green
}
