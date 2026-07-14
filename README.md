# 대구 골든타임 (Daegu Golden Time)

## 개발 문서 바로가기

- [프론트엔드·백엔드 전체 파일 트리](./docs/architecture/component_file_map_20260714.md): 전체 파일 역할, Zustand, API, Service, View를 찾는 안내서
- [예외 처리 학습서](./docs/guides/exception_handling_study_20260714.md): 성공·부분 실패·폴백을 구분하는 기준과 이번 수정 사례
- [예외 처리 개선 보고서](./docs/reports/exception_handling_improvement_report_20260714.md): 수정 범위와 검증 결과
- [AI 모델 EDA 계획](./docs/plans/ai_model_eda_plan_20260713.md): AI 분석 데이터 탐색 및 검증 계획

### 프런트엔드 상태·컴포넌트 구조

```text
AppPage
├─ CitizenView ─────────────── useHospitalStore, useOptimalLocationsStore
│  ├─ MapComponent ────────── useMapComponentController
│  │  ├─ VulnerabilityLayer ─ useVulnerabilityStore
│  │  └─ OptimalLocationMarkers ─ useOptimalLocationsStore
│  ├─ DesktopSidebar ──────── useEtaController
│  └─ MobileBottomSheet ───── useEtaController
└─ AdminView
   └─ useAdminController
      ├─ useHospitalStore
      ├─ useVulnerabilityStore
      ├─ useDashboardSummaryStore
      └─ useOptimalLocationsStore

AppDataBootstrap
├─ useHospitalStore.fetchHospitals()
└─ useVulnerabilityStore.fetchVulnerability()
```

전체 파일 트리와 Store별 상태·액션·구독 컴포넌트는 [프론트엔드·백엔드 전체 파일 트리](./docs/architecture/component_file_map_20260714.md)에서 확인할 수 있습니다.

