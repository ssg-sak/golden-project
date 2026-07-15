# 프론트엔드·백엔드 전체 파일 트리

이 문서는 "어느 기능을 고치려면 어떤 파일을 보면 되는지" 빠르게 찾기 위한 지도다.  
주석은 실제 코드의 책임 기준으로 붙였고, 캐시·빌드 산출물·`node_modules`·`__pycache__`는 제외했다.

## 1. 프론트엔드 전체 트리

```text
frontend/
├─ package.json                         # 프론트 의존성, npm scripts, 테스트/빌드 명령 정의
├─ package-lock.json                    # npm 의존성 잠금 파일
├─ index.html                           # Vite 앱의 HTML 진입점
├─ vite.config.ts                       # Vite 설정, React 플러그인과 dev/build 설정
├─ vitest.config.ts                     # Vitest 단위 테스트 설정
├─ playwright.config.ts                 # Playwright E2E 테스트 설정
├─ eslint.config.js                     # ESLint 규칙 설정
├─ tsconfig.json                        # TypeScript 루트 설정
├─ tsconfig.app.json                    # 앱 코드용 TypeScript 설정
├─ tsconfig.node.json                   # Node/Vite 설정 파일용 TypeScript 설정
├─ public/
│  ├─ favicon.svg                       # 브라우저 파비콘
│  ├─ golden_governance_clusters.png    # 랜딩/정책 설명용 클러스터 이미지
│  └─ data/
│     ├─ optimal_locations.json         # 기본 최적 입지 정적 데이터
│     ├─ optimal_locations_pediatric.json          # 소아 모드 최적 입지 데이터
│     ├─ optimal_locations_pediatric_BASELINE.json # 소아 기준선 데이터
│     ├─ optimal_locations_senior.json             # 고령 모드 최적 입지 데이터
│     ├─ optimal_locations_senior_BASELINE.json    # 고령 기준선 데이터
│     ├─ policy_monitoring_report.csv   # 정책 모니터링 정적 CSV
│     ├─ priority_targets.json          # 우선 대응 후보 지역 데이터
│     ├─ resource_recommendations.json  # 자원 배분 추천 정적 데이터
│     ├─ 사회과학_분석_보고서.pdf       # 공개 보고서 PDF
│     └─ reports/
│        ├─ daegu-golden-time-policy-analysis-report.pdf # 정책 분석 PDF
│        └─ 2026-07-11-policy-tab-cache-env-resolution.md # 정책 탭 캐시 이슈 공개 문서
├─ tests/
│  └─ e2e/
│     └─ app-smoke.spec.ts              # 앱이 기본 렌더링되는지 확인하는 E2E 스모크 테스트
└─ src/
   ├─ main.tsx                          # React 앱 마운트 진입점
   ├─ index.css                         # 전역 CSS, 레이아웃/디자인 토큰성 스타일
   ├─ app/
   │  ├─ App.tsx                        # Router와 전역 부트스트랩을 감싸는 앱 루트
   │  └─ AppPage.tsx                    # 현재 모드에 따라 랜딩/시민/관리자 화면 선택
   ├─ assets/
   │  ├─ daegu-dong.geojson             # 대구 행정동 경계 원본/번들 데이터
   │  ├─ daegu_er_hospitals.json        # 응급실 병원 정적 원본 데이터
   │  ├─ daegu_vulnerability.geojson    # 취약지 지표 번들 GeoJSON
   │  ├─ final_hospitals.json           # 최종 병원 번들 데이터
   │  └─ mock_hospitals.json            # 개발/데모용 병원 목 데이터
   ├─ data/
   │  ├─ daegu_vulnerability.geojson    # 취약지 GeoJSON 런타임 데이터
   │  ├─ final_hospitals.json           # 병원 런타임 데이터
   │  └─ api/
   │     ├─ geo.ts                      # 좌표/지오코딩 관련 API 호출
   │     ├─ hospitals.ts                # 병원 API 호출, 응답 검증, 정규화 진입점
   │     ├─ optimal-locations.ts        # 백엔드 최적 입지 API 호출
   │     └─ vulnerability.ts            # 취약지 API 호출과 정적 fallback 처리
   ├─ shared/
   │  ├─ components/
   │  │  ├─ AppDataBootstrap.tsx        # 앱 시작 시 병원/취약지 데이터를 Zustand로 로드
   │  │  └─ BaseMap.tsx                 # Kakao Map 공통 래퍼 컴포넌트
   │  ├─ config/
   │  │  ├─ api.ts                      # 백엔드 API base URL과 엔드포인트 설정
   │  │  ├─ env.ts                      # Vite 환경변수 접근/검증
   │  │  └─ kakao.ts                    # Kakao Maps/Navi 키와 설정
   │  ├─ constants/
   │  │  ├─ circuit-breaker.ts          # 외부 API 장애 제어용 상수
   │  │  ├─ daegu.ts                    # 대구 지역 좌표/행정 구역 상수
   │  │  ├─ dashboard-layout.ts         # 대시보드 레이아웃 수치 상수
   │  │  ├─ loading-messages.ts         # 로딩 문구 목록
   │  │  └─ map.ts                      # 지도 중심점, 줌, bounds 등 지도 상수
   │  ├─ data/
   │  │  ├─ hospital-er-tel.ts          # 병원 응급실 전화번호 보정 테이블
   │  │  ├─ mock-hospital-data.ts       # 개발/데모용 병원 목 데이터 변환
   │  │  └─ static-fallback-hospitals.ts # API 실패 시 사용할 정적 병원 fallback
   │  ├─ hooks/
   │  │  ├─ useSortedHospitalsByDistance.ts # 사용자 위치 기준 병원 정렬 훅
   │  │  └─ useUserLocation.ts          # 브라우저 geolocation과 위치 store 연결
   │  ├─ lib/
   │  │  ├─ bed-status.ts               # 병상 상태 계산과 표시 등급 로직
   │  │  ├─ canonical-hospitals.ts      # 병원명/좌표 정규화 기준 데이터
   │  │  ├─ daegu-bounds.ts             # 대구 영역 포함 여부 계산
   │  │  ├─ distance.ts                 # 거리 계산 유틸
   │  │  ├─ error-message.ts            # unknown error를 사용자 메시지로 변환
   │  │  ├─ fetch-with-timeout.ts       # timeout 포함 fetch 래퍼
   │  │  ├─ hospital-recommendation.ts  # 시민용 병원 추천/정렬 보조 로직
   │  │  ├─ hospital-tel.ts             # 병원 전화번호 표시/보정 유틸
   │  │  ├─ hospital-tier-visual.ts     # 병원 등급별 색상/마커 표시 규칙
   │  │  ├─ kakao-navigation.ts         # Kakao Navi URL scheme 생성
   │  │  └─ nearest-hospital.ts         # 가장 가까운 병원 계산
   │  ├─ store/
   │  │  ├─ appModeStore.ts             # 시민/관리자/소개 화면 모드와 시뮬레이션 모드 Zustand
   │  │  ├─ dashboardSummaryStore.ts    # 관리자 정책 요약 API 상태 Zustand
   │  │  ├─ hospitalStore.ts            # 병원 목록, 로딩, 오류, degraded/fallback 상태 Zustand
   │  │  ├─ locationStore.ts            # 사용자 위치, 위치 권한 오류, fallback 위치 Zustand
   │  │  └─ vulnerabilityStore.ts       # 취약지 데이터, 히트맵 표시 여부, degraded 상태 Zustand
   │  └─ types/
   │     ├─ geojson.ts                  # GeoJSON 타입
   │     ├─ hospital.ts                 # 병원 도메인 타입
   │     ├─ medical.ts                  # 의료 자원/병상 관련 타입
   │     ├─ user-location.ts            # 사용자 위치 타입
   │     └─ vulnerability.ts            # 취약지 지표 타입
   ├─ types/
   │  └─ kakao-maps.d.ts                # Kakao Maps 전역 타입 선언
   └─ widgets/
      ├─ app/
      │  ├─ AboutModal.tsx              # 서비스 소개 모달
      │  ├─ AdminHospitalSidebar.tsx    # 관리자 병원 목록/상세 사이드바
      │  ├─ AdminMobileBottomSheet.tsx  # 관리자 모바일 하단 패널
      │  ├─ AdminView.tsx               # 관리자 화면 Container
      │  ├─ CitizenView.tsx             # 시민 화면 Container
      │  ├─ GlobalNavigationBar.tsx     # 전역 상단 내비게이션, 모드 전환
      │  ├─ MobileCitizenHospitalBrowser.tsx # 시민 모바일 병원 탐색 UI
      │  ├─ PlatformIntroView.tsx       # 플랫폼 소개 화면
      │  ├─ PolicyStatusBanner.tsx      # 정책/데이터 상태 배너
      │  └─ useAdminController.ts       # 관리자 화면의 여러 store를 합치는 Controller
      ├─ landing/
      │  ├─ BedStatusBadge.tsx          # 랜딩 병원 카드의 병상 상태 뱃지
      │  ├─ HospitalListItem.tsx        # 랜딩 병원 목록 아이템
      │  ├─ KakaoNavButton.tsx          # Kakao Navi 이동 버튼
      │  ├─ LandingHeader.tsx           # 랜딩 헤더/상단 영역
      │  ├─ LandingPage.tsx             # 랜딩 페이지 Container
      │  ├─ LocationNotice.tsx          # 위치 권한/안내 문구
      │  └─ PublicAboutPage.tsx         # 공개 소개 페이지
      ├─ shared/
      │  ├─ DegradedDataBanner.tsx      # degraded/fallback 데이터 사용 안내
      │  ├─ DemoNoticeModal.tsx         # 데모 모드 안내 모달
      │  ├─ DemoWarningBanner.tsx       # 데모 경고 배너
      │  ├─ DisclaimerBanner.tsx        # 119/1339 대체 아님 고지 배너
      │  ├─ EmergencyBanner.tsx         # 응급 상황 안내 배너
      │  ├─ GovernanceFooter.tsx        # 거버넌스/문서 링크 푸터
      │  └─ PanelSidebarHeader.tsx      # 사이드 패널 공통 헤더
      └─ map-dashboard/
         ├─ AdminHospitalMapMarker.tsx  # 관리자 지도 병원 마커
         ├─ AvailableBedsBadge.tsx      # 가용 병상 수 표시 뱃지
         ├─ ChoroplethLegend.tsx        # 취약지 색상 범례
         ├─ CitizenBedLabel.tsx         # 시민용 병상 상태 라벨
         ├─ CitizenHospitalTelLink.tsx  # 시민용 병원 전화 링크
         ├─ CitizenKakaoNavLink.tsx     # 시민용 Kakao Navi 링크
         ├─ CitizenMapComponent.tsx     # 시민 화면에 특화된 지도 컴포넌트
         ├─ DashboardStatsBar.tsx       # 관리자 대시보드 상단 통계 바
         ├─ DesktopSidebar.tsx          # 데스크톱 좌측 병원/상세 사이드바
         ├─ DetailPanel.tsx             # 선택 항목 상세 패널
         ├─ DistrictHoverTooltip.tsx    # 행정구역 hover 툴팁
         ├─ DistrictPolygon.tsx         # 행정구역 폴리곤 렌더링
         ├─ EmergencyEquipmentGuide.tsx # 응급 장비 안내 UI
         ├─ HeatmapToggle.tsx           # 취약지 히트맵 토글
         ├─ HospitalActionButtons.tsx   # 병원 상세 액션 버튼 묶음
         ├─ HospitalDetailPanel.tsx     # 병원 상세 패널 Container
         ├─ HospitalDetailView.tsx      # 병원 상세 정보 화면
         ├─ HospitalEmptyPanel.tsx      # 선택 병원 없음 상태 UI
         ├─ HospitalEquipmentStatus.tsx # 장비 보유 현황 UI
         ├─ HospitalFilterBar.tsx       # 병원 필터/정렬 바
         ├─ HospitalGranularBeds.tsx    # 세부 병상 현황 UI
         ├─ HospitalHiraInfo.tsx        # HIRA 기반 병원 정보 UI
         ├─ HospitalInfrastructureSection.tsx # 의료 인프라 점수/자원 UI
         ├─ HospitalLocationMeta.tsx    # 병원 주소/거리/좌표 메타 정보
         ├─ HospitalMarkersLayer.tsx    # 병원 마커 레이어 Container
         ├─ HospitalMarkerOverlay.tsx   # 지도 위 병원 오버레이
         ├─ HospitalMoonlightInfo.tsx   # 달빛어린이병원 정보 UI
         ├─ HospitalPopupCard.tsx       # 마커 클릭 팝업 카드
         ├─ HospitalRadarChart.tsx      # 병원 역량 레이더 차트
         ├─ HospitalSidebarControls.tsx # 사이드바 필터/정렬 컨트롤
         ├─ HospitalSidebarList.tsx     # 병원 사이드바 목록
         ├─ HospitalSpecialBeds.tsx     # 특수 병상 현황 UI
         ├─ LocateMeButton.tsx          # 현재 위치 이동 버튼
         ├─ MapComponent.tsx            # 관리자/시민 지도 핵심 Container
         ├─ MapHud.tsx                  # 지도 상단 HUD
         ├─ MapInteraction.tsx          # 지도 클릭/드래그 등 상호작용 연결
         ├─ MapRelayout.tsx             # 지도 relayout 처리
         ├─ MapToolbar.tsx              # 지도 도구 버튼 묶음
         ├─ MetricsGuide.tsx            # 지표 해석 안내 UI
         ├─ MobileBottomSheet.tsx       # 모바일 하단 병원/상세 패널
         ├─ OptimalLocationMarkers.tsx  # 최적 입지 마커 레이어
         ├─ OptimalLocationsPanel.tsx   # 최적 입지 목록/모드 패널
         ├─ PolicyWelcomePanel.tsx      # 정책 관리자 첫 안내 패널
         ├─ PresetDistrictListPanel.tsx # 취약 구역 프리셋 목록
         ├─ ResourceRecommendationModal.tsx # 자원 배분 추천 모달
         ├─ ResourceRecommendationPanel.tsx # 자원 배분 추천 패널
         ├─ SelectedHospitalPin.tsx     # 선택 병원 강조 핀
         ├─ TierBadge.tsx               # 병원 등급 뱃지
         ├─ TierIcon.tsx                # 병원 등급 아이콘
         ├─ TierLegendChip.tsx          # 등급 범례 칩
         ├─ VulnerabilityDistrictView.tsx # 취약 행정구역 상세 UI
         ├─ VulnerabilityLayer.tsx      # 취약지 GeoJSON 지도 레이어
         ├─ implementation_plan.md      # map-dashboard 내부 구현 메모
         ├─ useMapComponentController.ts # 지도 상태/이벤트/선택 병원 Controller
         └─ lib/
            ├─ choropleth-colors.ts     # 취약도 색상 계산
            ├─ daegu-map-bounds.ts      # 지도 bounds 제한/계산
            ├─ geojson-to-kakao.ts      # GeoJSON을 Kakao polygon 데이터로 변환
            ├─ hospital-filter.ts       # 병원 필터링/정렬 로직
            ├─ hospital-infrastructure-score.ts # 병원 인프라 점수 계산
            ├─ kakao-marker-images.ts   # Kakao 마커 이미지 생성/캐시
            ├─ spread-hospital-markers.ts # 겹치는 병원 마커 분산
            ├─ useDashboardActions.ts   # 관리자 대시보드 액션 훅
            ├─ useEtaController.ts      # ETA 요청, fallback, 로딩 상태 Controller
            ├─ useMapController.ts      # 지도 인스턴스 제어 훅
            ├─ useOptimalLocationsStore.ts # 최적 입지 표시/모드 Zustand
            ├─ usePresetStore.ts        # 행정구역 프리셋 선택 Zustand
            ├─ useResourceSimulation.ts # 자원 배분 시뮬레이션 훅
            ├─ useReverseGeocode.ts     # 좌표를 주소로 변환하는 훅
            └─ vulnerability-choropleth-colors.ts # 취약지 전용 색상 규칙
```

