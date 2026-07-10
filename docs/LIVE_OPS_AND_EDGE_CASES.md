# 라이브 운영 · 엣지 케이스 · 테스트 가이드

> **대상:** 기획·개발·면접 준비  
> **목적:** 강사님이 짚어주신 **「실제 라이브로 돌아가는 공공 서비스」** 관점에서,  
> 우리가 이미 구현한 방어 로직과 **앞으로 해야 할 테스트**를 한곳에 정리합니다.

**관련 문서**

- [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md) — 예외 처리 **코딩 규칙**
- [CODE_EXPLANATION.md](../CODE_EXPLANATION.md) — 코드가 **왜** 그렇게 짰는지 (학습·면접용)
- [hospitals-api-flow.md](./hospitals-api-flow.md) — 병원 API → 지도 마커 흐름

---

## 1. 왜 이 문서가 필요한가

응급의료 플랫폼은 평소에도 중요하지만, **재난·대형 사고 시 수만 명이 동시에 접속**할 수 있습니다.

| 관문 | 의미 |
|------|------|
| **스트레스 테스트** | 트래픽·지연·동시 요청에서도 서비스가 버티는가 |
| **완벽한 예외 처리** | 한 기능이 죽어도 전체가 붕괴하지 않는가 (Graceful Degradation) |
| **엣지 케이스 방어** | GPS 거부·API 지연·병상 0개 같은 **비정상 상황**에서도 시민이 행동할 수 있는가 |

단순히 “기능이 돌아간다”가 아니라, **“망가져도 최소한의 골든타임 정보는 준다”** — 이게 시니어급 공공 서비스 설계의 핵심입니다.

---

## 2. 우리 프로젝트가 이미 갖춘 방어 (면접 한 줄)

> “외부 공공 API 승인 지연·장애에 대비해 Mock 제너레이터를 두었고, API가 죽어도 병원 좌표는 살리고 병상만 null로 내립니다. GPS 거부·대구 외 접속은 시청 폴백으로 거리순 안내를 유지합니다.”

| 상황 | 방어 | 코드 위치 |
|------|------|-----------|
| 공공 API / Mock 실패 | 병상 `null`, 병원 목록은 200 | `hospital_realtime.py`, `hospitals.py` |
| 병원 fetch 실패 | 지도 대신 에러 + 다시 시도 | `hospitalStore.ts`, `CitizenView.tsx` |
| 취약지구 API 실패 | 번들 GeoJSON 폴백 | `vulnerability.ts` |
| GPS 거부·타임아웃 | 대구시청 좌표 폴백 | `useUserLocation.ts` |
| fetch 실패 후 | 자동 재요청 폭주 없음 | `AppDataBootstrap.tsx` |

자세한 규칙: [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md)

---

## 2.1 병상 API 성능 개선 (2026-07-07) — Anti-Gravity 점검 반영

**이전 문제 (치명적)**

- 사용자 요청마다 동기 `httpx.Client` + `time.sleep()`으로 **시군구 9회** 공공 API 호출
- FastAPI 스레드풀 점유 → 동시 접속 시 응답 지연·타임아웃

**개선 아키텍처**

```
[백그라운드 폴러] 2분마다 httpx.AsyncClient + asyncio.sleep
        ↓
  인메모리 bed_cache (전체 병원 병상)
        ↓
[GET /api/hospitals] async — 캐시만 읽고 즉시 200 (Mock 모드는 즉시 random)
```

| 파일 | 역할 |
|------|------|
| `bed_poller.py` | 서버 기동 시 폴링 시작, `BED_CACHE_POLL_INTERVAL_SEC` (60~300초) |
| `bed_cache.py` | 인메모리 캐시, 요청 경로는 읽기만 |
| `hospital_realtime.py` | `fetch_all_beds_from_api_async` (폴러 전용) |
| `hospitals.py` | `async def get_hospitals` |
| `app/main.py` | `lifespan` — 폴러 start/stop |

**확인**

- `GET http://localhost:8000/api/hospitals/beds-cache-status` — 캐시 갱신 시각
- Mock 모드(`USE_MOCK_API=true`)에서는 폴러 비활성, 기존처럼 즉시 Mock

**면접 멘트**

> “요청 경로에서 외부 API를 제거하고 백그라운드 비동기 폴링 + 인메모리 캐시로 바꿔, 재난 시 동시 접속에도 API 응답을 밀리초 단위로 유지합니다.”

---

## 3. IDE 이전 (Anti-Gravity 등) — Crash & Learn

코드는 **어디서든 똑같이** 돌아갑니다. IDE만 바꿔도 됩니다.

### 3.1 이전 후 최소 세팅

