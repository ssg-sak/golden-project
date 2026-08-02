# 대구 골든타임

시민의 응급의료기관 탐색과 행정의 의료 접근성 분석을 연결한 공공데이터 기반 웹서비스입니다.

[배포 서비스](https://ssg-sak.github.io/golden-project/) ·
[정책분석 보고서](data/reports/daegu-golden-time-policy-analysis-report.pdf) ·
[검증 기록](docs/reports/DEMO_VALIDATION_REPORT_20260724.md)

> 병상 정보는 조회 시점의 참고값이며 실제 진료·수용 가능 여부를 보장하지 않습니다.
> 응급상황에서는 119·1339 또는 의료기관에 직접 확인해야 합니다.

## 프로젝트 한눈에 보기

| 구분 | 내용 |
|---|---|
| 시민 구조망 | 현재 위치에서 가까운 응급의료기관, 거리·예상 이동시간, 전화·길찾기와 최근 조회 정보 제공 |
| 골든 거버넌스 | 150개 행정동의 소아·고령층 의료 접근성 분석과 자원배치 후보 비교 |
| 분석 범위 | 2026.06 인구, 기준 기관 25개, 안정 후보 9곳, 일반 차량 도로 경로 5,100건 |
| 검증 방식 | 민감도 분석, 데이터 계약, 자동 테스트, 실행형 EDA, SHA-256 기반 정책 릴리스 |

## 주요 기능

| 시민 구조망 | 골든 거버넌스 |
|---|---|
| 위치 기반 병원 탐색 | 소아·고령층 모드별 취약지역 분석 |
| 거리·예상 이동시간·전화·길찾기 | VDI와 실제 도로 ETA 시각화 |
| 최근 조회 응급실·병상정보 | K-Means 후보 민감도 분석 |
| API 장애 시 기본정보 유지 및 미확인 안내 | 후보군 내부 p-median·MCLP 조합 비교 |

## 서비스 화면

| 시민 구조망 | 골든 거버넌스 |
|---|---|
| ![시민 구조망 화면](docs/images/citizen-map.png) | ![골든 거버넌스 화면](docs/images/golden-governance.png) |

데스크톱·모바일 반복 검증과 캡처 조건은
[공개 데모 검증 보고서](docs/reports/DEMO_VALIDATION_REPORT_20260724.md)에서 확인할 수 있습니다.

## 분석 흐름

```mermaid
flowchart LR
    A[공공데이터] --> B[정제·품질검사]
    B --> C[VDI·후보 민감도 분석]
    C --> D[도로 ETA·후보 조합 비교]
    D --> E[정책 릴리스]
    E --> F[FastAPI]
    F --> G[React 웹서비스]
```

### 검증된 분석 기준

| 항목 | 현재 검증본 |
|---|---|
| 행정동·기준 기관·후보 | 150개 · 25개 · 9곳 |
| 후보 민감도 분석 | 소아 240회 · 어르신 240회 |
| 도로 경로 | 5,100건 성공 · 누락 0건 |
| 3개 후보 p-median 시나리오 | 가중 평균 ETA: 소아 약 15.9→13.0분, 어르신 약 11.9→11.2분 |
| 같은 시나리오의 15분 커버율 | 소아 약 42.9→66.3%, 어르신 약 79.4→84.2% |

분석 결과는 안정 후보 9곳 안의 모델 비교입니다. 확정 부지, 실제 환자 이송 성과 또는 대구 전역 좌표를 대상으로 한 최적해를 의미하지 않습니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 데이터·분석 | Python, pandas, GeoPandas, scikit-learn |
| 백엔드 | FastAPI, SQLite |
| 프론트엔드 | React, TypeScript, Zustand, Tailwind CSS |
| 검증·배포 | Pytest, Vitest, Playwright, GitHub Actions, GitHub Pages, Render |

## 신뢰성과 안전장치

- 최근 조회 운영정보와 재현 가능한 정적 정책 분석본을 분리합니다.
- 외부 API 실패 시 병상값을 `미확인`으로 표시하고 기본 병원정보·전화·길찾기를 유지합니다.
- 데이터 계약을 통과한 결과만 단일 정책 릴리스로 승격합니다.
- 서버 비밀값은 환경 변수로 관리하고 `.env`는 Git에서 제외합니다.
- 2026-07-26 기준 분석 14건, 백엔드 47건, 프론트 21건과 E2E 2건이 통과했습니다.

상세 결과는 [최종 테스트 보고서](docs/reports/TEST_REPORT_20260726.md)를 참고해 주세요.

## 로컬 실행

요구 환경: Node.js 22.22 이상, Python 3.11

```bash
# 프론트엔드
npm ci --prefix frontend
npm run dev
```

```bash
# 백엔드
cd backend
python -m venv .venv

# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

환경 변수는 [`.env.example`](.env.example)을 참고합니다.

## 구현 범위

기획, 데이터 파이프라인, 분석, 프론트엔드·백엔드, 검증과 배포를 하나의 프로젝트 흐름으로 구현했습니다.

- 문제 정의와 VDI·후보 검증 기준 설계
- 공간 데이터 정제, 민감도 분석과 도로 ETA 파이프라인 구현
- 시민·정책 화면 및 API 장애 대응 구조 구현
- 테스트·데이터 계약·재현성 검증과 문서화

## 한계

- ETA는 단일 수집 시점의 일반 차량 기준이며 119 이송시간이 아닙니다.
- VDI는 프로젝트 내부의 상대 비교 지표이며 의료적 위험함수나 법정 기준이 아닙니다.
- 병상·의료진·실제 환자 흐름과 부지·예산·법적 조건은 후보 모델에 포함되지 않았습니다.
- 운영정보는 공공 API 갱신 시점과 실제 현장 상황 사이에 차이가 있을 수 있습니다.

## 상세 문서

- [문서 안내](docs/README.md)
- [접근성 분석 방법론](docs/core/methodology.md)
- [데이터 사전](docs/core/data_dictionary.md)
- [프로젝트 구조](docs/core/PROJECT_STRUCTURE.md)
- [검증 및 분석 기록](docs/reports/)
