# 예외 처리 개선 보고서

## 목적

서비스 중단을 막기 위해 추가한 폴백이 실제 오류를 정상 데이터처럼 보이게 하는 경로를 점검하고, 실패 사실과 데이터 출처가 상위 계층까지 전달되도록 개선했다.

## 주요 개선 결과

| 영역 | 기존 위험 | 개선 결과 |
|---|---|---|
| 최적 입지 API | 파일 부재·손상도 `200 []` | 미생성 `503`, 손상·스키마 오류 `500` |
| 프런트 최적 입지 호출 | 모든 오류를 빈 배열로 변환 | 오류를 Store/호출자에게 다시 전달 |
| 병원 응답 검증 | 잘못된 행만 조용히 제거 | 부분 스키마 손상도 실패로 처리해 명시적 폴백 진입 |
| 병원 검증 경고 문구 | 개발자용 원인이 사용자 문구처럼 보임 | 콘솔 로그는 원인 추적용으로 축약하고 사용자 안내는 최근 정보 제공 문장으로 분리 |
| 정책 요약 API 시각 계산 | naive/aware datetime 혼합으로 `/api/dashboard/summary` 500 발생 | API 경계에서 UTC 정규화 후 stale 계산, 정책 탭 폴백 해제 |
| 병원 폴백 시각 | 오래된 데이터가 방금 갱신된 것처럼 기록 | 폴백 시 기존 `lastUpdatedAt` 보존 |
| 데이터 파이프라인 | 원천 실패 후에도 실행 성공 응답 | `failed/degraded` 원천을 모아 `partial_failure`로 전달 |
| 인구 CSV 폴백 | API 실패가 성공 상태로 덮임 | 데이터는 사용하되 원천 상태는 `degraded`로 보존 |
| HIRA 비동기 작업 | 조기 HTTP 오류 시 작업 미회수 | 작업 취소 후 회수하고 오류 재전파 |
| AI 지오코딩 | 실패 행에 가짜 대구시청 좌표 저장 | 좌표를 비워 후속 분석에서 제외 |
| 마이그레이션 | 롤백 후 프로세스 성공 종료 가능 | 예외를 다시 발생시켜 비정상 종료 코드 보장 |

## 상태 전달 기준

- `updated`, `unchanged`: 외부 원천 조회와 데이터 처리가 정상 완료됨
- `degraded`: 외부 원천은 실패했지만 명시적인 로컬 폴백으로 데이터를 제공함
- `failed`: 사용할 수 있는 결과를 만들지 못함
- `partial_failure`: 파이프라인 대상 중 하나 이상이 `degraded` 또는 `failed`

## 검증 결과

- Python 문법 검사: `python -m compileall backend/app backend/scripts ai-model/pipeline_utils.py` 통과
- 프런트 타입 검사: `npm.cmd run typecheck` 통과
- 프런트 단위 테스트: 4개 파일, 14개 테스트 통과
- 백엔드 단위 테스트: `pytest tests/unit/backend/test_dynamic_dashboard.py` 통과
- 정책 요약 API 확인: `http://127.0.0.1:8000/api/dashboard/summary` 응답 `200`
- `git diff --check`: 이번 변경에서 새 공백 오류 없음. 기존 `README.md` 52행의 trailing whitespace 경고는 사용자 변경 보존을 위해 수정하지 않음
- 2026-07-14 추가 확인: `/api/hospitals` 25건 모두 JS 런타임 검증 통과. 기존 `[fetchHospitals] 스키마 불일치...` 경고는 수정 전 개발자 로그 또는 오래된 Vite 번들/콘솔 잔여 로그로 판단하고, 최신 프런트 개발 서버를 재시작함

## 관련 문서

- 학습용 판단 기준: `docs/guides/exception_handling_study_20260714.md`
- 아키텍처 파일 지도: `docs/architecture/component_file_map_20260714.md`