```bash
# 1. 백엔드
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2. 프론트 (별도 터미널)
cd frontend
npm install
npm run dev
```

| 확인 URL | 기대 |
|----------|------|
| http://localhost:5173/ | 시민 구조망 + 지도 |
| http://localhost:8000/api/hospitals | JSON 200, 병원 배열 |

환경 변수: 프로젝트 루트 `.env` (`USE_MOCK_API=true`), `frontend/.env` (`VITE_KAKAO_MAP_APP_KEY`)

### 3.2 이해가 덜 되어도 괜찮은 이유

에러 메시지를 **직접 맞아보는 것**이 가장 빠른 학습입니다.

1. 서버 안 켜짐 → `Network Error` / 지도 안 뜸 → 백엔드 실행
2. 500 에러 → 터미널 로그 확인 → [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md) §7 사례 참고
3. 지도만 안 뜸 → 병원 API vs 카카오 키 구분 (CODE_EXPLANATION + EXCEPTION_HANDLING)

---

## 4. 예외처리 3대장 시나리오 (지금 당장 브라우저에서)

거창한 부하 테스트 전에, **아래 3가지만** 통과하면 “엣지 케이스까지 방어했다”고 말할 수 있습니다.

---

### 시나리오 ① GPS 거부

**목표:** 앱이 터지지 않고, 대구 중심(시청) 기준으로 목록·지도가 뜬다.

**방법 (Chrome 기준)**

1. 주소창 왼쪽 자물쇠 → **사이트 설정** → **위치: 차단**
2. http://localhost:5173 새로고침
3. 시민 구조망 탭 진입

**기대 결과**

| 항목 | 기대 |
|------|------|
| 크래시 | 없음 |
| 안내 | `LocationNotice` — “위치 권한이 허용되지 않아 **대구광역시청**을 기준으로…” |
| 목록 | 거리순 정렬된 병원 카드 표시 |
| 지도 | 대구 중심 + 병원 마커 |

**관련 코드:** `frontend/src/shared/hooks/useUserLocation.ts`, `LocationNotice.tsx`

**면접 멘트:** “위치 거부는 흔한 엣지 케이스라, 서버 저장 없이 브라우저만 쓰고 실패 시 행정 중심 폴백으로 **포용성**을 확보했습니다.”

---

### 시나리오 ② API 지연 (로딩 UX)

**목표:** 응답이 느려도 로딩 스피너가 보이고, 화면이 깨지지 않는다.

**방법 A — Chrome DevTools (코드 수정 없음, 추천)**

1. F12 → **Network** 탭
2. **Throttling** → `Slow 3G` 또는 `Fast 3G`
3. 새로고침 후 시민 탭 관찰

**방법 B — 백엔드 Mock에 인위 지연 (개발용)**

`backend/app/services/hospital_realtime.py`의 `resolve_realtime_beds` 안, Mock 분기 직전에 **임시로** 추가:

```python
import time
time.sleep(10)  # 테스트 후 반드시 제거
```

**기대 결과**

| 항목 | 기대 |
|------|------|
| 병원 로딩 중 | 지도 영역: 「응급실 정보를 불러오고 있습니다」 + 스피너 |
| GPS 로딩 중 | 「시민님의 현재 위치를 파악하고 있습니다 📍」 |
| 완료 후 | 지도·목록 정상 전환, 레이아웃 붕괴 없음 |

**참고:** 프론트 Mock에 `setTimeout`은 없습니다. 지연 테스트는 **네트워크 스로틀** 또는 **백엔드 sleep**이 맞습니다.

**관련 코드:** `CitizenView.tsx` (`mapBlocked`, `HospitalsLoadingState`), `HospitalSidebar.tsx`

**면접 멘트:** “로딩·에러·성공 상태를 분리해, 지연이 있어도 빈 화면이나 깨진 UI가 아니라 **명확한 피드백**을 줍니다.”

---

### 시나리오 ③ 병상 0개 (수용 불가)

**목표:** 🔴 수용 불가 배지가 보이고, 보기 설정·정렬이 의도대로 동작한다.

**방법 — Mock 병상을 0으로 고정 (개발용)**

`backend/app/services/hospital_realtime.py` → `get_mock_realtime_data`:

```python
def get_mock_realtime_data(hospital_names: list[str]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for name in hospital_names:
        # 테스트: 전원 수용 불가
        result[name] = _bed_payload(0, 0, "mock")
    return result
```

또는 특정 병원만 0으로 두고 나머지는 랜덤 — 부분 시나리오용.

백엔드 저장 후 새로고침.

**기대 결과**

