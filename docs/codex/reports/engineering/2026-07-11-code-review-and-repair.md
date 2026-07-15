# 코드 점검 및 안전 수리 보고서

## 2026-07-13 에이전트 원칙 및 문법 재점검 후속 수리

### 점검 결과

- 프론트 TypeScript 타입 검사 통과
- 프론트 단위 테스트 10건 통과
- 백엔드 테스트 20건 통과
- Python `compileall` 통과
- ESLint 최초 경고 2건 확인, 수정 후 경고·오류 0건
- 프로덕션 빌드 통과
- Playwright E2E 2건 추가 및 통과

### 구조 수리

1. `HospitalMarkersLayer`를 `MapComponent`의 실제 렌더링 경로에 연결하고 중복 마커·선택 핀·선택 이동 코드를 제거했다.
2. 선택 병원 이동 Hook의 의존성을 이름·위도·경도로 명시해 `react-hooks/exhaustive-deps` 경고를 제거했다.
3. 시민·정책 상세 화면의 의료 인프라 분기를 `HospitalInfrastructureSection`으로 통합했다.
4. Playwright 설정에 로컬 개발 서버와 기준 URL을 추가하고 핵심 연기 테스트 2건을 작성했다.
5. `/`, `/list`, `/about`, 정책 화면과 소개 화면을 지연 로딩해 초기 번들을 분할했다.

### 성능 결과

변경 전 주 JavaScript 묶음은 약 548kB였고 Vite의 500kB 경고가 발생했다. 변경 후 가장 큰 JavaScript 묶음은 약 236kB이며, 앱 본체·정책 화면·소개 화면·목록 화면이 별도 묶음으로 생성됐다.

### 남은 범위

이번 수리는 확인된 프론트 경고·중복·E2E 공백·번들 경고를 대상으로 했다. 백엔드의 광범위한 `except Exception`은 폴링과 폴백 경계에서 의도적으로 사용된 곳이 섞여 있으므로, 별도 장애 처리 감사 없이 일괄 변경하지 않았다.

- 작성일: 2026-07-11
- 대상: 대구 골든타임 프로젝트
- 범위: 로컬 개발 환경 및 GitHub Pages 배포 환경 점검

## 문제점 해결 체크리스트

### 해결 완료

- [x] **GitHub Pages 최적 입지 JSON 경로 오류**
  - 문제: `/data/...` 절대 경로가 GitHub Pages의 `/golden-project/` 기본 경로를 무시했다.
  - 해결: `import.meta.env.BASE_URL`을 사용하도록 수정했다.
  - 반영: 커밋 `de04f03`, `origin/main` 푸시 완료.

- [x] **senior 최적 입지 공개 데이터 누락**
  - 문제: 코드가 요청하는 `optimal_locations_senior.json`이 공개 데이터 폴더에 없었다.
  - 해결: 기존 분석 결과를 `frontend/public/data`에 추가했다.
  - 반영: 커밋 `de04f03`, `origin/main` 푸시 완료.

- [x] **pediatric 최적 입지 공개 데이터 누락**
  - 문제: 코드가 요청하는 `optimal_locations_pediatric.json`이 공개 데이터 폴더에 없었다.
  - 해결: 기존 분석 결과를 `frontend/public/data`에 추가했다.
  - 반영: 커밋 `de04f03`, `origin/main` 푸시 완료.

- [x] **HIRA 비동기 테스트의 pytest 수집 실패**
  - 문제: pytest가 비동기 함수를 플러그인 없이 직접 수집해 실패했다.
  - 해결: 동기 pytest 래퍼가 비동기 탐색 함수를 실행하도록 수정했다.
  - 검증: pytest `1 passed`.
  - 반영: 커밋 `de04f03`, `origin/main` 푸시 완료.

### 미해결·보류

- [ ] **ETA API 응답 순서 비보존 가능성**
  - 현황: 캐시 결과와 신규 결과가 합쳐질 때 요청 순서가 달라질 수 있다.
  - 보류 이유: 현재 프런트는 병원 이름으로 ETA를 연결해 UI 오연결은 발생하지 않는다.

