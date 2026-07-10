# 개선 보고서 — 상태 관리 · 예외 처리

> [AUDIT_STATE_AND_EXCEPTIONS.md](./AUDIT_STATE_AND_EXCEPTIONS.md) 점검 결과를 바탕으로 적용한 수정 내역입니다.  
> **유지보수 시** 이 문서와 `EXCEPTION_HANDLING.md`를 함께 참고하세요.

**적용 일자:** 2026-07-07  
**테스트:** 프론트 Vitest 16 passed · 백엔드 pytest 8 passed · `npm run build` 성공

---

## 진행 요약

| # | 항목 | 우선순위 | 상태 |
|---|------|----------|------|
| 1 | 폴백 병상 null (허위 초록 제거) | P0 | ✅ 완료 |
| 2 | `isDegraded` UI 배너 연결 | P0 | ✅ 완료 |
| 3 | `error` vs `isDegraded` 역할 분리 | P1 | ✅ 완료 |
| 4 | `fetchId` race guard (병원·취약지구) | P1 | ✅ 완료 |
| 5 | `bed_poller` 캐시 null 덮어쓰기 방지 | P1 | ✅ 완료 |
| 6 | poller cold start non-blocking | P1 | ✅ 완료 |
| 7 | 공공 API XML `resultCode` 검증 | P1 | ✅ 완료 |
| 8 | GPS `locationStore` 공유 | P2 | ✅ 완료 |
| 9 | GNB `/list` → citizen 모드 동기화 | P3 | ✅ 완료 |
| 10 | 히트맵 토글 비활성화 (데이터 없음) | P3 | ✅ 완료 |
| 11 | `hvec=0, hvoc>0` 소아 병상 반영 | P3 | ✅ 완료 |
| 12 | 시민 상세 패널 오프라인 안내·전화 | P3 | ✅ 완료 |
| 13 | 정적 병원 JSON 메모리 캐시 | P3 | ✅ 완료 |
| 14 | 취약지구 `isDegraded` (번들 폴백 표시) | P2 | ✅ 완료 |

---

## 1. 폴백 병상 null — 허위 초록 병상 제거 (P0)

### 문제
서킷 브레이커 실패 시 `MOCK_HOSPITAL_DATA`가 합성 `hvec`/`hvoc`를 넣어 「진료 가능 (N개)」로 표시됨.

### 조치
- **신규** `frontend/src/shared/data/static-fallback-hospitals.ts`  
  - `STATIC_FALLBACK_HOSPITAL_DATA`: 좌표·이름·tier 유지, `available_beds: null`, `realtime_source: 'unavailable'`
- `mock-hospital-data.ts` → 위 데이터 re-export (레거시 import 호환)
- `hospitalStore.ts` → 폴백 시 `STATIC_FALLBACK_HOSPITAL_DATA` 사용

### 검증
- `tests/unit/frontend/static-fallback-hospitals.test.ts` — 전 병원 `unknown` 상태 확인

### 유지보수 메모
- **절대** 폴백 데이터에 가짜 병상 숫자를 넣지 마세요. 백엔드 null-bed 정책과 맞춰야 합니다.

---

## 2. `isDegraded` UI 배너 (P0)

### 문제
Store에만 `isDegraded`가 있고 화면에 표시되지 않음.

### 조치
- **신규** `frontend/src/widgets/shared/DegradedDataBanner.tsx`
- 연결: `CitizenView.tsx`, `LandingPage.tsx`, `AdminView.tsx` (병원)
- `AdminView.tsx` — 취약지구 번들 폴백 시 별도 문구

### UX
> 실시간 병상 정보를 확인하지 못했습니다. 거리·전화·길찾기만 참고해 주세요.

배너에 「다시 시도」 버튼 포함 (`onRetry`).

---

## 3. `error` vs `isDegraded` 계약 (P1)

### 문제
모든 실패가 `error: null` + Mock이라 `HospitalsErrorState`가 dead code.

### 조치 (현재 계약)

| 상태 | `error` | `isDegraded` | UI |
|------|---------|--------------|-----|
| 정상 API | `null` | `false` | 일반 화면 |
| 네트워크/타임아웃 폴백 | `null` | `true` | 배너 + null 병상 |
| 치명적 실패 (폴백 목록 0건) | `string` | `false` | `HospitalsErrorState` |

- `hospitalStore.ts` — `readErrorMessage`로 치명적 실패만 `error` 설정
- `HospitalsErrorState` — **503·빈 폴백** 등 극단적 경우에만 표시 (대부분 degraded 경로)

---

## 4. fetch race guard (P1)

### 문제
`fetchHospitals` / `fetchVulnerability` 연타 시 늦은 응답이 최신 결과를 덮어씀.

### 조치
- `hospitalStore.ts` — `hospitalFetchSeq` 증가·완료 시 ID 비교
- `vulnerabilityStore.ts` — `vulnerabilityFetchSeq` 동일 패턴

### 유지보수 메모
새 async store action 추가 시 동일 패턴을 복사하세요.

---

## 5. 백엔드 `bed_poller` 캐시 보호 (P1)

### 문제
API가 전부 null payload를 반환해도 `replace_cache`로 기존 캐시를 지움.

### 조치
- `hospital_realtime.py` — `has_any_live_beds()`, `_is_api_response_ok()`
- `bed_poller.py` — live bed 없으면 `mark_refresh_error`만 호출 (캐시 유지)
- `_fetch_sgg_beds_async` — HTTP 200 + Unauthorized/resultCode 오류 본문 스킵

### 검증
- `tests/unit/backend/test_hospital_realtime_helpers.py`

