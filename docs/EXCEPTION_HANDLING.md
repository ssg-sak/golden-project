# 예외 처리 규칙 — 대구 골든타임

> 이 문서는 **예외·오류를 어디서 잡고, 어떻게 사용자에게 보여줄지**에 대한 프로젝트 공통 규칙입니다.  
> 코드를 한 파일에 몰아두지 않고, **레이어마다 역할을 나누되 메시지·폴백 전략은 여기서 통일**합니다.

**관련 문서:** [참고서.md](./참고서.md) · [hospitals-api-flow.md](./hospitals-api-flow.md) · [LIVE_OPS_AND_EDGE_CASES.md](./LIVE_OPS_AND_EDGE_CASES.md)

---

## 1. 기본 원칙

| 원칙 | 설명 |
|------|------|
| **잡는 곳은 가깝게** | GPS·HTTP·JSON·비즈니스 로직은 각 레이어에서 처리 |
| **말하는 방식은 공통으로** | 사용자 문구는 `readErrorMessage()` 등 공통 유틸 경유 |
| **Graceful Degradation** | 전체가 죽기보다 **줄이고 대체** (병상 null, GeoJSON 폴백, 시청 좌표) |
| **재시도 폭주 금지** | fetch 실패 후 `error !== null`이면 자동 재요청하지 않음 |
| **로그는 API를 죽이지 않게** | 백엔드 `print()` 대신 `logging` 사용 (Windows cp949 인코딩 이슈 방지) |

---

## 2. 레이어 구조

```
[프론트엔드]

  UI (CitizenView, AdminView, LocationNotice)
    ↑ error 상태 · 폴백 UI · 재시도 버튼
  Store (hospitalStore, vulnerabilityStore)
    ↑ try/catch · error: string | null
  API (hospitals.ts, vulnerability.ts)
    ↑ fetch · HTTP · JSON · 스키마 검증
  공통 (error-message.ts)
    ↑ readErrorMessage(unknown, fallback)

[백엔드]

  Route (hospitals.py, vulnerability.py, indicators.py)
    ↑ HTTPException · 응답 코드
  Service (hospital_realtime.py)
    ↑ 공공 API/Mock · 예외 삼키고 null/mock 반환
  데이터 파일 (final_hospitals.json, GeoJSON, CSV)
```

**전역 `@app.exception_handler`는 현재 없음.** 라우트·서비스 단에서 처리합니다.

---

## 3. 프론트엔드 규칙

### 3.1 공통 — 에러 메시지 변환

| 파일 | 함수 | 용도 |
|------|------|------|
| `frontend/src/shared/lib/error-message.ts` | `readErrorMessage(error, fallback)` | `unknown` → 사용자용 `string` |

**규칙**

- Store의 `catch` 블록에서는 **반드시** `readErrorMessage` 사용
- `error.message`가 비어 있으면 `fallback` 문구 사용
- 새 Store/API 추가 시 동일 패턴 유지

```ts
catch (error) {
  set({
    error: readErrorMessage(error, '기본 안내 문구'),
    isLoading: false,
  });
}
```

---

### 3.2 API 레이어 — throw 지점

| 파일 | 실패 시 동작 |
|------|----------------|
| `frontend/src/shared/api/hospitals.ts` | 네트워크·非200·JSON·스키마·빈 배열 → `throw new Error(메시지)` |
| `frontend/src/shared/api/vulnerability.ts` | API 실패 → **번들 GeoJSON 폴백**; 깨진 JSON → throw (폴백 안 함) |

**규칙**

- API 함수는 **Zustand에 직접 쓰지 않음** — throw만 하고 Store가 catch
- 사용자에게 보여줄 문구는 Error `message`에 넣기 (한국어, 짧게)
- DEV에서만 `console.warn` / `console.error` (스키마 drop 등)

---

### 3.3 Store 레이어 — catch · 상태

| 파일 | 성공 | 네트워크/타임아웃 폴백 | 치명적 실패 |
|------|------|------------------------|-------------|
| `hospitalStore.ts` | `error: null`, `isDegraded: false` | `error: null`, `isDegraded: true` + `STATIC_FALLBACK_HOSPITAL_DATA` (병상 null) | `error: string`, 목록 비움 |
| `vulnerabilityStore.ts` | `error: null`, `isDegraded: false` | `error: null`, `isDegraded: true` (번들 GeoJSON) | `error: string`, features 비움 |