- [ ] **미사용 최적 입지 API 모듈의 localhost 고정 주소**
  - 현황: `frontend/src/data/api/optimal-locations.ts`에 localhost 주소가 남아 있다.
  - 보류 이유: 현재 어디에서도 import하거나 호출하지 않는 미사용 코드다.

- [ ] **`.env`가 프로세스 환경변수보다 우선하는 구조**
  - 현황: 로컬 또는 별도 FastAPI 배포 환경에서 주입된 환경변수가 무시될 수 있다.
  - 보류 이유: GitHub Pages와 무관하고 로컬 백엔드 동작을 바꿀 수 있어 이번 범위에서 제외했다.

- [ ] **사용자 작업 파일의 trailing whitespace 2곳**
  - 대상: `useMapComponentController.ts`.
  - 보류 이유: 기존 사용자 작업을 보호하기 위해 수정하지 않았다.

### 해결 후 배포 검증 대기

- [ ] GitHub Actions `Deploy to GitHub Pages` 성공 확인
- [ ] 배포 페이지에서 senior 최적 입지 표시 확인
- [ ] 배포 페이지에서 pediatric 최적 입지 표시 확인
- [ ] 두 JSON 요청의 HTTP 200 응답 확인
- [ ] 기존 화면과 병원 데모 데이터에 회귀가 없는지 확인

### 반영 안전성 확인

- [x] 수리 파일 4개만 커밋 및 푸시
- [x] `.env`, API 키, 비밀 설정 파일 제외
- [x] 로컬 보고서 제외
- [x] 기존 사용자 작업 파일 2개 제외
- [x] ESLint 및 TypeScript 타입 검사 통과

> 이 보고서는 로컬 기록용이다. GitHub에 추가하지 않으며 `git add -f`를 사용하지 않는다.

## 1. 점검 원칙

로컬 서버와 GitHub Pages 배포 환경을 별개로 구분해 점검했다.

- 로컬 환경은 Vite 개발 서버와 FastAPI 백엔드(`localhost:8000`)를 함께 사용한다.
- GitHub Pages는 정적 프런트엔드 데모를 배포하며 FastAPI 백엔드를 실행하지 않는다.
- GitHub Actions는 `npm run build:demo`를 실행하고 `.env.demo`의 시뮬레이션 모드를 사용한다.
- 로컬에서 동작하는 `localhost` API 호출을 GitHub Pages에서도 사용할 수 있다고 가정하지 않았다.

## 2. 재점검 결과

### 문제점 요약

| 우선순위 | 문제점 | 영향 범위 | 처리 상태 |
|---|---|---|---|
| 높음 | GitHub Pages에서 최적 입지 JSON 경로가 저장소 기본 경로를 무시함 | GitHub Pages | 수정 완료 |
| 높음 | senior/pediatric 최적 입지 공개 JSON 파일 누락 | 로컬 및 GitHub Pages | 파일 추가 완료 |
| 중간 | 비동기 HIRA 탐색 함수를 pytest가 직접 수집해 실패 | 로컬 테스트 | 수정 완료 |
| 낮음 | ETA API가 캐시 여부에 따라 요청 순서를 보존하지 않을 수 있음 | 로컬 FastAPI | 현 UI 영향이 없어 보류 |
| 낮음 | 미사용 최적 입지 API 모듈에 localhost 주소가 고정됨 | 현재 실행 경로 영향 없음 | 미사용 코드이므로 보류 |
| 환경 한정 | `.env` 값이 프로세스 환경변수보다 우선함 | 로컬 또는 별도 백엔드 배포 | 동작 변경 위험으로 보류 |
| 품질 | 사용자 작업 파일에 trailing whitespace 2곳 존재 | 소스 품질 | 사용자 작업 보호를 위해 보류 |

