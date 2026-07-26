# Golden Governance 최종 테스트 결과 보고서

## 1. 기본 정보

| 항목 | 내용 |
|---|---|
| 작업명 | 공개 포트폴리오 및 현재 저장소 최종 검증 |
| 테스트 목적 | 기능·데이터·모델·E2E·성능·보안 상태를 실제 실행 결과로 판정 |
| 대상 브랜치·커밋 | `agent/readme-portfolio-summary` / 기준 커밋 `910e6d7` + 현재 작업 트리 |
| 테스트 일시 | 2026-07-26 14:45, Asia/Seoul |
| 최종 판정 | **조건부 통과** |

Golden Data Lab은 이 프로젝트와 별개이므로 테스트·판정·패키징 범위에서 제외했다.

## 2. 테스트 환경

| 구분 | 값 |
|---|---|
| 운영체제 | Windows |
| 프론트엔드 | Node.js 24.16.0, npm 11.13.0 |
| 백엔드·분석 | Python 3.11.0 |
| 브라우저 자동화 | Playwright 1.61.1, headless Chromium |
| 분석 기준 | 2026.06 인구, 일반 차량 도로 ETA, 2026-07-18-r2 정책 릴리스 |
| 병원 등 운영 원천 | API 재수집 가능, 현재 상태 테이블에서는 2026-07-18 이후 갱신 성공 미확인 |

## 3. 테스트 결과 요약

| 구분 | 전체 | 통과 | 실패 | 차단 | 미실행 |
|---|---:|---:|---:|---:|---:|
| 단위 테스트 | 60 | 60 | 0 | 0 | 0 |
| 통합 테스트 | 8 | 8 | 0 | 0 | 0 |
| E2E·수동 테스트 | 5 | 4 | 0 | 0 | 1 |
| 데이터·모델 검증 | 18 | 18 | 0 | 0 | 0 |
| 성능·보안 검증 | 6 | 5 | 0 | 0 | 1 |
| **합계** | **97** | **95** | **0** | **0** | **2** |

서비스 E2E 2건과 의존성 보안 조치, Windows 테스트 서버 자동 종료까지 통과했다. 미실행 2건은 현재 공개 배포본의 브라우저 재검증과 공공망 성능 측정이다.

## 4. 상세 검증 결과

| ID | 유형 | 검증 항목 | 건수 | 실제 결과 | 상태 |
|---|---|---|---:|---|---|
| TC-U-01 | 단위 | 프론트 상태·추천·병상·좌표 경계 | 21 | 5개 파일, 21 passed | PASS |
| TC-U-02 | 단위 | 백엔드 대시보드·API 병합·스케줄러·병상 폴러·Render 저장상태·정책·인구 공표주기·호출 예산 계약 | 39 | 39 passed | PASS |
| TC-I-01 | 통합 | 백엔드 데이터 파이프라인 통합 | 8 | 8 passed | PASS |
| TC-E-01 | E2E | 응급실 찾기·정책 탭·119·1339 안전 안내 | 1 | 약 1.0초, 표시 확인 | PASS |
| TC-E-02 | E2E | 서비스 소개 화면 이동과 핵심 제목 | 1 | 약 0.84초, 이동 확인 | PASS |
| TC-E-03 | 수동 | 포트폴리오 PDF 12쪽 렌더링 검수 | 1 | 한글·차트·표·이미지 잘림 없음 | PASS |
| TC-E-04 | E2E 인프라 | Playwright 종료 후 Vite 프로세스 정리 | 1 | 2 passed 후 테스트 PID·PID 파일 자동 제거, 기존 개발 서버만 유지 | PASS |
| TC-E-05 | 수동 | 현재 변경 반영 후 공개 GitHub Pages 재검증 | 1 | 아직 병합·배포 전 | NOT_RUN |
| TC-D-01 | 데이터·모델 | 분석 단위 테스트 | 14 | 14 passed | PASS |
| TC-D-02 | 데이터 | 좌표·키·경로·VDI·최근접 기관·보정 집중도·25+9 계약 | 1 | 검증 스크립트 통과 | PASS |
| TC-D-03 | KPI | ETA·15분·30분 KPI 독립 재계산 | 1 | 보고서 값과 일치 | PASS |
| TC-D-04 | 재현성 | EDA 생성·실행 노트북 반복 생성 | 1 | 코드 셀 5개 실행, 반복 SHA-256 `21548372…E2CC` 동일 | PASS |
| TC-D-05 | 재현성 | 포트폴리오 PDF 반복 생성과 공개 사본 동기화 | 1 | 반복 SHA-256 및 두 PDF 바이트 동일 | PASS |
| TC-N-01 | 성능 | 프로덕션 빌드 산출물 규모 | 1 | JS 571,959 bytes, CSS 85,061 bytes, GeoJSON 1,783,521 bytes | PASS |
| TC-N-02 | 성능 | 로컬 프로덕션 핵심 화면 표시 3회 | 1 | 412.4~443.1ms, 중앙값 424.1ms | PASS |
| TC-N-03 | 보안 | 추적 파일 비밀값 대표 패턴 검사 | 1 | 실제 `.env`·개인키·대표 토큰 패턴 0건 | PASS |
| TC-N-04 | 보안 | Python 운영 의존성 `pip-audit` | 1 | 알려진 취약점 0건 | PASS |
| TC-N-05 | 보안 | 프론트 운영 의존성 `npm audit --omit=dev` | 1 | 안전 버전 반영 후 오프라인 advisory 감사 0건 | PASS |
| TC-N-06 | 성능 | 실제 공공망·저사양 모바일 성능 | 1 | 배포 후 측정 필요 | NOT_RUN |

## 5. 자동 검증 실행 기록

