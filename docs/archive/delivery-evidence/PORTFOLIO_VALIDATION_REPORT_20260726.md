# 포트폴리오 검증 보고서

## 1. 판정

**판정: 설명 가능한 포트폴리오 산출물과 의존성 보안·E2E 종료 조치의 로컬 검증 완료**

2026-07-26 추가 비기능 검증에서 탐지된 프론트 운영 의존성 High advisory는 PostCSS 8.5.18과 React Router 8.3.0 적용, `react-router-dom` 제거로 조치했다. 단위·E2E 기능 시나리오·Windows 테스트 서버 자동 종료·린트·타입·빌드와 온라인 보안 감사 재검증을 통과했다. 상세 판정은 `docs/reports/TEST_REPORT_20260726.md`를 따른다.

Golden Data Lab의 코드·문서·산출물은 이번 생성과 검증 범위에서 제외했다. 이 보고서는 Golden Governance 현재 저장소의 검증된 정책 릴리스, EDA, 데이터 품질, KPI, 서비스 화면만 다룬다.

## 2. 최종 산출물

| 구분 | 경로 | 결과 |
|---|---|---|
| 포트폴리오 전달 패키지 | `output/golden-governance-portfolio-package-20260726.zip` | 350개 항목, CRC 검사 통과 |
| 프로젝트 포트폴리오 정본 | `output/pdf/golden-governance-portfolio-20260726.pdf` | 12쪽, 695,907 bytes |
| 서비스 공개 사본 | `frontend/public/data/reports/daegu-golden-time-policy-analysis-report.pdf` | 정본과 동일 바이트 |
| 실행형 EDA | `analysis/golden_governance_eda.ipynb` | 코드 셀 5개 모두 실행·출력 보존 |

정본과 공개 사본의 SHA-256은 모두 다음과 같다.

```text
30DBF4FCEF4A0C2922BB1E99745F3A122C258111A63578BD80053C82B8ECFB20
```

실행형 EDA 노트북의 SHA-256은 다음과 같다.

```text
21548372682330139A9A7086FAA023F163B5AD7C38548BBB8D9F9BFAA0B7E2CC
```

## 3. 근거 입력

| 입력 | SHA-256 |
|---|---|
| `data/processed/policy_release.json` | `D7B0658C62EC2E89465BC8EBF266BB5FD198461C5D9E8D5DA2C44D5B3B33CFBC` |
| `data/processed/actual_road_accessibility_matrix.json` | `D87CB9E1A6B9E3E3C1884B54805B705C5E174BB66A02E8EDE0C74AE26E4CA5E6` |

PDF 생성기는 입력을 읽기 전에 좌표·키·경로 수·VDI·최근접 기관·25+9개 경로 계약을 검사하고, KPI를 공통 계산 모듈에서 다시 산출한다.

## 4. 문서 구성과 시각 검증

포트폴리오는 다음 12쪽으로 구성했다.

1. 표지와 데이터 규모
2. 한 장 요약
3. 시민·정책 문제와 범위
4. 아키텍처와 정본 경계
5. 데이터 품질 판정
6. EDA와 VDI 구조적 민감도
7. 기존 기관을 포함한 ETA·15분·30분 전후 KPI
8. 후보 도출 방법론
9. 시민 화면
10. 정책 화면
11. 엔지니어링 검증
12. 3분 데모 흐름과 한계

12쪽 전체를 PNG로 렌더링한 연락판을 검수했고, KPI·시민 화면·정책 화면·한계 페이지는 원본 해상도로 추가 확인했다. 한글 깨짐, 텍스트·표·차트 잘림, 페이지 누락은 발견되지 않았다.

## 5. 재현성 검증

| 대상 | 반복 | 결과 |
|---|---:|---|
| `scripts/generate_portfolio_pdf.py` | 연속 2회 | PDF SHA-256 동일 |
| EDA 생성 후 `scripts/execute_eda_notebook.py` | 연속 2회 | 실행 노트북 SHA-256 동일 |
| 정본 PDF → 공개 사본 동기화 | 생성 시마다 | 바이트 단위 동일 |

CI의 노트북 검증은 운영체제별 Matplotlib·폰트 렌더링에 따라 달라지는 `image/png` 바이트를 제외하고 셀 종류·소스 구조를 커밋본과 비교한다. 모든 코드 셀이 실제 출력까지 남겼는지는 실행기가 별도로 강제하며, 정책 릴리스 두 사본과 EDA Markdown은 계속 바이트 단위로 비교한다.

PDF 메타데이터는 재현성을 위해 고정했으며, PDF는 `.gitattributes`에서 바이너리로 지정해 줄바꿈 변환과 텍스트 diff 오판을 방지했다.

PDF 생성에는 프로젝트 밖 기존 임시 도구 환경의 ReportLab 5.0.0과 Pillow 12.3.0을 사용했다. 노트북은 로컬 `nbformat`이 없을 때 Jupyter 커널 프로토콜로 실행하는 fallback을 사용했다. 어느 쪽도 애플리케이션 런타임 의존성에는 추가하지 않았다.

## 6. 회귀 검증

| 검증 | 결과 |
|---|---|
| 분석 단위 테스트 | 14 passed |
| 백엔드 단위·통합 테스트 | 47 passed |
| 프론트 단위 테스트 | 21 passed |
| 프론트 E2E·종료 정리 | 2 passed, 테스트 Vite PID 자동 종료 |
| ESLint | PASS |
| TypeScript | PASS |
| Vite 프로덕션 빌드 | PASS |
| 정책 품질 계약 검사 | PASS |
| KPI 독립 재계산 | PASS |
| `git diff --check` | PASS |
| 로컬 프로덕션 성능 | 3회 412.4~443.1ms, 임시 3초 기준 PASS |
| Python 의존성 보안 | 알려진 취약점 0건 |
| 프론트 의존성 보안 | 안전 버전 적용, 오프라인 advisory 감사 0건 |

프론트 단위 테스트는 샌드박스의 상위 디렉터리 읽기 제한 때문에 최초 설정 로딩이 차단됐으나, 같은 명령을 승인된 실행 환경에서 다시 수행해 21개 전부 통과했다. 제품 코드 실패로 집계하지 않는다.

전달 패키지에는 README, 두 대표 화면, 포트폴리오·최종 테스트 검증 보고서, 정본·공개 PDF, 실행형 EDA, 프론트·백엔드·분석 소스를 포함했다. `.env`, `.git`, 의존성·가상환경·캐시·빌드·임시 디렉터리와 `golden-data-lab/`은 포함하지 않았다.

## 7. 설명 시 반드시 유지할 한계

- ETA는 119 이송시간이 아니라 단일 수집 시점의 일반 차량 경로 ETA다.
- 병상·의료진·실제 환자 수용 가능성과 실제 환자 흐름은 최적화 모델에 포함되지 않았다.
- p-median·MCLP 결과는 안정 후보 9곳 안의 1~3개 조합 비교다.
- 병원 운영정보는 API로 갱신할 수 있지만 현재 상태 테이블에서는 2026-07-18 이후 성공 기록을 확인하지 못했다. 이 운영 확인 상태는 정적 정책분석의 검증 상태와 분리한다.
- 후보는 현장조사 우선순위이며 확정 부지나 시설 신설안이 아니다.