## 2. 백엔드 전체 트리

```text
backend/
├─ main.py                              # uvicorn 진입점, app.main의 FastAPI app 재노출
├─ requirements.txt                     # 백엔드 Python 의존성
├─ test_hira_api.py                     # HIRA API 수동 점검 스크립트
├─ test_kakao_navi.py                   # Kakao Navi/라우팅 수동 점검 스크립트
├─ app/
│  ├─ __init__.py                       # app 패키지 초기화
│  ├─ main.py                           # FastAPI 앱 생성, CORS, 라우터 등록, scheduler lifecycle
│  ├─ api/
│  │  ├─ __init__.py                    # API 패키지 초기화
│  │  └─ routes/
│  │     ├─ __init__.py                 # route 패키지 초기화
│  │     ├─ dashboard.py                # 관리자 요약/강제 새로고침 API
│  │     ├─ hospitals.py                # 병원 목록 API, 정적/실시간 데이터 조합
│  │     ├─ indicators.py               # 지표/상태성 API
│  │     ├─ optimal_locations.py        # 최적 입지 분석 결과 API
│  │     ├─ routing.py                  # ETA/경로 계산 API
│  │     └─ vulnerability.py            # 취약지 GeoJSON/지표 API
│  ├─ config/
│  │  └─ hospital_category_mapping.json # 병원 분류/카테고리 매핑 설정
│  ├─ core/
│  │  ├─ __init__.py                    # core 패키지 초기화
│  │  ├─ cache.py                       # TTL/메모리 캐시 기반 공통 캐시 유틸
│  │  └─ env.py                         # 환경변수 로딩/설정 접근
│  ├─ db/
│  │  ├─ database.py                    # SQLite 연결, 세션, DB 초기화
│  │  └─ models.py                      # SQLAlchemy 모델 정의
│  └─ services/
│     ├─ __init__.py                    # services 패키지 초기화
│     ├─ analysis_metrics.py            # 정책/취약지/병원 분석 지표 계산
│     ├─ bed_cache.py                   # 병상 정보 캐시 저장/조회
│     ├─ bed_payload.py                 # 병상 API 응답 payload 정규화
│     ├─ bed_poller.py                  # 병상 상태 주기 갱신 작업
│     ├─ data_seed.py                   # 초기 데이터 seed/보정 로직
│     ├─ data_validation.py             # 데이터 품질 검증 로직
│     ├─ hira_client.py                 # HIRA API 클라이언트
│     ├─ hospital_category.py           # 병원 카테고리 판정
│     ├─ hospital_mapping.py            # 외부 병원 데이터와 내부 병원 매핑
│     ├─ hospital_realtime.py           # 실시간 병원/병상 데이터 조합
│     ├─ hospital_static.py             # 정적 병원 데이터 로딩
│     ├─ job_lock.py                    # 중복 작업 방지 lock
│     ├─ pipeline.py                    # 외부 데이터 수집/검증/캐시 갱신 파이프라인
│     ├─ scheduler.py                   # 백그라운드 주기 작업 스케줄러
│     ├─ api_clients/
│     │  ├─ __init__.py                 # 외부 API 클라이언트 패키지 초기화
│     │  ├─ data_go_kr_client.py        # 공공데이터포털 API 클라이언트
│     │  ├─ nemc_mediboard_client.py    # 중앙응급의료센터/mediboard 클라이언트
│     │  └─ routing_client.py           # Kakao Mobility 등 경로/ETA 클라이언트
│     └─ fetchers/
│        ├─ __init__.py                 # fetcher 패키지 초기화
│        ├─ base.py                     # DataSourceStatus, fetcher 공통 상태/실패/degraded 처리
│        ├─ hospitals_api.py            # 병원/응급의료기관 외부 데이터 수집
│        ├─ population_api.py           # 인구/취약계층 외부 데이터 수집
│        └─ sgis.py                     # SGIS 관련 데이터 수집 클라이언트
└─ scripts/
   ├─ 01_setup_mock_data.py             # 초기 목 데이터 생성
   ├─ 02_simplify_geojson_for_frontend.py # 프론트용 GeoJSON 단순화
   ├─ 03_generate_mock_medical_data.py  # 의료 자원 목 데이터 생성
   ├─ 04_fetch_daegu_er_hospitals.py    # 대구 응급실 병원 데이터 수집
   ├─ 05_merge_final_hospitals.py       # 병원 데이터 병합/최종 JSON 생성
   ├─ 06_gather_analysis_inputs.py      # 분석 입력 데이터 수집
   ├─ 06_migrate_json_to_sqlite.py      # JSON 데이터를 SQLite로 마이그레이션
   ├─ 06_migrate_to_sqlite.py           # 다른 경로의 SQLite 마이그레이션 스크립트
   ├─ 07_parse_kosis_population.py      # KOSIS 인구 데이터 파싱
   ├─ 08_compute_vulnerability_geojson.py # 취약지 GeoJSON 계산
   ├─ cli_refresh.py                    # 수동 파이프라인 refresh CLI
   ├─ data_paths.py                     # 스크립트 공통 데이터 경로 정의
   └─ spatial_analysis.py               # 공간 분석/최적 입지 계산 보조 로직
```

