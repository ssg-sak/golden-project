# 📘 대구 골든타임 코드 학습·설명서 (Code Explanation)

본 문서는 프로젝트의 코드 베이스와 아키텍처 철학을 깊이 있게 이해하기 위한 종합 설명서입니다. 
AI 에이전트와 개발 팀원이 일관된 구조로 코드를 유지보수할 수 있도록 상세한 기준과 구현 원리를 제시합니다.

---

## 1. 프론트엔드 아키텍처: Feature-Sliced Design (FSD) 기반

이 프로젝트의 React 프론트엔드는 일반적인 단일 `components/` 폴더 패턴을 지양하고, 확장성과 유지보수성을 극대화하기 위해 **FSD (Feature-Sliced Design)** 구조를 차용했습니다.

### 📁 디렉토리 구조 상세 (`frontend/src/`)
- **`app/`**: 애플리케이션 진입점 및 컨텍스트
  - `main.tsx`, `App.tsx`, `AppPage.tsx`: 라우팅 로직과 최상위 컨테이너 레이아웃(3-Panel)을 결정합니다.
- **`widgets/`**: 독립적인 비즈니스 뷰 블록 
  - `map-dashboard/`: 시민/관리자 모드의 핵심 지도 컴포넌트(`CitizenMapComponent.tsx`) 및 마커 렌더링 로직.
  - `landing/`: 리스트 뷰 및 소개 페이지.
- **`shared/`**: 도메인 종속성이 없는 순수 공통 모듈
  - `store/`: Zustand 기반의 상태 관리 로직 (`hospitalStore.ts`, `appModeStore.ts`).
  - `config/`: 환경 변수 및 외부 API 키 매핑 (`kakao.ts`).
  - `data/`: 정적 오프라인 폴백 데이터 및 시뮬레이션 덤프.

### 🏗️ 뷰(View)와 상태(State)의 엄격한 분리
- **바이브코딩 및 단일 책임 원칙**: 컴포넌트 하나가 '데이터 패칭', '상태 변경', '렌더링'을 모두 담당하게 두지 않습니다.
- 데이터 로깅 및 상태 변환 로직은 `shared/store/` 내의 Zustand 스토어가 전담하며, View 컴포넌트는 오직 스토어에서 데이터를 구독(`useHospitalStore((state) => state.hospitals)`)하여 그리는 프레젠테이셔널 역할만 수행합니다.

---

## 2. 상태 관리 로직 (Zustand)

애플리케이션의 핵심 전역 상태는 가볍고 빠른 `Zustand`를 활용합니다.

### 가. `useHospitalStore` (데이터 레이어)
- **우아한 성능 저하 (Graceful Degradation)**: 백엔드 API 호출이 실패(3초 서킷 브레이커)할 경우 앱이 뻗지 않고, 내장된 오프라인 덤프(`STATIC_FALLBACK_HOSPITAL_DATA`)로 자동 스위칭됩니다.
- **시뮬레이션 모드 주입**: 포트폴리오 시연을 위해, 가짜 데이터(Mock) 통신 없이 "특정 시점의 실제 재난 스냅샷"(`DEMO_SNAPSHOT_HOSPITAL_DATA`)을 즉시 주입하는 로직을 내장했습니다.

### 나. `useAppModeStore` (뷰 레이어 제어)
- `viewMode`: 'citizen'(시민 구조망)과 'admin'(정책 모니터링) 뷰의 상태를 제어합니다.
- `isSimulationMode`: 이 값이 켜지면 `AppPage` 최상단에 붉은색 시뮬레이션 경고 배너가 나타나며 지도 데이터 소스가 오프라인 스냅샷으로 강제 전환됩니다.

---

## 3. 핵심 UI 메커니즘: 카카오맵 연동 및 3-Panel 레이아웃

### 🗺️ 카카오맵 연동 (react-kakao-maps-sdk)
- **도메인 방어막**: `VITE_KAKAO_MAP_APP_KEY`를 사용하며, 카카오 디벨로퍼스의 'Web 플랫폼 도메인' 정책에 따라 승인된 도메인(localhost, github.io)에서만 지도가 렌더링되도록 보안을 유지합니다.
- **동적 마커 시스템**: 병상의 가용 여부(`available_beds`)와 혼잡도(`emergency_msg`)에 따라 마커의 색상(초록/노랑/빨강) 및 애니메이션(Pulse)이 실시간으로 교체됩니다.

### 🎨 3-Panel 레이아웃 로직
한 화면에서 시선의 이동을 최소화하기 위해 Flexbox 기반의 3단 패널을 구성했습니다.
1. **좌측 (Sidebar)**: 병원 리스트를 ETA 또는 티어 순으로 정렬.
2. **중앙 (Canvas)**: 실시간 위치 기반의 지도 인터랙션.
3. **우측 (Detail)**: 병원 클릭 시 나타나는 오버레이 슬라이드.

---

## 4. 백엔드 연동 및 듀얼 아키텍처 (FastAPI)

본 시스템은 프론트엔드가 공공데이터(HIRA) API를 직접 찌르는 허술한 방식을 배제했습니다.
- 백엔드(FastAPI)가 주도적으로 공공 API를 폴링(Polling)하여 캐싱합니다.
- 프론트엔드는 오직 백엔드가 가공해 둔 안정된 JSON 뭉치만을 전달받아 렌더링함으로써 속도와 보안(API Key 숨김)을 동시에 확보했습니다.

## 5. 개발 룰 및 에이전트 원칙

프로젝트 루트의 `.agents/AGENTS.md`에 정의된 룰을 최우선으로 따릅니다:
1. **재사용성 (DRY)**: 새로운 UI 작성 전 기존 컴포넌트나 `shared/` 영역을 먼저 탐색합니다.
2. **검증 의무**: 패키지 설치 전 프로젝트 내 사용 사례를 먼저 분석하고, 코드 작성 후 반드시 사후 검증(Terminal)을 수행합니다.
3. **빠른 실행 (Fast Execution)**: 불필요한 리뷰 단계를 생략하고, 즉각적으로 문제를 수정·배포하여 사용자(PM)의 불편을 최소화합니다.
