# 포트폴리오 패키지 검증 보고서

## 1. 결론과 정본

- 검증일: 2026-08-22
- 정책 릴리스: `2026-07-r1`
- 인구 기준월: 2026.07
- 분석 계약: 행정동 150개·기준 기관 25개·후보 9개·도로 경로 5,100개·누락 0개
- 공개 PDF: `frontend/public/data/reports/daegu-golden-time-policy-analysis-report.pdf`
- PDF: 3,050,829바이트·13쪽·SHA-256 `FC28064E35CB1B29BA7BB2FC12F728DF68C337761A29E9AA841FC148105F9AD8`

현재 패키지는 **저장된 입력과 릴리스 범위에서 결정적으로 재생성·검증 가능**하다. 이는 코드·파일·산식·경로·해시의 내부 재현성 판정이며, 실제 환자 이송성과나 정책 효과의 외부 타당성을 100% 입증했다는 뜻은 아니다.

## 2. 실행 검증 결과

| 범위 | 실행 명령 | 결과 |
|---|---|---:|
| Python 전체 | `backend\.venv\Scripts\python.exe -m pytest tests\ -q` | **105 passed** |
| 프론트 단위 테스트 | `npm.cmd test --prefix frontend` | **35 passed / 9 files** |
| ESLint | `npm.cmd run lint --prefix frontend` | **통과** |
| TypeScript | `npm.cmd run typecheck --prefix frontend` | **통과** |
| 프로덕션 빌드 | `npm.cmd run build --prefix frontend` | **통과 / 630 modules** |
| 프로덕션 의존성 감사 | `npm.cmd audit --prefix frontend --omit=dev --audit-level=high` | **취약점 0건** |
| 정책 릴리스 | `python ai-model/build_policy_release.py` | **재생성 성공** |
| 외부 참고 집계 | `python scripts/external_validity_validation.py` | **재생성 성공** |
| EDA 산출물 | `python scripts/generate_eda_portfolio.py` | **재생성 성공** |
| EDA 노트북 | `python scripts/execute_eda_notebook.py --verify-committed-source` | **5개 코드 셀 실행·출력 검증** |
| 정본 PDF | `python scripts/generate_portfolio_pdf.py` | **출력·공개본 바이트 동일** |

## 3. PDF·링크 검증

- 생성 스크립트가 로컬 검토본과 서비스 공개본을 같은 바이트로 만든다.
- 두 경로의 SHA-256은 `FC28064E…05F9AD8`로 일치한다.
- 13쪽 전체를 PNG로 렌더링해 한글 깨짐, 잘림, 겹침, 빈 페이지가 없음을 확인했다.
- 프론트 테스트가 정책 화면의 공개 경로와 PDF 해시를 고정한다.
- 이전 `2026-07-18-r2` PDF·릴리스는 `archive/`에 보존하고 기본 서비스 동선에서는 제외한다.

## 4. 외부 운영자료 참고 검증

- 공식 대구 구급 관제 원문 2,010행의 SHA-256을 보존했다.
- 구급차 상태 이벤트 878행에서 차량별 `출동보고→현장도착보고` 400쌍을 재구성했다.
- 전체 중앙값은 4.0분, 90백분위는 10.0분이다.
- 07~09시·10~16시·17~19시의 중앙값은 모두 5.0분이고, 90백분위는 각각 8.0·10.0·11.4분이다.
- 이 결과는 상단 지연 분포의 시간 민감도를 보여 주는 **보조 근거**다. 사고 좌표·이송병원·환자 현장→병원 구간이 없으므로 정책 ETA의 직접 오차 검증으로 사용하지 않는다.

## 5. 재현성이 보장하는 것과 보장하지 않는 것

### 보장하는 것

- 커밋된 원천·처리 파일로 정책 릴리스와 공개 PDF를 같은 내용으로 다시 만들 수 있다.
- 150개 행정동·25개 기관·9개 후보·5,100개 경로의 키·개수·해시·산식 계약이 드리프트하면 검증이 실패한다.
- VDI 구성요소 상관, 대안 순위 민감도, KPI, 외부 관제 참고 집계를 코드로 재산출할 수 있다.

### 보장하지 않는 것

- 행정동 중심점이 실제 환자 발생 위치를 대표한다는 것
- 단일 시점 일반 차량 ETA가 구급차 이송시간을 대표한다는 것
- 병상·의료진·진료과·수용 가능성 또는 후보 부지의 건축 가능성
- 후보군 내부 정확해가 대구 전역의 전역 최적해라는 것
- 분석 결과가 실제 정책 시행 효과나 인과관계를 입증한다는 것

프로젝트의 정확한 기술 범주는 예측 AI 모델이 아니라 **공간분석·시설입지 최적화 의사결정 지원**이다.