## 3. 자주 찾는 기능별 시작점

| 보고 싶은 것 | 먼저 볼 파일 |
|---|---|
| Zustand 처리가 어디인지 | `frontend/src/shared/store/*.ts`, `frontend/src/widgets/map-dashboard/lib/useOptimalLocationsStore.ts`, `usePresetStore.ts` |
| 병원 데이터 API 호출 | `frontend/src/data/api/hospitals.ts`, `backend/app/api/routes/hospitals.py` |
| 병원 fallback/degraded 처리 | `frontend/src/shared/store/hospitalStore.ts`, `backend/app/services/pipeline.py`, `backend/app/services/fetchers/base.py` |
| 지도 마커가 찍히는 흐름 | `MapComponent.tsx`, `useMapComponentController.ts`, `HospitalMarkersLayer.tsx`, `HospitalMarkerOverlay.tsx` |
| 시민/관리자 화면 분기 | `AppPage.tsx`, `CitizenView.tsx`, `AdminView.tsx`, `useAdminController.ts` |
| 최적 입지 표시 | `useOptimalLocationsStore.ts`, `OptimalLocationsPanel.tsx`, `OptimalLocationMarkers.tsx` |
| 최적 입지 백엔드 API | `frontend/src/data/api/optimal-locations.ts`, `backend/app/api/routes/optimal_locations.py` |
| 취약지 히트맵 | `vulnerabilityStore.ts`, `VulnerabilityLayer.tsx`, `backend/app/api/routes/vulnerability.py` |
| ETA/길찾기 | `useEtaController.ts`, `backend/app/api/routes/routing.py`, `routing_client.py` |
| 백그라운드 데이터 갱신 | `scheduler.py`, `pipeline.py`, `fetchers/*.py` |
| SQLite 저장 구조 | `backend/app/db/database.py`, `backend/app/db/models.py`, `backend/scripts/06_migrate*.py` |

