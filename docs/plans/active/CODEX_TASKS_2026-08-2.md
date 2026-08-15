# Codex 작업 실행 계획 — 2026년 8월 2차

첨부 문서 `CODEX_TASKS_202608_2차.md.docx`를 참고 자료로 검토하고, 현재 작업공간과 사용자의 "여기서 해결할 수 있는 것은 전부"라는 요청을 기준으로 실행 범위를 정리한다.

## 실행 범위

- [x] A1: 레거시 VDI 스크립트 제거, 독립 실행·수동 점검 스크립트 분리, 중복 SQLite 마이그레이션 스크립트 정리
- [x] A2: 실제 프로덕션 경로가 사용하는 `normalize_scores()` 분리 및 단위 테스트 보강
- [x] A3: 분석 의존성 파일, pytest import 경로, CI 캐시·설치 단계, README 연결
- [x] A4: cKDTree 위치 인덱스, 원본 JSON 숫자 타입, 최근접 기관 주입 조건 회귀 방지
- [x] A5: K-Means k 평가 로직 공통화, 정본 후보 경로의 선택 근거와 재현 가능한 보고서 생성
- [x] 전체 Python 테스트와 정책 릴리스 빌드를 실행하고 `data/processed/` 산출물 불변 확인

## 현재 작업공간 밖의 항목

- 프로젝트 B(`git-elctronic`) 작업 B1~B4: 해당 저장소가 현재 작업공간에 없음
- PR 머지 및 원격 브랜치 조작: 첨부 문서에서 사람이 직접 수행하도록 분류함
- SQL 3주 학습, p-median/MCLP 설명문, 면접 답변 대본: 사용자가 직접 이해하고 작성해야 하는 학습 항목

## 안전 기준

- 기존 구조와 산식을 유지하고 필요한 파일만 최소 변경한다.
- `data/processed/` 기준 산출물은 변경하지 않는다.
- 각 작업의 회귀 테스트와 전체 테스트를 통과한 뒤 완료로 표시한다.

## 실행 결과

### SQLite 마이그레이션 정본 판단

| 비교 항목 | `06_migrate_json_to_sqlite.py` | 삭제한 `06_migrate_to_sqlite.py` |
|---|---|---|
| 진입 함수 | `main()` | `migrate()` |
| 대상 DB 설명 | `hospitals.db` | `hospital_data.db` |
| 실제 `database.py`와 일치 | 예 | 아니요 |
| `sys.path` 처리 | 중복 삽입 방지 | 무조건 append |
| 오류 처리 | 예외를 다시 발생시킴 | JSON 오류에서 `sys.exit(1)` |
| 보존 필드 | `address`, `tel` | `address`; `tel` 누락 |

실제 SQLAlchemy 엔진이 `data/hospitals.db`를 사용하고 더 많은 원본 필드를 보존하므로 `06_migrate_json_to_sqlite.py`를 정본으로 유지했다.

### 분석 의존성 근거

| 패키지 | 사용 근거 |
|---|---|
| scipy | `scripts/vdi_sensitivity.py`, `backend/scripts/spatial_analysis.py` |
| scikit-learn | `ai-model/kmeans_evaluation.py`, 두 K-Means 실행 스크립트 |
| numpy | `ai-model/build_actual_road_accessibility.py`, `backend/scripts/spatial_analysis.py` |
| pandas | 분석·EDA·정책 파이프라인 전반 |
| geopandas | K-Means 좌표계 변환, 공간 분석 |
| shapely | `backend/scripts/spatial_analysis.py` |
| matplotlib, seaborn | `scripts/generate_eda_portfolio.py` |
| requests | 데이터 수집·공간 분석 스크립트 |
| httpx | 실제 도로 ETA와 백엔드 API 클라이언트 |
| geopy | `ai-model/pipeline_utils.py` |
| Pillow, reportlab | `scripts/generate_portfolio_pdf.py` |
| jupyter-client, nbclient, nbformat | `scripts/execute_eda_notebook.py` |
| ipykernel | nbclient가 CI에서 `python3` 커널을 시작하는 런타임 |
| xmltodict | `backend/scripts/04_fetch_daegu_er_hospitals.py` |

### 검증

- 저장소 루트 `python -m pytest tests/ -q`: 97 passed
- 워크플로 YAML 2개 파싱: 성공
- `build_policy_release.py`: 성공
- 150개 행정동 × 10개 핵심 필드 값·JSON 숫자 타입 비교: 1,500건 불일치 0
- `data/processed/` git diff: 없음
- K-Means 비교·민감도 스크립트 각각 2회 실행: JSON과 보고서 SHA-256 동일

`.iloc`는 원래부터 위치 기반이므로 병원 DataFrame의 라벨 인덱스에 구멍이 있어도 현재 구현은 올바르게 동작했다. 인덱스 초기화는 입력 계약을 명시하는 방어 조치이며, 추가 테스트는 향후 `.loc`로 되돌아가는 회귀를 차단한다.