**규칙**

- `fetch*` 시작: `{ isLoading: true, error: null, isDegraded: false }` (해당 store)
- 성공: `isLoading: false`, 데이터 저장
- **병원 네트워크 실패:** 지도·목록은 유지, `DegradedDataBanner` 표시 — `error`로 막지 않음
- **치명적 실패** (폴백 목록 없음): `error` 설정 → `HospitalsErrorState`
- fetch 완료 시 **request ID**로 race 방지 (`hospitalFetchSeq`, `vulnerabilityFetchSeq`)
- DEV에서 `console.warn` / `console.error` (선택)

---

### 3.4 Bootstrap — 자동 재시도 방지

| 파일 | 규칙 |
|------|------|
| `frontend/src/shared/components/AppDataBootstrap.tsx` | `error === null`일 때만 최초 fetch |

**금지:** fetch 실패 후 `useEffect`가 무한 재요청하는 패턴

**허용:** 화면의 「다시 시도」 버튼으로만 재요청

---

### 3.5 UI 레이어 — 화면별 표현

| 화면/기능 | 파일 | 실패 시 UX |
|-----------|------|------------|
| 병원 네트워크/타임아웃 | `CitizenView`, `AdminView`, `LandingPage` | `DegradedDataBanner` + null 병상 (지도·목록 유지) |
| 병원 치명적 실패 | `CitizenView`, `AdminView` | 지도 영역 `HospitalsErrorState` + 다시 시도 |
| 병원 로딩 중 | 위와 동일 | 지도 대신 로딩 (`mapBlocked = loading \|\| error`) |
| 취약지구 번들 폴백 | `AdminView` | amber `DegradedDataBanner` (지도 유지) |
| 취약지구 치명적 실패 | `AdminView` | 상단 amber 배너 + 다시 시도 |
| GPS 실패/거부 | `locationStore` + `LocationNotice` | 시청 폴백 + 사유별 안내 |

**규칙**

- 시민 모드: `mapBlocked = hospitalsLoading || hospitalsError !== null` — **degraded는 막지 않음**
- `isDegraded`일 때 반드시 `DegradedDataBanner` 표시

---

### 3.6 GPS 전용 (HTTP와 별도)

| 파일 | 폴백 |
|------|------|
| `frontend/src/shared/hooks/useUserLocation.ts` | 거부·타임아웃·미지원·대구 밖 → `DAEGU_CITY_HALL` + `source: 'fallback'` |

GPS는 **서버에 저장하지 않음.** 브라우저에서만 사용.

---

## 4. 백엔드 규칙

### 4.1 라우트 — HTTPException

| 파일 | 성공 | 데이터 없음 | 읽기/파싱 실패 |
|------|------|-------------|----------------|
| `backend/app/api/routes/hospitals.py` | 200 + JSON | 503 (파일 없음) | 500/503 |
| `backend/app/api/routes/vulnerability.py` | 200 + GeoJSON 파일 | 503 | — |
| `backend/app/api/routes/indicators.py` | 200 + JSON | 503 | 500/503 |

**규칙**

- `detail`은 한국어로, **복구 방법**(스크립트 실행 등) 포함 가능
- 병원 API만 **「항상 200」** 지향 (아래 서비스 폴백과 연동)

---

### 4.2 서비스 — 병원 실시간 병상

| 파일 | 역할 |
|------|------|
| `backend/app/services/hospital_realtime.py` | Mock / `fetch_all_beds_from_api_async` (폴러 전용) |
| `backend/app/services/bed_cache.py` | 인메모리 캐시 — **사용자 요청은 여기만 읽음** |
| `backend/app/services/bed_poller.py` | lifespan 백그라운드 폴링 (기본 120초) |
| `backend/app/services/bed_payload.py` | 병상 JSON 스키마 |

**규칙**