| 대상 | 실행 명령 | 결과 |
|---|---|---|
| 프론트 단위 테스트 | `npm.cmd test --prefix frontend` | 21 passed |
| 백엔드 단위 테스트 | `backend/`에서 `python -m pytest ../tests/unit/backend -q` | 39 passed |
| 백엔드 통합 테스트 | `backend/`에서 `python -m pytest ../tests/integration/backend -q` | 8 passed |
| 분석 테스트 | `python -m pytest tests/unit/ai_model -q` | 14 passed |
| 프론트 E2E | `npm.cmd run test:e2e --prefix frontend` | 2 passed, 테스트 Vite 프로세스 자동 종료 |
| ESLint | `npm.cmd run lint --prefix frontend` | PASS |
| TypeScript | `npm.cmd run typecheck --prefix frontend` | PASS |
| 프로덕션 빌드 | `npm.cmd run build --prefix frontend` | PASS |
| 정책 품질 계약 | 분석 테스트에서 `validate_policy_analysis` 실행 | PASS |
| VDI 대안 민감도 | `python scripts/vdi_sensitivity.py` 및 분석 테스트 | PASS |
| EDA 실행 | `python scripts/execute_eda_notebook.py` 연속 2회 | 코드 셀 5개, 반복 SHA-256 동일 |
| KPI 재계산 | `python scripts/kpi_metrics.py` | PASS |
| lockfile 재설치 | `npm.cmd ci --prefix frontend --ignore-scripts --no-audit --no-fund` | PASS |
| 프론트 보안 감사 | `npm.cmd audit --prefix frontend --omit=dev --audit-level=high --offline` | PASS, 0건 |
| Python 보안 감사 | 임시 격리 `pip-audit -r backend/requirements.txt` | PASS, 0건 |

## 6. 성능 결과의 해석 범위

로컬 프로덕션 빌드의 핵심 화면 표시 임시 기준을 3초 이하로 두었고, 새 브라우저 컨텍스트 3회가 모두 통과했다.

| 반복 | 핵심 화면 표시 | DOMContentLoaded | 전송량 |
|---:|---:|---:|---:|
| 1 | 443.1ms | 52.3ms | 122,758 bytes |
| 2 | 412.4ms | 33.9ms | 122,758 bytes |
| 3 | 424.1ms | 37.8ms | 122,758 bytes |

이 수치는 로컬 loopback 기준이며 CDN 글꼴, 공공망 지연, 저사양 모바일 렌더링을 대표하지 않는다. 배포 후 Lighthouse 또는 동등한 실제 브라우저 측정이 필요하다.

## 7. 보안 감사 결과

### Python

`backend/requirements.txt`를 `pip-audit 2.10.1`로 검사한 결과 알려진 취약점은 0건이었다. 도구는 프로젝트 밖 임시 폴더에서 실행했으며 런타임 의존성에 추가하지 않았다.

### 프론트엔드

최초 `npm audit --omit=dev`에서 탐지된 High advisory를 다음과 같이 조치했다. 7.11.0 고정안은 당시 RSC advisory 범위를 피했지만 현재 advisory 피드에서 일반 라우팅·SSR 계열 High 취약점이 추가 확인돼 최종안에서 제외했다.

| 패키지 | 변경 전 | 변경 후 | advisory | 판정 |
|---|---:|---:|---|---|
| `postcss` | 8.5.16 | 8.5.18 override | [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | 패치 버전 적용 |
| `react-router` | 7.18.1 | 8.3.0 exact | [GHSA-qwww-vcr4-c8h2](https://github.com/advisories/GHSA-qwww-vcr4-c8h2) 및 현재 7.x advisory | 수정 버전 적용 |
| `react-router-dom` | 7.18.1 | 제거 | v8부터 DOM API를 `react-router`가 직접 제공 | 중복·취약 의존 경로 제거 |

React Router 8.3.0의 런타임 조건에 맞춰 Node.js 최소 버전을 22.22.0으로 명시하고 GitHub Actions의 검증·배포 런타임도 같은 버전으로 고정했다. `npm ci` 후 단위 21건, E2E 2건, ESLint, TypeScript, 프로덕션 빌드가 모두 통과했고 온라인 `npm audit --omit=dev --audit-level=high` 결과는 취약점 0건이다.

## 8. 발견 결함

| 결함 ID | 심각도 | 현상 | 영향 | 상태 |
|---|---|---|---|---|
| BUG-QA-001 | P1 | 프론트 운영 의존성 High advisory 탐지 | 안전 버전 적용 전 CI 보안 감사 실패 | 수정·재검증 완료 |
| BUG-QA-002 | P2 | Windows에서 E2E 2건 통과 후 Playwright·Vite 프로세스가 종료되지 않음 | 서비스 기능은 정상이나 로컬 자동화 명령이 끝나지 않음 | 수정·재검증 완료 |
| BUG-QA-003 | P2 | E2E가 이전 메뉴명 `시민 구조망`, `공식 소개`를 참조 | 현재 UI에서 assertion 실패 | 수정·재검증 완료 |

## 9. 최종 판정

**최종 판정: 조건부 통과**

기능, 데이터, 모델, KPI, 단위 테스트, E2E 시나리오와 자동 종료, 린트, 타입 검사와 프로덕션 빌드는 모두 통과했다. High advisory의 영향 버전은 제거했고 오프라인 감사는 0건이다. 공개 배포본 재검증과 GitHub Actions 온라인 audit이 아직이므로 최종 판정은 조건부 통과로 유지한다.

## 10. 다음 한 가지

변경을 GitHub에 병합·배포한 뒤 공개 서비스와 GitHub Actions 온라인 audit을 확인한다.
