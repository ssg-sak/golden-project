# 파일 목록

| 패키지 파일 | 원본 위치 | 역할 |
|---|---|---|
| `source/run_integrated_policy_pipeline.py` | `ai-model/run_integrated_policy_pipeline.py` | 전체 모델 실행 순서 |
| `source/build_actual_road_accessibility.py` | `ai-model/build_actual_road_accessibility.py` | 도로 ETA 수집·캐시·최적화 |
| `source/useOptimalLocationsStore.ts` | `frontend/src/widgets/map-dashboard/lib/useOptimalLocationsStore.ts` | 후보와 최적조합 데이터 로드 |
| `source/PolicyOptimizationSummary.tsx` | `frontend/src/widgets/map-dashboard/PolicyOptimizationSummary.tsx` | 다중 후보 최적조합 요약 화면 |
| `source/OptimalLocationMarkers.tsx` | `frontend/src/widgets/map-dashboard/OptimalLocationMarkers.tsx` | 단일 후보 상세 화면 |
| `artifacts/policy_location_optimization.json` | `data/processed/policy_location_optimization.json` | 최적조합 결과 |
| `artifacts/actual_road_accessibility_matrix.json` | `data/processed/actual_road_accessibility_matrix.json` | 실제 도로 ETA 행렬 |
| `artifacts/stable_policy_candidates.json` | `frontend/public/data/stable_policy_candidates.json` | 프론트 후보별 통합 지표 |
| `03_integrated_report.md` | `docs/reports/integrated_policy_model_final_report_20260715.md` | 최종 구현 보고서 |