- 사용자 `GET /api/hospitals` 경로에서 **공공 API 9회 호출 금지** — 캐시만 반환
- 폴러는 `httpx.AsyncClient` + `asyncio.sleep` (동기 `Client` / `time.sleep` 금지)
- `resolve_realtime_beds` → `resolve_realtime_beds_async` + `async def get_hospitals`
- 실패 시 캐시 데이터 **유지** (`mark_refresh_error`), 새 요청마다 null로 덮지 않음
- Mock 모드: 폴러 미시작, `get_mock_realtime_data` 즉시 반환

---

## 5. 기능별 폴백 매트릭스

| 기능 | 1차 | 실패 시 | UI |
|------|-----|---------|-----|
| 병원 목록 | `GET /api/hospitals` | Store `error`, 목록·지도 차단 | 에러 패널 + 다시 시도 |
| 실시간 병상 | Mock 또는 공공 API | `available_beds: null` | 「실시간 확인 중」 |
| 취약지구 GeoJSON | `GET /api/vulnerability` | 번들 `daegu_vulnerability.geojson` | (폴백 성공 시 정상) |
| 취약지구 (폴백도 실패) | — | Store `error` | Admin 상단 배너 |
| GPS | `navigator.geolocation` | 대구시청 좌표 | LocationNotice 안내 |
| 카카오맵 SDK | `useKakaoLoader` | `kakao.error` | 「지도를 불러오지 못했습니다」 |

---

## 6. 새 코드 작성 시 체크리스트

### 프론트 — API 추가할 때

- [ ] `fetch` try/catch로 네트워크 분리
- [ ] `response.ok` 검사
- [ ] `response.json()` try/catch
- [ ] 스키마 검증 후 throw
- [ ] Store에서 catch + `readErrorMessage`
- [ ] Bootstrap에 무한 재시도 조건 넣지 않기

### 프론트 — UI 추가할 때

- [ ] 로딩 / 에러 / 빈 상태 3가지 구분
- [ ] 응급 안내(119·1339)는 에러 화면에 유지
- [ ] 재시도는 버튼으로만

### 백엔드 — API 추가할 때

- [ ] 파일·DB 없음 → `HTTPException(503, detail=...)`
- [ ] 파싱 실패 → `HTTPException(500, detail=...)`
- [ ] 부가 기능(실시간 조회 등) 실패가 **핵심 응답을 죽이지 않게** 서비스 레이어에서 흡수
- [ ] 로그는 `logging.getLogger(__name__)`

---

## 7. 자주 하는 실수 (이 프로젝트에서 실제 발생)

| 증상 | 원인 | 조치 |
|------|------|------|
| 지도가 안 뜸 | `/api/hospitals` 500 → `mapBlocked` | 백엔드 로그·Store `error` 확인 |
| API 500 + `UnicodeEncodeError` | `print()`에 em dash 등 | `logging`으로 교체 |
| fetch 무한 반복 | `useEffect`가 `error` 무시 | `error === null` 가드 |
| 취약지구만 안 됨 | API·폴백 둘 다 실패 | `vulnerabilityStore.error` |

---

## 8. 파일 빠른 참조

```
frontend/src/shared/lib/error-message.ts      # 메시지 공통
frontend/src/shared/api/hospitals.ts
frontend/src/shared/api/vulnerability.ts
frontend/src/shared/store/hospitalStore.ts
frontend/src/shared/store/vulnerabilityStore.ts
frontend/src/shared/components/AppDataBootstrap.tsx
frontend/src/shared/hooks/useUserLocation.ts
frontend/src/widgets/app/CitizenView.tsx
frontend/src/widgets/app/AdminView.tsx
frontend/src/widgets/landing/LocationNotice.tsx

backend/app/api/routes/hospitals.py
backend/app/api/routes/vulnerability.py
backend/app/api/routes/indicators.py
backend/app/services/hospital_realtime.py
```

---

## 9. 향후 확장 (규모 커질 때)

지금 규모에서는 **필수 아님**. 팀·기능이 늘면 순서대로 검토.

1. `ApiError` 클래스 (status + message + code)
2. FastAPI 전역 exception handler (500 JSON 형식 통일)
3. React Error Boundary (렌더 크래시)
4. Sentry 등 외부 모니터링

---

*마지막 갱신: 예외 처리 레이어 정리 · 병원 API logging 전환 · Graceful Degradation 기준 반영*
