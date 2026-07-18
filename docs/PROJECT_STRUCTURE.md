# 프로젝트 파일 구조도 (Project File Structure)

이 문서는 `Daegu Golden Time Governance` 프로젝트의 전체 디렉토리 및 개별 파일의 역할을 나타냅니다. (2026-07-18 레거시 정리 반영)

```text
project/  # 최상위 프로젝트 루트
|-- .github
|   +-- workflows
|       +-- deploy.yml  # YAML 기반 설정 파일
|-- ai-model  # 정책 후보와 실제 도로 접근성 분석 파이프라인
|   |-- build_accessibility_candidate_trace.py  # 접근성 개선량 분석 스크립트
|   |-- build_actual_road_accessibility.py  # 접근성 개선량 분석 스크립트
|   |-- build_policy_release.py  # 검증된 정책 산출물을 단일 릴리스로 묶는 스크립트
|   |-- build_stable_policy_candidates.py  # 민감도 결과에서 안정 후보 정본 생성
|   |-- compare_projected_kmeans_candidates.py  # K-Means 최적 입지 모델 스크립트
|   |-- generate_policy_reports.py  # 자동 보고서 생성 스크립트
|   |-- ml_blind_spot_filtering.py  # AI/데이터 분석 파이썬 스크립트
|   |-- pipeline_utils.py  # 통합 파이프라인 실행 유틸리티
|   |-- run_candidate_sensitivity_analysis.py  # AI/데이터 분석 파이썬 스크립트
|   |-- run_integrated_policy_pipeline.py  # 통합 파이프라인 실행 유틸리티
|   +-- visualize_stable_policy_candidates.py  # AI/데이터 분석 파이썬 스크립트
|-- backend  # FastAPI 기반 백엔드 서버 및 API 라우터
|   |-- app  # 백엔드 애플리케이션 코어
|   |   |-- api  # FastAPI 엔드포인트 라우터
|   |   |   |-- routes
|   |   |   |   |-- __init__.py  # 백엔드 파이썬 로직
|   |   |   |   |-- dashboard.py  # 백엔드 파이썬 로직
|   |   |   |   |-- hospitals.py  # 백엔드 파이썬 로직
|   |   |   |   |-- indicators.py  # 백엔드 파이썬 로직
|   |   |   |   |-- optimal_locations.py  # 백엔드 파이썬 로직
|   |   |   |   |-- routing.py  # 백엔드 파이썬 로직
|   |   |   |   +-- vulnerability.py  # 백엔드 파이썬 로직
|   |   |   +-- __init__.py  # 백엔드 파이썬 로직
|   |   |-- config
|   |   |   +-- hospital_category_mapping.json  # 구조화된 JSON 데이터/설정 파일
|   |   |-- core  # 백엔드 설정, 에러 처리 등 공통 모듈
|   |   |   |-- __init__.py  # 백엔드 파이썬 로직
|   |   |   |-- cache.py  # 백엔드 파이썬 로직
|   |   |   +-- env.py  # 백엔드 파이썬 로직
|   |   |-- db
|   |   |   |-- database.py  # 백엔드 파이썬 로직
|   |   |   |-- hospitals.db
|   |   |   +-- models.py  # 데이터베이스 모델(ORM) 스키마
|   |   |-- services  # 외부 데이터 수집 및 비즈니스 로직 연산
|   |   |   |-- api_clients
|   |   |   |   |-- __init__.py  # 백엔드 파이썬 로직
|   |   |   |   |-- data_go_kr_client.py  # 백엔드 파이썬 로직
|   |   |   |   |-- nemc_mediboard_client.py  # 백엔드 파이썬 로직
|   |   |   |   +-- routing_client.py  # 백엔드 파이썬 로직
|   |   |   |-- fetchers
|   |   |   |   |-- __init__.py  # 백엔드 파이썬 로직
|   |   |   |   |-- base.py  # 백엔드 파이썬 로직
|   |   |   |   |-- hospitals_api.py  # 백엔드 파이썬 로직
|   |   |   |   |-- population_api.py  # 백엔드 파이썬 로직
|   |   |   |   +-- sgis.py  # 백엔드 파이썬 로직
|   |   |   |-- __init__.py  # 백엔드 파이썬 로직
|   |   |   |-- analysis_metrics.py  # 백엔드 파이썬 로직
|   |   |   |-- bed_cache.py  # 백엔드 파이썬 로직
|   |   |   |-- bed_payload.py  # 백엔드 파이썬 로직
|   |   |   |-- bed_poller.py  # 백엔드 파이썬 로직
|   |   |   |-- data_seed.py  # 백엔드 파이썬 로직
|   |   |   |-- data_validation.py  # 백엔드 파이썬 로직
|   |   |   |-- hospital_category.py  # 백엔드 파이썬 로직
|   |   |   |-- hospital_mapping.py  # 백엔드 파이썬 로직
|   |   |   |-- hospital_realtime.py  # 백엔드 파이썬 로직
|   |   |   |-- hospital_static.py  # 백엔드 파이썬 로직
|   |   |   |-- job_lock.py  # 백엔드 파이썬 로직
|   |   |   |-- pipeline.py  # 백엔드 파이썬 로직
|   |   |   +-- scheduler.py  # 백엔드 파이썬 로직
|   |   |-- __init__.py  # 백엔드 파이썬 로직
|   |   +-- main.py  # FastAPI 서버 진입점 (Entrypoint)
|   |-- scripts  # 데이터 추출 및 로컬 개발 환경 헬퍼 스크립트
|   |   |-- 01_setup_mock_data.py  # 백엔드 파이썬 로직
|   |   |-- 02_simplify_geojson_for_frontend.py  # 백엔드 파이썬 로직
|   |   |-- 03_generate_mock_medical_data.py  # 백엔드 파이썬 로직
|   |   |-- 04_fetch_daegu_er_hospitals.py  # 백엔드 파이썬 로직
|   |   |-- 05_merge_final_hospitals.py  # 백엔드 파이썬 로직
|   |   |-- 06_gather_analysis_inputs.py  # 백엔드 파이썬 로직
|   |   |-- 06_migrate_json_to_sqlite.py  # 백엔드 파이썬 로직
|   |   |-- 06_migrate_to_sqlite.py  # 백엔드 파이썬 로직
|   |   |-- 07_parse_kosis_population.py  # 백엔드 파이썬 로직
|   |   |-- 08_compute_vulnerability_geojson.py  # 백엔드 파이썬 로직
|   |   |-- cli_refresh.py  # 백엔드 파이썬 로직
|   |   |-- data_paths.py  # 백엔드 파이썬 로직
|   |   +-- spatial_analysis.py  # 백엔드 파이썬 로직
|   |-- get_kakao_error.py  # 백엔드 파이썬 로직
|   |-- hospitals.db
|   |-- main.py  # FastAPI 서버 진입점 (Entrypoint)
|   |-- requirements.txt
|   +-- test_kakao_navi.py  # 백엔드 파이썬 로직
|-- data  # 원본 데이터(Raw), 정제 데이터(Processed) 및 리포트 파일 보관
|   |-- analysis
|   |   |-- daegu_dong.geojson
|   |   |-- daegu_population.csv
|   |   |-- daegu_vulnerability.geojson
|   |   |-- final_hospitals.json  # 구조화된 JSON 데이터/설정 파일
|   |   +-- policy_monitoring_report.csv
|   |-- cache
|   |   +-- kakao_road_eta_cache.json  # 구조화된 JSON 데이터/설정 파일
|   |-- processed  # 파이프라인을 거쳐 정제된 JSON/DB 데이터
|   |   |-- accessibility_candidate_trace.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- actual_road_accessibility_matrix.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- candidate_sensitivity_analysis.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- daegu-dong.geojson
|   |   |-- daegu_administrative_codes.csv
|   |   |-- daegu_er_hospitals.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- daegu_kindergartens_geocoded.csv
|   |   |-- daegu_medical_facilities.csv
|   |   |-- daegu_population.csv
|   |   |-- daegu_vulnerability.geojson
|   |   |-- er_hospital_coord_supplement.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- er_hospital_coord_supplement_fixed.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- extraction_report.md
|   |   |-- final_hospitals.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- mock_hospitals.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- mock_medical_data.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- optimal_locations.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- optimal_locations_pediatric.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- optimal_locations_pediatric_BASELINE.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- optimal_locations_senior.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- optimal_locations_senior_BASELINE.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- policy_location_optimization.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- projected_kmeans_candidate_comparison.json  # 파이프라인 처리 완료된 JSON 데이터
|   |   |-- region_indicators.csv
|   |   |-- stable_policy_candidates_overview_20260715.png
|   |   +-- policy_release.json  # 검증된 단일 정책 릴리스
|   |-- raw
|   |   |-- geo
|   |   |   +-- daegu_dong.geojson
|   |   |-- population
|   |   |   |-- daegu_population.csv
|   |   |   |-- daegu_population_real.csv
|   |   |   +-- kosis_dong_5yr_population_202606.csv
|   |   +-- daegu_kindergartens.csv
|   |-- reports  # 최종 정책 분석 보고서 등 배포용 파일
|   |   |-- 2026-07-11-policy-tab-cache-env-resolution.md
|   |   +-- daegu-golden-time-policy-analysis-report.pdf  # 분석이 완료된 배포용 PDF 보고서
|   |-- hospitals.db
|   |-- optimal_locations.json  # 구조화된 JSON 데이터/설정 파일
|   |-- policy_monitoring_report.csv
|   |-- priority_targets.json  # 구조화된 JSON 데이터/설정 파일
|   +-- 사회과학_분석_보고서.pdf
|-- docs  # 아키텍처, 가이드, 트러블슈팅, 각종 완료 보고서 문서
|   |-- 01_Architecture_and_Tech.md  # 개발 마크다운 문서
|   |-- 02_AI_and_Data_Pipeline.md  # 개발 마크다운 문서
|   |-- 03_Troubleshooting_and_Daily_Reports.md  # 개발 마크다운 문서
|   |-- 04_Project_History_and_Retrospective.md  # 개발 마크다운 문서
|   |-- 05_Planning_and_Roadmaps.md  # 개발 마크다운 문서
|   |-- 06_Guides_and_Learning.md  # 개발 마크다운 문서
|   |-- 07_Uncategorized.md  # 개발 마크다운 문서
|   +-- PROJECT_STRUCTURE.md  # 개발 마크다운 문서
|-- frontend  # React + Vite 프론트엔드 웹 앱
|   |-- public
|   |   |-- data  # 원본 데이터(Raw), 정제 데이터(Processed) 및 리포트 파일 보관
|   |   |   |-- reports
|   |   |   |   |-- 2026-07-11-policy-tab-cache-env-resolution.md
|   |   |   |   +-- daegu-golden-time-policy-analysis-report.pdf  # 분석이 완료된 배포용 PDF 보고서
|   |   |   |-- accessibility_candidate_trace.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- actual_road_accessibility_matrix.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- optimal_locations.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- optimal_locations_pediatric.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- optimal_locations_pediatric_BASELINE.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- optimal_locations_senior.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- optimal_locations_senior_BASELINE.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- policy_location_optimization.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- policy_monitoring_report.csv
|   |   |   |-- priority_targets.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- stable_policy_candidates.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- policy_release.json  # 검증된 단일 정책 릴리스
|   |   |   +-- 사회과학_분석_보고서.pdf
|   |   |-- favicon.svg
|   |-- src  # 프론트엔드 소스코드 루트
|   |   |-- app
|   |   |   |-- App.tsx  # React 기반 UI 컴포넌트 파일
|   |   |   +-- AppPage.tsx  # React 기반 UI 컴포넌트 파일
|   |   |-- assets
|   |   |   |-- daegu-dong.geojson
|   |   |   |-- daegu_er_hospitals.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   |-- daegu_vulnerability.geojson
|   |   |   |-- final_hospitals.json  # 구조화된 JSON 데이터/설정 파일
|   |   |   +-- mock_hospitals.json  # 구조화된 JSON 데이터/설정 파일
|   |   |-- data  # 외부 API 연동, 통신 등 데이터 계층
|   |   |   |-- api
|   |   |   |   |-- geo.ts  # 데이터 쿼리 및 통신 로직
|   |   |   |   |-- hospitals.ts  # 데이터 쿼리 및 통신 로직
|   |   |   |   +-- vulnerability.ts  # 데이터 쿼리 및 통신 로직
|   |   |   |-- daegu_vulnerability.geojson
|   |   |   +-- final_hospitals.json  # 구조화된 JSON 데이터/설정 파일
|   |   |-- shared  # 도메인에 종속되지 않는 전역 재사용 UI 및 공통 컴포넌트
|   |   |   |-- components
|   |   |   |   |-- AppDataBootstrap.tsx  # 전역에서 재사용 가능한 공통 UI 컴포넌트
|   |   |   |   +-- BaseMap.tsx  # 전역에서 재사용 가능한 공통 UI 컴포넌트
|   |   |   |-- config
|   |   |   |   |-- api.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- env.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   +-- kakao.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |-- constants
|   |   |   |   |-- circuit-breaker.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- daegu.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- dashboard-layout.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- loading-messages.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   +-- map.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |-- data  # 원본 데이터(Raw), 정제 데이터(Processed) 및 리포트 파일 보관
|   |   |   |   |-- hospital-er-tel.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- mock-hospital-data.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   +-- static-fallback-hospitals.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |-- hooks
|   |   |   |   |-- useMobileHospitalDetailHistory.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- useSortedHospitalsByDistance.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   +-- useUserLocation.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |-- lib
|   |   |   |   |-- bed-status.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- canonical-hospitals.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- daegu-bounds.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- distance.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- error-message.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- fetch-with-timeout.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- hospital-recommendation.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- hospital-tel.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- hospital-tier-visual.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- kakao-navigation.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- mobile-scroll.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- nearest-hospital.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- severe-condition.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   +-- travel-time.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |-- store
|   |   |   |   |-- appModeStore.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- dashboardSummaryStore.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- hospitalStore.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   |-- locationStore.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |   +-- vulnerabilityStore.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   +-- types
|   |   |       |-- geojson.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |       |-- hospital.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |       |-- medical.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |       |-- user-location.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |       +-- vulnerability.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |-- types
|   |   |   +-- kakao-maps.d.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |-- widgets  # 도메인별(기능별) 위젯 컴포넌트 (맵 대시보드, 랜딩 등)
|   |   |   |-- app  # 앱 레이아웃, 모드 전환 및 전체 라우팅 뷰
|   |   |   |   |-- AboutModal.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- AdminHospitalSidebar.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- AdminMobileBottomSheet.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- AdminView.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- CitizenView.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- GlobalNavigationBar.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- MobileCitizenHospitalBrowser.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- PlatformIntroView.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   |-- PolicyStatusBanner.tsx  # 앱 모드(시민/정책) 뷰 레이아웃 컴포넌트
|   |   |   |   +-- useAdminController.ts  # TypeScript 유틸리티 및 로직 파일
|   |   |   |-- landing  # 초기 랜딩/소개 페이지
|   |   |   |   |-- BedStatusBadge.tsx  # 초기 랜딩 및 소개 화면 컴포넌트
|   |   |   |   |-- HospitalListItem.tsx  # 초기 랜딩 및 소개 화면 컴포넌트
|   |   |   |   |-- KakaoNavButton.tsx  # 초기 랜딩 및 소개 화면 컴포넌트
|   |   |   |   |-- LandingHeader.tsx  # 초기 랜딩 및 소개 화면 컴포넌트
|   |   |   |   |-- LandingPage.tsx  # 초기 랜딩 및 소개 화면 컴포넌트
|   |   |   |   |-- LocationNotice.tsx  # 초기 랜딩 및 소개 화면 컴포넌트
|   |   |   |   +-- PublicAboutPage.tsx  # 초기 랜딩 및 소개 화면 컴포넌트
|   |   |   |-- map-dashboard  # 지도 중심의 시민/정책 대시보드 메인 컴포넌트 모음
|   |   |   |   |-- lib  # 지도 도메인에 특화된 커스텀 훅 및 로직 (상태 등)
|   |   |   |   |   |-- candidate-location-labels.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- choropleth-colors.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- daegu-map-bounds.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- geojson-to-kakao.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- hospital-filter.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- hospital-infrastructure-score.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- kakao-marker-images.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- spread-hospital-markers.ts  # 대시보드 유틸리티 함수
|   |   |   |   |   |-- useDashboardActions.ts  # 대시보드 전용 React 커스텀 훅
|   |   |   |   |   |-- useEtaController.ts  # 대시보드 전용 React 커스텀 훅
|   |   |   |   |   |-- useMapController.ts  # 대시보드 전용 React 커스텀 훅
|   |   |   |   |   |-- useOptimalLocationsStore.ts  # 대시보드 전용 Zustand 전역 상태 스토어
|   |   |   |   |   |-- usePresetStore.ts  # 대시보드 전용 Zustand 전역 상태 스토어
|   |   |   |   |   |-- useResourceSimulation.ts  # 대시보드 전용 React 커스텀 훅
|   |   |   |   |   |-- useReverseGeocode.ts  # 대시보드 전용 React 커스텀 훅
|   |   |   |   |   +-- vulnerability-choropleth-colors.ts  # 대시보드 유틸리티 함수
|   |   |   |   |-- AdminHospitalMapMarker.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- AvailableBedsBadge.tsx  # 시각적 뱃지/아이콘 UI 컴포넌트
|   |   |   |   |-- ChoroplethLegend.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- CitizenBedLabel.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- CitizenHospitalTelLink.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- CitizenKakaoNavLink.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- CitizenMapComponent.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- DashboardStatsBar.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- DesktopSidebar.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- DetailPanel.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- DistrictHoverTooltip.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- DistrictPolygon.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- EmergencyEquipmentGuide.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HeatmapToggle.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalActionButtons.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalDetailPanel.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- HospitalDetailView.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalEmptyPanel.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- HospitalEquipmentStatus.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalFilterBar.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalGranularBeds.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalInfrastructureSection.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalLocationMeta.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalMarkerOverlay.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- HospitalMarkersLayer.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalMoonlightInfo.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalPopupCard.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- HospitalSidebarControls.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- HospitalSidebarList.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- HospitalSpecialBeds.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- LocateMeButton.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- MapComponent.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- MapHud.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- MapInteraction.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- MapRelayout.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- MapToolbar.tsx  # 지도 렌더링/오버레이 컴포넌트
|   |   |   |   |-- MetricsGuide.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- MobileBottomSheet.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- OptimalLocationMarkers.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- PolicyOptimizationSummary.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- PolicyWelcomePanel.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- PresetDistrictListPanel.tsx  # 사이드바 및 패널 UI 컴포넌트
|   |   |   |   |-- SelectedHospitalPin.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- TierBadge.tsx  # 시각적 뱃지/아이콘 UI 컴포넌트
|   |   |   |   |-- TierIcon.tsx  # 시각적 뱃지/아이콘 UI 컴포넌트
|   |   |   |   |-- TierLegendChip.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- VulnerabilityDistrictView.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- VulnerabilityLayer.tsx  # 지도 대시보드 UI 컴포넌트
|   |   |   |   |-- implementation_plan.md
|   |   |   |   +-- useMapComponentController.ts  # 대시보드 전용 React 커스텀 훅
|   |   |   +-- shared
|   |   |       |-- DegradedDataBanner.tsx  # React 기반 UI 컴포넌트 파일
|   |   |       |-- DemoNoticeModal.tsx  # React 기반 UI 컴포넌트 파일
|   |   |       |-- DemoWarningBanner.tsx  # React 기반 UI 컴포넌트 파일
|   |   |       |-- DisclaimerBanner.tsx  # React 기반 UI 컴포넌트 파일
|   |   |       |-- EmergencyBanner.tsx  # React 기반 UI 컴포넌트 파일
|   |   |       |-- GovernanceFooter.tsx  # React 기반 UI 컴포넌트 파일
|   |   |       +-- PanelSidebarHeader.tsx  # React 기반 UI 컴포넌트 파일
|   |   |-- index.css  # 스타일시트(CSS) 파일
|   |   +-- main.tsx  # React 기반 UI 컴포넌트 파일
|   |-- test-results
|   |   +-- .last-run.json  # 구조화된 JSON 데이터/설정 파일
|   |-- tests  # 단위(Unit) / E2E 테스트 모음
|   |   +-- e2e
|   |       +-- app-smoke.spec.ts  # 프론트엔드 테스트 코드
|   |-- .env
|   |-- Dockerfile  # 프로젝트 도커 이미지 빌드 파일
|   |-- eslint.config.js  # ESLint 코드 린팅 설정
|   |-- index.html  # HTML 마크업 템플릿
|   |-- package-lock.json  # 구조화된 JSON 데이터/설정 파일
|   |-- package.json  # Node.js 프로젝트 의존성 및 스크립트 정의
|   |-- playwright.config.ts  # E2E 테스트(Playwright) 실행 설정
|   |-- tsconfig.app.json
|   |-- tsconfig.json  # TypeScript 기본 컴파일러 설정
|   |-- tsconfig.node.json
|   |-- vite.config.ts  # Vite 번들러 빌드 및 개발 서버 설정
|   +-- vitest.config.ts  # TypeScript 유틸리티 및 로직 파일
|-- handoff  # 과거 작업 이력 및 모델/에이전트 인수인계 파일
|   +-- claude-integrated-policy-model-20260715
|       |-- artifacts
|       |   |-- actual_road_accessibility_matrix.json  # 이전 모델 실행 및 산출물 백업
|       |   |-- policy_location_optimization.json  # 이전 모델 실행 및 산출물 백업
|       |   +-- stable_policy_candidates.json  # 이전 모델 실행 및 산출물 백업
|       |-- source
|       |   |-- OptimalLocationMarkers.tsx  # React 기반 UI 컴포넌트 파일
|       |   |-- PolicyOptimizationSummary.tsx  # React 기반 UI 컴포넌트 파일
|       |   |-- build_actual_road_accessibility.py
|       |   |-- run_integrated_policy_pipeline.py
|       |   +-- useOptimalLocationsStore.ts  # TypeScript 유틸리티 및 로직 파일
|       |-- 01_review_request.md  # 에이전트 인수인계/리뷰 문서
|       |-- 02_validation_checklist.md  # 에이전트 인수인계/리뷰 문서
|       |-- 03_integrated_report.md  # 에이전트 인수인계/리뷰 문서
|       |-- FILE_MANIFEST.md  # 에이전트 인수인계/리뷰 문서
|       +-- README.md  # 프로젝트 종합 소개 및 실행 가이드
|-- scripts  # 데이터 추출 및 로컬 개발 환경 헬퍼 스크립트
|   |-- dev
|   |   |-- check-dev-ports.ps1  # 개발 환경 자동화 쉘 스크립트
|   |   |-- start-backend.ps1  # 개발 환경 자동화 쉘 스크립트
|   |   +-- stop-dev-servers.ps1  # 개발 환경 자동화 쉘 스크립트
|   |-- extract_daegu_data.py  # 데이터 추출 및 관리용 파이썬 스크립트
|-- tests  # 단위(Unit) / E2E 테스트 모음
|   |-- e2e  # Playwright 기반 프론트엔드 E2E 테스트
|   |-- integration  # 백엔드/프론트엔드 통합 테스트
|   |   +-- backend  # FastAPI 기반 백엔드 서버 및 API 라우터
|   |       +-- test_pipeline_integration.py  # 백엔드 파이썬 로직
|   +-- unit  # 각 모듈별 단위 테스트 코드
|       |-- backend  # FastAPI 기반 백엔드 서버 및 API 라우터
|       |   |-- test_dynamic_dashboard.py  # 백엔드 파이썬 로직
|       |   |-- test_emergency_equipment_merge.py  # 백엔드 파이썬 로직
|       |   +-- test_nemc_mediboard_client.py  # 백엔드 파이썬 로직
|       +-- frontend  # React + Vite 프론트엔드 웹 앱
|           |-- bed-status.test.ts  # 프론트엔드 테스트 코드
|           |-- canonical-hospitals.test.ts  # 프론트엔드 테스트 코드
|           |-- daegu-bounds.test.ts  # 프론트엔드 테스트 코드
|           |-- hospital-recommendation.test.ts  # 프론트엔드 테스트 코드
|           |-- mobile-hospital-detail-history.test.ts  # 프론트엔드 테스트 코드
|           +-- tsconfig.json  # TypeScript 기본 컴파일러 설정
|-- .cursorignore
|-- .env
|-- .env.demo
|-- .env.example
|-- .gitignore
|-- AGENTS.md  # AI 개발 규칙 (코드 품질, 상태/뷰 분리 등 전역 규칙)
|-- CODE_EXPLANATION.md  # 코드 베이스 전반의 흐름 및 로직 설명
|-- Dockerfile  # 프로젝트 도커 이미지 빌드 파일
|-- README.md  # 프로젝트 종합 소개 및 실행 가이드
|-- docker-compose.yml  # 도커 기반 백엔드/인프라 실행 설정
|-- package.json  # Node.js 프로젝트 의존성 및 스크립트 정의
|-- tmp_hospitals.json  # 구조화된 JSON 데이터/설정 파일
|-- update_db.py  # SQLite 데이터베이스 업데이트/마이그레이션 스크립트
+-- 기획서.html  # HTML 마크업 템플릿
```
