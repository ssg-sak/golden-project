# 개발 서버 포트 · 좀비 프로세스 가이드

> **대상:** 기획·개발  
> **증상:** API가 Mock인데 실 API로 바꿨는데도 안 바뀜, 서버가 느려짐

---

## 1. 포트가 뭔가요?

| 포트 | 서비스 | 기본 URL |
|------|--------|----------|
| **8000** | FastAPI 백엔드 | http://127.0.0.1:8000 |
| **5173** | Vite 프론트 | http://localhost:5173 |

프론트는 `VITE_API_BASE_URL=http://localhost:8000` 으로 **8000만** 바라봅니다.  
운영 원칙은 **백엔드 8000 단일 포트**입니다.

---

## 2. 왜 프로세스가 여러 개 생기나?

### 원인 A — 좀비 프로세스 (이번 케이스)

1. `uvicorn ... --port 8000` 실행
2. 터미널을 X로 닫거나 **Ctrl+C 없이** 다시 실행
3. 이전 서버가 8000을 잡고 있음 → 새 서버 실행이 실패하거나 임시 포트로 분기됨
4. `--reload` 사용 시 **부모(reloader) + 자식(worker)** 가 쌍으로 남음

**증상:** `netstat`에 8000 LISTENING이 2~3개, 응답이 Mock / 설정이 안 바뀜

### 원인 B — 멀티 워커 (이 프로젝트 해당 없음)

`uvicorn main:app --workers 4` 처럼 **의도적으로** 4일꾼을 띄운 경우.  
우리는 `--workers`를 쓰지 않습니다. 4개 = 좀비일 가능성이 큽니다.

### 정상: `--reload`일 때 Python 2개

`uvicorn --reload`는 **부모(reloader) + 자식(worker)** 2프로세스가 보입니다.  
이건 정상입니다. **8000 LISTENING이 1개**이고, `runtime-config`가 최신이면 OK.

| 상태 | Python 개수 | 8000 LISTENING |
|------|-------------|----------------|
| 정상 (`--reload`) | 2 | 1 |
| 좀비 (이번 사례) | 4+ | 2~3 |

---

## 3. 해결 절차 (4단계)

### ① 상태 확인

```powershell
powershell -File scripts/dev/check-dev-ports.ps1
```

### ② 전부 끄기

```powershell
powershell -File scripts/dev/stop-dev-servers.ps1
```

또는 백엔드 터미널에서 **Ctrl+C** 한 번 → `Application shutdown complete` 확인 후 닫기.

### ③ 하나만 켜기

```powershell
# 터미널 1 — 백엔드
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# 터미널 2 — 프론트
cd frontend
npm run dev
```

`strictPort: true` (vite.config) 덕분에 프론트는 5173이 막히면 **5174로 안 넘어가고 에러** → 포트 꼬임을 바로 알 수 있음.

### ④ 검증

```powershell
# 포트 1개만 LISTENING
netstat -ano | findstr ":8000"

# 실 API 모드 확인 (키·.env 설정 후)
curl http://127.0.0.1:8000/api/hospitals/runtime-config
```

기대: `use_mock_api: false`, `should_use_mock_realtime: false`

---

## 4. 재발 방지 습관

| 하지 말 것 | 대신 |
|------------|------|
| 서버 안 끄고 새 터미널에서 또 실행 | 먼저 Ctrl+C 또는 `stop-dev-servers.ps1` |
| 임시 포트(8001 등) 백엔드를 계속 사용 | 항상 **8000** 하나만 사용 |
| 터미널 X로 닫기 | Ctrl+C 후 종료 |

---

## 5. 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/dev/check-dev-ports.ps1` | 포트·프로세스 진단 |
| `scripts/dev/stop-dev-servers.ps1` | 8000/5173 정리 + 8001 청소(안전장치) |
| `scripts/dev/start-backend.ps1` | 8000 비었을 때만 기동 |
| `frontend/vite.config.ts` | `strictPort: true` (5173 고정) |
| `frontend/src/shared/config/api.ts` | API 기본 `localhost:8000` |

**명령어 치트시트:** [DEV_COMMANDS.md](./DEV_COMMANDS.md)

---

*2026-07-07 — 포트 8000 좀비 3세트 사례 정리 (8001은 청소 안전장치로만 유지)*
