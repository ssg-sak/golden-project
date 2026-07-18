# 대구 골든타임 저장소 정리 계획

작성일: 2026-07-19

## 1. 목적

대구 골든타임 저장소를 시민용 응급의료 서비스와 골든 거버넌스 정책분석 엔진의 현재 구현 중심으로 정리한다. 과거 전달용 복사본, 일회성 수정 스크립트, 구형 설명서, 재생성 가능한 로컬 산출물을 제거하되 분석 재현성·배포·감사 기록은 보존한다.

이번 정리는 파일 수를 줄이는 것 자체가 목적이 아니다. 다음 기준을 동시에 만족해야 한다.

- 현재 서비스의 실행·테스트·배포 경로가 선명할 것
- 150개 행정동·25개 기관·9개 후보·5,100개 경로의 정책 정본을 훼손하지 않을 것
- 원천·처리·공개 데이터의 계보와 결정성 검증을 유지할 것
- 구형 문서가 현재 구현처럼 읽히는 혼선을 줄일 것
- 삭제한 추적 파일은 Git 이력으로 복구할 수 있을 것

## 2. 조사 결과

조사 시점의 Git 추적 파일은 365개다. 용량이 큰 영역은 `data/`, `frontend/`, `docs/`, `handoff/` 순이다.

| 영역 | 판정 | 근거 |
|---|---|---|
| `frontend/`, `backend/` | 유지 | 시민·정책 화면과 공개 API의 실행 코드 |
| `ai-model/` | 유지 | 후보·도로 접근성·정책 릴리스의 재현 파이프라인 |
| `tests/`, `.github/workflows/` | 유지 | 자동 검증과 배포 재현성 |
| `data/raw/`, `data/processed/` | 유지 | 원천 계보, 처리 정본, 정책 릴리스 계약 |
| `frontend/public/data/` | 유지 | GitHub Pages가 소비하는 공개 산출물 |
| 처리용·공개용 정책 JSON 사본 | 유지 | CI가 바이트 동일성과 결정성을 검증하는 의도적 사본 |
| `docs/01`~`07` | 당장 유지 | 현재와 다른 과거 기록임을 명시한 감사·회고 자료이며 일부 README 링크가 존재 |
| `golden-data-lab/` | 별도 승인 전 유지 | 별도 저장소 분리 계획의 승인 게이트가 아직 완료되지 않음 |
| `analysis/golden_governance_eda.ipynb` | 유지 | EDA 생성 스크립트의 명시적 산출 경로 |
| `handoff/claude-integrated-policy-model-20260715/` | 삭제 | 2026-07-15 외부 검토용 소스·산출물 복사본이며 현재 본 코드와 정본이 후속 검증을 완료함 |
| `CODE_EXPLANATION.md` | 삭제 | 제거된 HIRA 폴링과 과거 병상 표현을 현행 구조처럼 설명함 |
| `update_db.py` | 삭제 | 특정 병원 레코드를 직접 수정하는 일회성 비재현 스크립트 |
| `.env.demo` | 삭제 | 현재 프론트 작업 경로에서 사용되지 않는 구형 데모 설정이며 실제 값 보관 위험이 있음 |
| `data/사회과학_분석_보고서.pdf` | 삭제 | 최종 공개 정책 PDF와 별개의 과거 보고서 |
| 캐시·빌드·임시 폴더 | 삭제 | `.gitignore` 대상이며 테스트·빌드로 재생성 가능 |

## 3. 보호 대상

다음은 정리 중 삭제하거나 덮어쓰지 않는다.

- `.env`, `frontend/.env`: 로컬 비밀 설정이며 Git 대상이 아님
- `frontend/node_modules/`: 재설치 가능하지만 현재 검증 환경 유지에 필요
- `data/hospitals.db`: Git 추적 정본이며 조사 시작 전부터 로컬 변경이 존재함
- `frontend/public/data/reports/daegu-golden-time-policy-analysis-report.pdf`: 공개하는 유일한 최종 정책보고서
- `data/processed/policy_release.json`, `frontend/public/data/policy_release.json`: 결정성 검증 사본
- 실제 도로 행렬·후보·추적·최적화 정본과 해당 테스트
- `docs/reports/`의 무시된 로컬 문서와 `implementation_plan.md`: 사용자 확인 전 삭제하지 않음

## 4. 단계별 실행 계획

### Phase 1. 재생성 가능한 로컬 산출물 정리

삭제 대상:

- `.pytest_cache/`
- 모든 `__pycache__/`
- `frontend/dist/`
- `frontend/test-results/`
- `tmp/`
- 빈 `tmp_hospitals.json`
- 빈 `backend/hospitals.db`

이 항목은 Git에 포함되지 않으며 필요하면 테스트·빌드·실행으로 다시 생성한다.

### Phase 2. 명백한 추적 레거시 제거

삭제 대상:

- `.env.demo`
- `CODE_EXPLANATION.md`
- `update_db.py`
- `handoff/claude-integrated-policy-model-20260715/` 전체
- `data/사회과학_분석_보고서.pdf`

삭제 후 README와 `docs/PROJECT_STRUCTURE.md`에서 관련 설명을 제거한다.

### Phase 3. 구조 문서 개선

`docs/PROJECT_STRUCTURE.md`를 모든 파일을 나열하는 장황한 트리에서 다음 중심의 구조 문서로 개편한다.

1. 런타임 구조
2. 시민 서비스 데이터 흐름
3. 정책분석 정본 생성 흐름
4. 원천·처리·공개 데이터의 역할
5. 테스트·CI·배포 경로
6. 의도적으로 유지하는 중복
7. 저장소에 두지 않는 로컬 산출물

### Phase 4. 별도 승인 후 정리

다음은 이번 즉시 삭제 범위에 포함하지 않는다.

- `golden-data-lab/` 분리 또는 삭제
- `docs/01`~`07`을 `docs/archive/`로 이동
- `data/analysis`, `data/processed`, `frontend/src/assets` 사이의 데이터 사본 통합
- 무시된 로컬 `docs/reports/`, `implementation_plan.md`, `backend/get_kakao_error.py` 삭제

이 항목은 새 저장소 이전, import 경로, 데이터 라이선스, 사용자 보존 의사를 먼저 확인해야 한다.

## 5. 검증 절차

정리 후 다음 검증을 모두 수행한다.

- 삭제 경로를 참조하는 활성 코드·README 링크가 없는지 `rg`로 확인
- 프론트 Vitest, ESLint, TypeScript, 프로덕션 빌드
- 백엔드 Pytest
- 분석 Pytest와 정책 릴리스 결정성 검증
- 프로덕션 빌드에 최종 정책 PDF가 한 개만 포함되는지 확인
- GitHub Actions 성공 확인
- `data/hospitals.db`의 기존 로컬 변경이 커밋에 포함되지 않았는지 확인

## 6. 되돌리기

- 추적 파일 삭제는 독립 커밋으로 유지해 Git에서 복원 가능하게 한다.
- Draft PR 검토 전에는 `main`에 병합하지 않는다.
- 삭제로 실행·검증이 깨지면 해당 파일만 복원하고 원인을 계획서에 기록한다.
- 로컬 캐시·빌드 산출물은 명령으로 재생성한다.

## 7. 완료 기준

- 구형 전달 패키지와 과거 PDF가 활성 트리에서 제거됨
- 현재 구현과 충돌하는 루트 설명서·일회성 DB 수정 스크립트가 제거됨
- 최종 정책 PDF 한 개만 공개 경로에 존재함
- 구조 문서가 실제 실행·분석·배포 경로를 설명함
- 전체 테스트·빌드·CI가 통과함

## 8. 1차 실행 결과

2026-07-19에 Phase 1~3의 안전 범위를 실행했다.

- 추적 파일 17개 삭제, 계획서 1개 추가
- 예상 Git 추적 파일 수: 365개에서 349개로 감소
- `handoff/` 과거 전달 패키지 제거
- 구형 사회과학 PDF 제거
- 구형 루트 설명서·일회성 DB 수정 스크립트·미사용 데모 환경파일 제거
- 로컬 캐시·빌드·테스트 결과·임시 검토 패키지 제거
- `docs/PROJECT_STRUCTURE.md`를 실행·데이터·검증 흐름 중심으로 개편
- 공개 정책 PDF 한 개 유지 확인

검증 결과:

- 프론트 Vitest 18개 통과
- ESLint·TypeScript·Vite 프로덕션 빌드 통과
- 백엔드 Pytest 29개 통과
- 분석 Pytest 7개 통과
- 정책 릴리스 재생성·결정성 비교 통과
- EDA 문서·노트북 재생성 통과
- npm production audit 취약점 0개

Phase 4 대상은 삭제하지 않았다. 특히 `golden-data-lab/`, 과거 감사 문서, 무시된 사용자 문서는 별도 검토 대상으로 남긴다.