이번 수리에서는 실제 GitHub Pages 기능 실패와 pytest 실패만 해결했다. UI 동작 변경 가능성이 있거나 현재 실행 경로에 영향이 없는 항목은 임의로 수정하지 않았다.

### GitHub Pages 최적 입지 데이터 경로

최적 입지 데이터 로더가 `/data/...` 절대 경로를 사용하고 있었다. 프로젝트는 GitHub Pages의 `/golden-project/` 하위 경로에 배포되므로 기존 경로는 저장소 기본 경로를 무시한다.

또한 코드가 요청하는 다음 파일이 `frontend/public/data`에 존재하지 않았다.

- `optimal_locations_senior.json`
- `optimal_locations_pediatric.json`

이 상태에서는 senior 또는 pediatric 최적 입지 데이터를 불러올 때 404 응답이 발생할 수 있었다.

### 병원 데이터의 localhost 호출

GitHub Pages 데모 빌드에서는 `VITE_IS_SIMULATION_MODE=true`가 적용된다. 병원 목록은 번들된 데모 스냅샷을 사용하므로 GitHub Pages의 병원 기능을 `localhost:8000` 문제로 판단한 최초 분석은 철회했다.

### 미사용 최적 입지 API 모듈

`frontend/src/data/api/optimal-locations.ts`에는 localhost 주소가 있지만 현재 코드에서 import하거나 호출하지 않는다. 현재 배포 장애 원인은 아니며, 이번 안전 수리 범위에서는 삭제하거나 변경하지 않았다.

### ETA API 응답 순서

백엔드는 캐시 결과와 신규 조회 결과를 합칠 때 요청 순서를 보존하지 않을 수 있다. 현재 프런트엔드는 배열 인덱스가 아닌 병원 이름으로 ETA를 연결하므로 현 UI에서 잘못된 병원에 ETA가 연결되지는 않는다. 이번 수리에서는 동작 변경 위험을 피하기 위해 수정하지 않았다.

### 백엔드 테스트

`backend/test_hira_api.py`의 비동기 테스트 함수가 pytest 플러그인 없이 직접 수집되어 실패했다. 외부 API 탐색 동작은 유지하면서 동기 pytest 래퍼가 비동기 탐색 함수를 실행하도록 수정했다.

## 3. 적용한 수정

### 정적 데이터 경로 수정

`frontend/src/widgets/map-dashboard/lib/useOptimalLocationsStore.ts`에서 Vite의 `import.meta.env.BASE_URL`을 사용하도록 변경했다.

이에 따라 환경별 요청 경로는 다음처럼 분리된다.

- 로컬 개발: `/golden-project/data/...` 또는 Vite가 설정한 기본 경로
- GitHub Pages: `/golden-project/data/...`

### 공개 데이터 추가

기존 `data/processed` 분석 결과를 변경하지 않고 동일한 내용의 공개용 파일을 추가했다.

- `frontend/public/data/optimal_locations_senior.json`
- `frontend/public/data/optimal_locations_pediatric.json`

두 파일에는 위치 좌표와 수요 지표만 포함되어 있으며 API 키, 환경변수, 사용자 정보는 포함되지 않는다.

### pytest 수집 문제 수정

`backend/test_hira_api.py`에 동기 테스트 래퍼를 추가했다. 직접 스크립트로 실행하는 기존 진입점도 유지했다.

## 4. 검증 결과

| 검사 | 결과 |
|---|---|
| ESLint | 통과 |
| TypeScript 타입 검사 | 통과 |
| pytest | 1개 통과 |
| `.env` Git 추적 여부 | 추적되지 않음 (`.gitignore` 적용) |
| API 키 포함 파일 추가 | 없음 |
| 커밋·스테이징·푸시 | 지정한 수리 파일 4개만 `de04f03`으로 완료 |
| UI·레이아웃 변경 | 없음 |

## 5. 변경 안전성