---

## 6. poller cold start non-blocking (P1)

### 문제
`start_bed_poller()`가 lifespan에서 `await refresh_bed_cache()`로 서버 기동을 수 분 블로킹.

### 조치
- `bed_poller.py` — `_poll_loop()` 첫 iteration에서 즉시 `refresh_bed_cache()` 후 sleep
- lifespan은 `create_task`만 하고 await 하지 않음

---

## 7. GPS `locationStore` 공유 (P2)

### 문제
`CitizenView`와 `LandingPage`가 각각 GPS 요청 → `/` ↔ `/list` 전환 시 재요청.

### 조치
- **신규** `frontend/src/shared/store/locationStore.ts`
- **신규** `frontend/src/shared/types/user-location.ts` (타입 분리)
- `useUserLocation.ts` — store 래퍼, `ensureLocation()` 1회만 실행

---

## 8. GNB `/list` 모드 동기화 (P3)

### 문제
정책 모드에서 「가까운 응급실」 클릭 시 `viewMode`가 `admin`으로 남음.

### 조치
- `GlobalNavigationBar.tsx` — `/list` 링크 `onClick` → `setViewMode('citizen')`

---

## 9. 히트맵 토글 비활성화 (P3)

### 문제
취약지구 로드 실패 시에도 히트맵 토글 가능 → 빈 지도.

### 조치
- `HeatmapToggle.tsx` — `error` / `features.length === 0` / `isLoading` 시 `disabled`

---

## 10. 병상 판정 `hvec`/`hvoc` (P3)

### 문제
`hvec=0, hvoc>0`이면 소아 병상 무시하고 「수용 불가」.

### 조치
- `bed-status.ts` — `hvec + hvoc` 합계로 판정

### 검증
- `bed-status.test.ts` — pediatric-only 케이스 추가

---

## 11. 시민 상세 패널 (P3)

### 조치
- `HospitalDetailPanel.tsx` — `CitizenHospitalTelLink` 연동
- `realtime_source` unavailable/mock 또는 `available_beds === null` 시 amber 안내 문구

---

## 12. 정적 병원 JSON 캐시 (P3)

### 조치
- `hospital_static.py` — `_cached_hospitals` 모듈 캐시 (요청마다 디스크 재파싱 방지)

---

## 13. 취약지구 degraded 플래그 (P2)

### 조치
- `vulnerability.ts` — `fetchVulnerabilityGeo()` 반환 `{ data, degraded }`
- `vulnerabilityStore.ts` — `isDegraded` 필드·배너 연동

---

## 변경 파일 목록 (전체)

### 프론트엔드
| 파일 | 변경 요약 |
|------|-----------|
| `shared/data/static-fallback-hospitals.ts` | 신규 — null 병상 폴백 |
| `shared/data/mock-hospital-data.ts` | re-export |
| `shared/store/hospitalStore.ts` | fetchId, degraded/error 계약 |
| `shared/store/vulnerabilityStore.ts` | fetchId, isDegraded |
| `shared/store/locationStore.ts` | 신규 — GPS 공유 |
| `shared/types/user-location.ts` | 신규 |
| `shared/hooks/useUserLocation.ts` | store 래퍼 |
| `shared/api/vulnerability.ts` | degraded 반환 |
| `shared/lib/bed-status.ts` | hvec+hvoc 합산 |
| `widgets/shared/DegradedDataBanner.tsx` | 신규 |
| `widgets/app/CitizenView.tsx` | 배너 |
| `widgets/app/AdminView.tsx` | 배너 |
| `widgets/landing/LandingPage.tsx` | 배너 |
| `widgets/app/GlobalNavigationBar.tsx` | /list citizen |
| `widgets/map-dashboard/HeatmapToggle.tsx` | disabled |
| `widgets/map-dashboard/HospitalDetailPanel.tsx` | tel·오프라인 |

### 백엔드
| 파일 | 변경 요약 |
|------|-----------|
| `app/services/hospital_realtime.py` | resultCode, has_any_live_beds |
| `app/services/bed_poller.py` | 캐시 보호, non-blocking |
| `app/services/hospital_static.py` | 메모리 캐시 |

### 테스트
| 파일 |
|------|
| `tests/unit/frontend/static-fallback-hospitals.test.ts` |
| `tests/unit/frontend/bed-status.test.ts` (케이스 추가) |
| `tests/unit/backend/test_hospital_realtime_helpers.py` |

---

## 아직 하지 않은 것 (선택)

> **재감사 상세:** [MAINTENANCE_AUDIT.md](./MAINTENANCE_AUDIT.md) — `fetchId` 역순 완료 버그(P1), 문서 정합성, triage 체크리스트

| 항목 | 비고 |
|------|------|
| **`fetchId` 역순 완료 버그** | P1 — 재시도 시 느린 성공 응답 폐기 가능 ([MAINTENANCE_AUDIT.md](./MAINTENANCE_AUDIT.md) §3.1) |
| 프론트 병상 주기적 재fetch | 백엔드 폴러와 주기 협의 필요 |
| `runtime-config` / `beds-cache-status` UI 연동 | 운영 디버그용 |
| `AUDIT_STATE_AND_EXCEPTIONS.md` / `README.md` 용어 동기화 | `STATIC_FALLBACK` 기준으로 정리 권장 |

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-07-07 | AUDIT 보고서 기반 14건 개선 적용 및 본 문서 작성 |

---

*다음 수정 시 위 표에 행을 추가하고, 해당 섹션에 「문제 → 조치 → 검증」을 기록하세요.*