## 4. 컴포넌트와 상태 흐름 한눈에 보기

```text
main.tsx
└─ App.tsx
   ├─ AppDataBootstrap.tsx
   │  ├─ useHospitalStore.fetchHospitals()
   │  └─ useVulnerabilityStore.fetchVulnerability()
   └─ AppPage.tsx
      ├─ GlobalNavigationBar.tsx
      ├─ CitizenView.tsx
      │  ├─ useHospitalStore
      │  ├─ useOptimalLocationsStore
      │  ├─ MapComponent.tsx
      │  │  ├─ useMapComponentController.ts
      │  │  ├─ HospitalMarkersLayer.tsx
      │  │  ├─ VulnerabilityLayer.tsx
      │  │  └─ OptimalLocationMarkers.tsx
      │  ├─ DesktopSidebar.tsx
      │  └─ MobileBottomSheet.tsx
      └─ AdminView.tsx
         └─ useAdminController.ts
            ├─ useHospitalStore
            ├─ useVulnerabilityStore
            ├─ useDashboardSummaryStore
            └─ useOptimalLocationsStore
```

## 5. 검색 명령

```powershell
# 특정 store를 누가 쓰는지
rg -n "useHospitalStore|useVulnerabilityStore|useOptimalLocationsStore" frontend/src

# 특정 API 경로가 어디서 연결되는지
rg -n "/api/hospitals|/api/vulnerability|/api/optimal-locations|/api/routing" frontend/src backend/app

# 지도 관련 컴포넌트와 Controller 찾기
rg -n "MapComponent|useMapComponentController|HospitalMarkersLayer|OptimalLocationMarkers" frontend/src
```