- 기존 사용자가 수정 중이던 `MapComponent.tsx`와 `useMapComponentController.ts`는 변경하지 않았다.
- `.env`와 로컬 API 키는 읽거나 출력하거나 Git 추적 대상으로 추가하지 않았다.
- 빌드 산출물과 루트 `assets` 파일을 수정하지 않았다.
- 지정한 수리 파일 4개만 커밋하고 `origin/main`에 푸시했다.
- 보고서와 기존 사용자 작업 파일 2개는 커밋 및 푸시하지 않았다.
- 화면 디자인과 컴포넌트 구조는 변경하지 않았다.

## 6. 현재 변경 파일 구분

이번 수리에서 변경하거나 추가한 파일:

- `backend/test_hira_api.py`
- `frontend/src/widgets/map-dashboard/lib/useOptimalLocationsStore.ts`
- `frontend/public/data/optimal_locations_senior.json`
- `frontend/public/data/optimal_locations_pediatric.json`
- `docs/reports/2026-07-11-code-review-and-repair.md`

기존 사용자 작업 파일:

- `frontend/src/widgets/map-dashboard/MapComponent.tsx`
- `frontend/src/widgets/map-dashboard/useMapComponentController.ts`

위 수리 파일 4개는 원격 저장소에 반영됐으며, 기존 사용자 작업 파일 2개는 로컬에만 남아 있다.

## 7. 커밋 및 푸시 필요 사항

수리 내용은 커밋 `de04f03`으로 `origin/main`에 반영됐다. 아래 절차는 향후 같은 유형의 변경을 안전하게 반영할 때 참고하기 위한 기록이다.

### 커밋 전 주의사항

- `.env`는 절대 스테이징하거나 커밋하지 않는다.
- 기존 사용자 작업 파일 두 개는 이번 수리와 별개이므로 함께 커밋할지 먼저 결정한다.
- `git add .` 또는 `git add -A`는 사용하지 않고 수리 파일을 명시적으로 선택한다.
- 공개 JSON 두 파일에는 좌표와 수요 값만 있으며 API 키나 사용자 정보는 없다.
- 푸시하면 `main` 브랜치용 GitHub Actions가 GitHub Pages 배포를 시작할 수 있다.

### 이번 수리 파일만 스테이징하는 명령

```powershell
git add -- backend/test_hira_api.py
git add -- frontend/src/widgets/map-dashboard/lib/useOptimalLocationsStore.ts
git add -- frontend/public/data/optimal_locations_senior.json
git add -- frontend/public/data/optimal_locations_pediatric.json
```

스테이징 결과는 반드시 다음 명령으로 확인한다.

```powershell
git status --short
git diff --cached --check
git diff --cached
```

`.env` 또는 의도하지 않은 파일이 보이면 커밋하지 말고 스테이징 상태부터 해제해야 한다.

### 보고서의 Git 포함 여부

현재 `.gitignore`는 `docs/**`를 제외하고 있어 이 보고서는 일반 `git add`로 커밋되지 않는다. 이 보고서는 로컬 전용이므로 예외 규칙을 추가하거나 `git add -f`로 강제 추가하지 않는다.

### 커밋 및 푸시 예시

```powershell
git commit -m "fix: GitHub Pages 최적 입지 데이터 로딩 수정"
git push origin main
```

현재 체크아웃된 브랜치가 `main`이 아니라면 해당 브랜치 이름으로 푸시하고, 필요하면 검토 후 `main`으로 병합해야 한다. 푸시 전 `git branch --show-current`와 `git remote -v`로 대상 브랜치와 원격 저장소를 확인한다.

### 푸시 후 확인 사항

- GitHub Actions의 `Deploy to GitHub Pages` 작업 성공 여부
- 배포 페이지의 senior/pediatric 최적 입지 데이터 로딩 여부
- 브라우저 개발자 도구에서 `/golden-project/data/optimal_locations_*.json` 요청이 200으로 응답하는지
- 병원 데모 스냅샷과 기존 화면 레이아웃이 변경되지 않았는지