> **"응급 상황의 병원 탐색을 보조하고, 데이터로 지역 의료자원 배분 우선순위를 진단합니다."**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) 
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Zustand](https://img.shields.io/badge/Zustand-764ABC?style=flat&logo=react&logoColor=white)](https://github.com/pmndrs/zustand)
[![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)

**대구 골든타임**은 시민의 응급 병원 탐색을 보조하고 권역응급센터 쏠림을 줄이는 선택지를 제시하며, 행정·정책 관리자에게는 의료 사각지대와 자원배분 우선순위를 보여주는 **투트랙(Two-Track) 응급의료 거버넌스 프로토타입**입니다.

> 본 서비스는 119·1339를 대체하지 않습니다. 응급 상황에서는 반드시 119 또는 1339로 연락하세요. 의료 정보는 공공 API 응답 시점 기준이며 병원의 실제 상황과 다를 수 있으므로 이동 전에 확인이 필요합니다.

📚 **문서 및 포트폴리오 스토리는 [docs/](docs/) 폴더를 참조하세요.**
- [프로젝트 초기 기획 및 행정학적 배경 (Project Story)](./docs/reports/PROJECT_STORY_AND_BACKGROUND.md)
- [코드 학습·설명서 (Code Explanation)](./CODE_EXPLANATION.md)
- [기획서 전체 보기](./기획서.html)

---

## 🎯 핵심 타겟과 듀얼 뷰 (Dual-View) 아키텍처

이 플랫폼은 **하나의 웹 앱 안에서 두 명의 완전히 다른 타겟을 위한 뷰(View)를 제공**합니다. 상단의 탭(Tab) 전환을 통해 모드가 완전히 분리됩니다.

### 🚑 탭 A. 시민 (응급 상황) 모드
- **목적:** "현재 공개된 병상 현황과 거리를 함께 보고 어느 병원에 먼저 연락할 것인가?"
- **주요 기능:**
  - **카카오내비 실시간 길안내 연동 (URL Scheme):** 응급 상황에서 지체 없이 병원으로 출발할 수 있도록, 클릭 한 번으로 카카오내비 앱을 호출하여 실제 도로 교통 상황이 반영된 경로를 안내합니다.
  - **가용 병상 시각적 필터링:** 수용 불가(0) 병원은 붉게 표시되거나 밀려나 구급대원과 시민의 헛걸음을 방지합니다.
  - **Nudge (넛지) 기반 분산 유도:** 병원 등급에 따라 마커 크기를 달리하여, 경증 환자가 권역응급센터로 쏠리는 현상을 자연스럽게 방지합니다.

### 📊 탭 B. 정책 관리자 (관제) 모드
- **목적:** "대구 지역의 권역별 응급 인프라는 탄탄한가? 의료 공백(사각지대)은 어디인가?"
- **주요 기능:**
  - **의료 인프라(전문의/장비) 팩트 관제:** 심평원(HIRA) 데이터를 바탕으로 각 병원의 CT/MRI 등 의료자원 현황을 즉각 표출합니다.
  - **AI 기반 사각지대 지수(VDI) 분석:** K-Means 클러스터링 공간 분석을 통해 수요처 대비 병원이 먼 고립 구역의 최적 입지(Centroid)를 도출하고 히트맵으로 시각화합니다.

---

## 🏗️ 화면 구조 및 프론트엔드 아키텍처 (FSD)

### 3-Panel Layout
한 화면에서 시선의 분산을 막고 정보의 밀도를 높이기 위해 3-Panel 구조를 사용합니다.
1. **좌측 (Sidebar):** 시민/관리자 탭 전환 및 병원 리스트(ETA 순/티어 순 정렬)
2. **중앙 (Canvas):** 카카오맵 API 기반 실시간 인터랙티브 지도
3. **우측 (Detail):** 마커 클릭 시 나타나는 상세 정보 슬라이드 패널

### Feature-Sliced Design (FSD)
상태와 뷰의 엄격한 분리를 위해 FSD 구조를 차용했습니다. 데이터 패칭과 상태 변경은 `shared/store/`(Zustand)가 전담하며, View 영역(`widgets/`)은 데이터를 구독하여 렌더링에만 집중합니다. (세부 아키텍처는 [CODE_EXPLANATION.md](./CODE_EXPLANATION.md) 참고)

---

## 🛠️ 기술 스택

이 프로젝트는 다음과 같은 기술로 구현되어 있습니다.

### 💻 프론트엔드
- **리액트(React) & 타입스크립트(TypeScript)** (화면 및 로직 구현)
- **주스탠드(Zustand)** (전역 상태 관리)
- **테일윈드 CSS(Tailwind CSS)** (스타일링)
- **카카오맵 SDK(react-kakao-maps-sdk)** (지도 정보 시각화)

### ⚙️ 백엔드
- **패스트API(FastAPI)** (API 서버 구축)
- **SQLite & SQL알케미(SQLAlchemy)** (캐시 데이터베이스 및 데이터 관리)
- **AP스케줄러(APScheduler)** (실시간 병상 정보 주기적 백그라운드 수집)

### 📊 데이터 분석
- **판다스(Pandas) & 지오판다스(GeoPandas)** (병원 자원 전처리 및 지리 공간 분석)
- **사이킷런(Scikit-learn)** (K-Means 군집화 알고리즘 기반 의료 사각지대 입지 분석)

---

## 🛡️ 데이터 철학과 시스템 안정성 (System Reliability)

서버 과부하를 방지하고 무중단(Zero-Downtime) 렌더링을 보장하기 위한 강력한 방어 기제를 탑재했습니다.

- **백그라운드 비동기 캐시 폴링 (Graceful Degradation):** 사용자가 새로고침할 때마다 공공 API를 호출하지 않습니다. 백엔드에서 1~2분 주기로 데이터를 폴링하여 메모리에 캐싱하므로, 동시 접속자가 증가해도 끄떡없습니다.
- **3초 서킷 브레이커:** 외부 API 응답이 3초를 초과하면 로컬 캐시 또는 안전한 폴백 화면("실시간 확인 중")을 띄워 시스템 셧다운을 방지합니다.
- **시뮬레이션 스냅샷 모드:** 서버 없는 오프라인 시연을 위해 실제 공공데이터 캡처본(Snapshot)을 내장, 데이터 조작 없이 화려한 기능 동작을 보여줍니다.

---

## 🚀 빠른 시작 (Quick Start)

본 프로젝트는 Node.js 20+ 및 Python 3.11+ 환경을 권장합니다.

### 1. 환경 변수 설정
`frontend/.env` 및 프로젝트 루트 `.env` 파일에 API 키를 기입하세요.
- `VITE_KAKAO_MAP_APP_KEY`: 카카오맵 JavaScript API 키
- `DATA_GO_KR_API_KEY`: 국립중앙의료원 API 키

### 2. 서버 실행

```bash
# [터미널 1] 백엔드 (FastAPI) 실행
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# [터미널 2] 프론트엔드 (Vite/React) 실행
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:5173/` 로 접속하면 듀얼 뷰 대시보드가 구동됩니다.

현재는 로컬 개발 환경에서 국립중앙의료원/HIRA 실데이터 통신과 안정성을 검증하는 프로토타입 단계이며, 퍼블릭 클라우드 서비스로 운영 중인 상태가 아닙니다.

---

## 💼 포트폴리오 핵심 요약

> 시민에게는 공개 병상 현황과 길찾기를 제공하고, 정책 관리자에게는 AI 공간 분석 기반 의료 사각지대와 자원배분 우선순위를 제시하는 **대구 골든타임 — 투트랙 응급의료 의사결정 보조 프로토타입**