| 항목 | 기대 |
|------|------|
| 카드 배지 | 🔴 **수용 불가 (이동 금지)** |
| 켜기 ON | 「🟢 진료 가능한 병원만 보기」→ 목록 비움 + 안내 문구 |
| 켜기 OFF | 🔴 병원도 거리순으로 **표시** (숨기지 않음) |
| 지도 마커 | 빨간/초록 구분 (가용성 기준) |

**관련 코드:** `bed-status.ts`, `CitizenBedLabel.tsx`, `HospitalSidebar.tsx`

**면접 멘트:** “병상 0은 **이동 금지**로 명확히 표시하고, 보기 설정으로 진료 가능 병원만 골라 볼 수 있게 했습니다.”

> **테스트 후:** `get_mock_realtime_data`를 원래 `random.randint` 버전으로 되돌리세요.

---

## 5. 체크리스트 (3대장 통과 기준)

| # | 시나리오 | 통과 기준 |
|---|----------|-----------|
| 1 | GPS 거부 | 크래시 없음, 시청 폴백, 목록·지도 동작 |
| 2 | API 지연 | 로딩 UI 표시, 완료 후 정상 전환 |
| 3 | 병상 0 | 🔴 배지, 보기 설정 필터, 지도 반영 |

통과하면 면접에서:

> “저는 단순히 돌아가는 기능이 아니라, **재난 상황의 엣지 케이스까지 방어하는 설계**를 했습니다.”

라고 말해도 됩니다.

---

## 6. 앞으로의 스트레스 테스트 로드맵 (로드맵)

지금 단계에서는 **§4 수동 시나리오**가 우선입니다. 서비스가 커지면 아래 순서로 확장합니다.

| 단계 | 도구·방법 | 검증 목표 |
|------|-----------|-----------|
| **L1** | 브라우저 3대장 (§4) | 엣지 케이스 UX |
| **L2** | k6 / Locust / `ab` | `GET /api/hospitals` 동시 100~1000 req/s |
| **L3** | 시나리오 테스트 | GPS + 병원 fetch + 지도 렌더 동시 사용자 |
| **L4** | 모니터링 | Sentry, 응답 시간 p95, 5xx 알림 |

### L2 예시 (k6 스켈레톤 — `tests/integration/`에 Python 대안 포함)

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = { vus: 50, duration: '30s' };

export default function () {
  const res = http.get('http://127.0.0.1:8000/api/hospitals');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

Python 대안 (k6 미설치 시):

```bash
python tests/integration/load_test.py --concurrency 100 --requests 500
```

테스트 폴더·결과 문서: [tests/README.md](../tests/README.md) · [tests/docs/TEST_RESULTS.md](../tests/docs/TEST_RESULTS.md)

**공공 서비스에서 스트레스 테스트 때 볼 것**

- p95 응답 시간 (목표: 시민 API < 500ms~1s)
- 5xx 비율 (목표: 0%에 가깝게 — 병원 API는 특히)
- Mock/캐시 없이 공공 API 직결 시 한계점 (rate limit)

---

## 7. 재난 상황 시나리오 (설계 점검용)

| 상황 | 위험 | 우리 대응 | 추가 과제 |
|------|------|-----------|-----------|
| 동시 접속 폭주 | API·서버 다운 | Mock, 정적 JSON, 200 유지 | CDN, 캐시, 오토스케일 |
| 공공 API 장애 | 병상 정보 없음 | `available_beds: null` | “실시간 확인 중” UX 유지 |
| GPS 대량 거부/실패 | 정렬 불가 | 시청 폴백 | 문구·신뢰도 안내 |
| 카카오맵 CDN 지연 | 지도 blank | 로딩/에러 UI | /list 목록-only 진입점 |
| 잘못된 병상(0인데 이동) | 생명 위험 | 🔴 수용 불가 + 119 안내 | tel: 연동, 1339 강조 |

---

## 8. 문서·코드 유지보수

| 할 일 | 문서 |
|------|------|
| 예외 처리 **규칙** 추가/변경 | [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md) |
| **왜** 그렇게 짰는지, 면접 스토리 | [CODE_EXPLANATION.md](../CODE_EXPLANATION.md) |
| **라이브·테스트·엣지 케이스** | 이 문서 |
| 새 시나리오 통과 | §5 체크리스트에 행 추가 |

---

## 9. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-07 | §2.1 병상 API — 비동기 httpx + 백그라운드 인메모리 캐시 |
| 2026-07-07 | 초안 — 3대장 시나리오, IDE 이전, 스트레스 테스트 로드맵, 면접 멘트 |

---

*“Crash & Learn” — 안티그래비티든 Cursor든, 에러 로그를 친구로 삼으면 됩니다.*
