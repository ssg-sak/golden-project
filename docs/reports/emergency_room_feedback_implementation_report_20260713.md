# 응급실 현황·추천·길찾기 피드백 반영 보고서

- 작업일: 2026-07-13
- 결과: 코드·단위 테스트·GitHub Pages 데모 빌드 반영 완료

## 1. 반영 결과

### 상태 표시

- 기존 `원활·보통·혼잡` 중 `보통`을 `지연`으로 변경했다.
- 원활은 초록, 지연은 노랑, 혼잡 및 여유 없음은 빨강을 유지했다.
- 목록, 상세 배지, 세부 병상, 지도 마커 접근성 문구를 함께 변경했다.

### 병원 추천

- 공용 추천 비교 모듈을 추가했다.
- 병상 상태를 최우선으로 하고 같은 상태에서 ETA, 직선거리 순으로 비교한다.
- 데스크톱 사이드바, 모바일 시민 목록, 모바일 바텀시트, 지도 없는 응급실 목록에 동일하게 적용했다.
- 첫 번째 병원에 `병상 여유 우선 추천` 배지와 선정 근거를 표시했다.
- 실제 수용 여부는 출발 전에 확인하도록 안내했다.

### 길찾기 안전 안내

- 카카오 길찾기가 일반 차량 경로임을 링크의 접근성 이름과 도움말에 명시했다.
- 시민 병원 목록에 긴급 이송 병원과 경로는 119 및 의료기관의 수용 확인을 따르라는 안내를 추가했다.
- 역주행·신호 특례 경로는 공개 지도 API로 안전하게 제공할 수 없어 구현하지 않았다.

## 2. 변경 구조

- 상태 판정: `frontend/src/shared/lib/bed-status.ts`
- 추천 정책: `frontend/src/shared/lib/hospital-recommendation.ts`
- 거리 계산과 필터 결합: `frontend/src/shared/hooks/useSortedHospitalsByDistance.ts`
- 화면 표현: `frontend/src/widgets/landing`, `frontend/src/widgets/map-dashboard`, `frontend/src/widgets/app`
- 회귀 테스트: `tests/unit/frontend/hospital-recommendation.test.ts`

추천 정책을 Presentational 컴포넌트에서 분리해 화면은 결과와 근거만 표시하도록 유지했다.

## 3. 검증 결과

| 검증 | 결과 |
|---|---|
| `npm.cmd test -- --run` | 성공: 4개 파일, 14개 테스트 통과 |
| `npm.cmd run typecheck` | 성공 |
| `npm.cmd run lint` | 성공 |
| `npm.cmd run build:demo` | 성공: Vite 데모 빌드 생성 |
| 실제 브라우저 자동 점검 | 미실행: 현재 실행 환경에 제어 가능한 브라우저가 제공되지 않음 |

첫 테스트 실행은 샌드박스가 Vitest 설정 경로 탐색을 차단해 실패했다. 승인된 동일 명령을 샌드박스 밖에서 다시 실행해 전체 성공을 확인했다. 브라우저 검증은 다른 도구로 우회하지 않았으며, 배포 전 실제 모바일·데스크톱 화면 확인이 남아 있다.

## 4. GitHub Pages 동작

`build:demo`가 성공했으므로 정적 배포 산출물 생성은 가능하다. ETA 백엔드가 연결되지 않은 경우에도 병상 상태와 직선거리로 추천한다. FastAPI와 `VITE_API_BASE_URL`이 연결된 환경에서는 같은 병상 상태 안에서 Kakao 일반 차량 ETA를 보조 정렬 기준으로 사용한다.

## 5. 남은 운영 확인

1. 공개 GitHub Pages URL에서 위치 권한 허용·거부 흐름을 확인한다.
2. 모바일과 데스크톱에서 추천 배지, 긴 병원명, 안내 문구 줄바꿈을 확인한다.
3. 실제 병상 API 데이터에서 `total_hvec` 누락 비율을 확인한다.
4. “지연”이 실제 대기시간 측정값으로 오해되지 않는지 사용자 테스트한다.
5. 긴급차량 경로는 공식 119·기관 연계 전까지 기능 범위에서 제외한다.

## 6. 2026-07-13 로컬 서버 재확인

- FastAPI: `http://127.0.0.1:8000` 기동 및 응답 확인
- 런타임 설정: HTTP 200, API 키 있음, 실데이터 모드 확인
- 병원 API: `/api/hospitals` HTTP 200 및 병상 데이터 반환 확인
- Vite: `http://localhost:5173` 기동 및 HTTP 200 확인
- 프런트엔드는 `localhost`에 바인딩되어 `127.0.0.1:5173` 요청은 실패하고 `localhost:5173` 요청은 성공했다.
- 백엔드 로그에서 여러 병원의 HIRA 장비 조회 `HTTPStatusError`가 확인됐다. 병상 API 응답과 이번 추천 기능은 동작하지만 장비 상세는 외부 API 폴백 또는 누락 상태일 수 있다.
- `/api/dashboard/data-status`는 빈 `sources`와 `latestSnapshotAt: 2026-07-12T12:52:26`을 반환했다. 데이터 상태 출처 표시 완전성은 별도 점검이 필요하다.
- 현재 환경에 제어 가능한 브라우저가 없어 DOM과 화면 캡처 자동 검증은 여전히 수행하지 못했다.

피드백에서 제품 판단으로 이어진 과정은 `docs/reports/friend_feedback_product_narrative_20260713.md`에 포트폴리오용 서사로 정리했다.
