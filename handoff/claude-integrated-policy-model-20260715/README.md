# Claude 검토 패키지: 통합 정책 입지 모델

- 작성일: 2026-07-15
- 검토 대상: K-Means 안정 후보와 실제 도로망 p-median·MCLP 최적화의 결합
- 원본 프로젝트: Golden Time 응급 접근성 정책 대시보드

## 패키지 구성

| 경로 | 내용 |
|---|---|
| `01_review_request.md` | Claude에게 전달할 구체적인 검토 요청 |
| `02_validation_checklist.md` | 구현자가 확인한 항목과 추가 검토 항목 |
| `03_integrated_report.md` | 전체 구현 보고서 사본 |
| `source/` | 통합 파이프라인, 도로망 모델, 프론트 요약 화면 핵심 소스 |
| `artifacts/` | 실제 도로망 메타데이터와 최적조합 결과 |
| `FILE_MANIFEST.md` | 파일별 역할과 원본 위치 |

## 가장 먼저 볼 파일

1. `01_review_request.md`
2. `03_integrated_report.md`
3. `artifacts/policy_location_optimization.json`
4. `source/build_actual_road_accessibility.py`
5. `source/PolicyOptimizationSummary.tsx`

## 보안 및 용량 처리

- `.env`와 Kakao API 키는 포함하지 않았다.
- 원시 도로 ETA 캐시는 약 1.8MB이며 좌표별 응답이 포함돼 패키지에서 제외했다.
- 실제 결과 행렬과 최적조합 JSON은 포함했다.
