# 개발 명령어 모음

> **용도:** 복붙용 시작·종료·점검 코드만 모아 둔 치트시트  
> 포트 꼬임·좀비 프로세스 → [DEV_SERVERS.md](./DEV_SERVERS.md)

---

## 포트 한눈에

| 포트 | 서비스 | URL |
|------|--------|-----|
| 8000 | 백엔드 (FastAPI) | http://127.0.0.1:8000 |
| 5173 | 프론트 (Vite) | http://localhost:5173 |

---

## 최초 1회 세팅

```bash
# 백엔드 의존성
cd backend
pip install -r requirements.txt

# 프론트 의존성
cd frontend
npm install

# Playwright (E2E 최초 1회)
cd frontend
npx playwright install chromium
```

### 환경 변수

```bash
# 프로젝트 루트 — .env.example 복사 후 수정
USE_MOCK_API=false
DATA_GO_KR_API_KEY=여기에_키

# 프로젝트 루트 .env (통합됨)
VITE_KAKAO_MAP_APP_KEY=여기에_키
```

---

## 매일 — 서버 시작

**터미널 2개** 쓰세요. (하나에 백+프론트 같이 X)

### 방법 A — 직접 명령 (가장 흔함)

```bash
# 터미널 1 · 백엔드
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

```bash
# 터미널 2 · 프론트
cd frontend
npm run dev
```

### 방법 B — PowerShell 스크립트 (Windows)

```powershell
# 꼬였을 때 먼저 정리
powershell -File scripts/dev/stop-dev-servers.ps1

# 포트 상태 확인
powershell -File scripts/dev/check-dev-ports.ps1

# 백엔드만 (8000 비었을 때)
powershell -File scripts/dev/start-backend.ps1
```

---

## 매일 — 서버 종료

```text
각 터미널에서 Ctrl + C
→ "Application shutdown complete" (백엔드) 확인 후 창 닫기
```

```powershell
# 한 번에 끄기 (Windows)
powershell -File scripts/dev/stop-dev-servers.ps1
```

---

## 동작 확인 URL

| 확인 | URL |
|------|-----|
| 시민 앱 | http://localhost:5173/ |
| API 문서 (Swagger) | http://localhost:8000/docs |
| 병원 목록 JSON | http://localhost:8000/api/hospitals |
| Mock/실 API 상태 | http://localhost:8000/api/hospitals/runtime-config |
| 병상 캐시 상태 | http://localhost:8000/api/hospitals/beds-cache-status |

**실 API 모드 기대값** (`runtime-config`):

```json
{"use_mock_api":false,"has_api_key":true,"should_use_mock_realtime":false}
```

---

## 테스트

```bash
# Unit — 프론트
cd frontend && npm test

# Unit — 백엔드 (서버 켜 둔 상태)
python -m pytest tests/unit/backend -v

# E2E (백+프론트 켜 둔 상태)
cd frontend && npm run test:e2e

# 엣지 케이스
python tests/integration/edge_cases.py

# 부하
python tests/integration/load_test.py --concurrency 100 --requests 500

# 공공 API 키 연결 확인
python tests/integration/verify_realtime_api.py
```

---

## 데이터 · 스크립트 (필요할 때만)

```bash
# 병원 JSON 병합 (final_hospitals.json 없을 때)
python backend/scripts/05_merge_final_hospitals.py

# Mock 지표·GeoJSON (초기 세팅)
python backend/scripts/01_setup_mock_data.py
```

---

## 빌드 (배포 전 확인)

```bash
cd frontend
npm run build
```

---

## 자주 쓰는 조합 (한 줄 요약)

| 하고 싶은 것 | 명령 |
|--------------|------|
| 백엔드만 | `cd backend && uvicorn main:app --reload --host 127.0.0.1 --port 8000` |
| 프론트만 | `cd frontend && npm run dev` |
| 포트 점검 | `powershell -File scripts/dev/check-dev-ports.ps1` |
| 전부 끄기 | `powershell -File scripts/dev/stop-dev-servers.ps1` |
| API 살아있나 | 브라우저 → `http://127.0.0.1:8000/api/hospitals` |

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [DEV_SERVERS.md](./DEV_SERVERS.md) | 포트 충돌 · 좀비 프로세스 해결 |
| [LIVE_OPS_AND_EDGE_CASES.md](./LIVE_OPS_AND_EDGE_CASES.md) | GPS 거부 등 수동 테스트 |
| [tests/docs/TESTING.md](../tests/docs/TESTING.md) | 테스트 4단계 상세 |
| [README.md](../README.md) | 프로젝트 전체 소개 |

---

*복붙용 — 명령만 바꿀 때는 이 파일만 열면 됩니다.*
