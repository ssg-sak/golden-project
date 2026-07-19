# Golden Data Lab 저장소 분리 계획 및 진행 보고서

최종 갱신: 2026-07-19

## 1. 결정

`golden-data-lab/`은 대구 골든타임 웹서비스의 하위 기능이 아니라 **별도 데이터분석가 포트폴리오 저장소**로 분리한다.

- 서비스 저장소: `ssg-sak/golden-project`
- 분리 대상 저장소: `ssg-sak/golden-data-lab`
- 권장 공개 범위: Public
- 분리 방식: `git subtree split`
- 원본 폴더 삭제 시점: 새 저장소 이관과 독립 실행 검증 이후

기존 폴더를 먼저 삭제하지 않는다. 새 저장소 생성, 이력 이전, 파일 확인, 실행 검증, 상호 링크 확인이 끝난 뒤 별도 PR에서만 제거한다.

## 2. 책임 분리

| 저장소 | 책임 |
|---|---|
| `golden-project` | 시민용 응급의료 화면, FastAPI, 외부 API·캐시, 정책분석 엔진, 검증 정책 공개본 |
| `golden-data-lab` | 고정 정책 스냅샷을 사용한 SQL·Python EDA·Power BI 학습과 분석 포트폴리오 |

데이터랩은 실시간 병상 조회나 시민용 지도 서비스를 복제하지 않는다. 특정 시점의 검증 스냅샷을 재현하고 분석하는 데 집중한다.

## 3. 사전 조사

분리 전 `golden-data-lab/`은 다음 상태였다.

- 추적 파일 15개
- 실내용 문서 3개와 EDA 노트북 1개
- 나머지는 향후 SQL·Power BI·데이터 영역을 위한 `.gitkeep` 골격
- 관련 변경 이력 3개
- API 키, 토큰, 비밀번호 등 비밀정보 패턴 미검출
- 데이터 파일은 포함하지 않고 상위 저장소의 `policy_release.json`을 참조

조사 결과 독립 프로젝트의 방향은 적절하지만, 기존 상태만으로는 데이터 원천 고정과 독립 실행 경로가 부족했다.

## 4. 독립 저장소 준비 내용

이관용 중간 커밋 `7353fbf`에서 다음을 준비했다.

- 프로젝트 목적·책임·현재 구현 범위를 명확히 한 README
- 완료·예정·보류를 분리한 ROADMAP
- 구현 전 SQL 영역을 완료 기능처럼 보이지 않도록 상태 명시
- 고정 원천 커밋에서 정책 릴리스를 내려받는 스크립트
- 원시 파일 SHA-256과 150·25·9·5,100 데이터 계약 검증
- 데이터 계보와 정책·의료 해석 한계 문서
- Python 분석 의존성 파일
- 노트북 입력 경로를 독립 저장소의 `datasets/policy_release.json`으로 변경
- 환경·다운로드·Power BI 산출물을 제외하는 `.gitignore`

정책 스냅샷은 저장소에 중복 커밋하지 않고 다음 고정 원천에서 내려받는다.

```text
원천 저장소: ssg-sak/golden-project
원천 커밋: fc24068bff34ca475d4761563ab15b172d66ece3
원천 파일: frontend/public/data/policy_release.json
원시 SHA-256: d7b0658c62ec2e89465bc8ebf266bb5fd198461c5d9e8d5da2c44d5b3b33cfbc
```

## 5. 이력 보존 결과

`git subtree split --prefix=golden-data-lab`으로 독립 루트 이력을 생성했다.

```text
4258224 feat: add emergency condition filters and road-time policy model
857cf8b feat: 정책 릴리스와 데이터 무결성 파이프라인 반영
b436c14 fix: 정책 릴리스 계보와 안전 안내 강화
7d5db88 docs: 데이터랩 독립 저장소 기반 정비
```

새 저장소에서는 `golden-data-lab/`이 중첩 폴더가 아니라 저장소 루트가 된다.

## 6. 검증 결과

- 다운로드 스크립트 Python 구문 검사 통과
- Jupyter Notebook JSON 구조 검사 통과
- 고정 HTTPS 원천 다운로드 성공
- 내려받은 파일 SHA-256 일치
- 행정동 150개, 기관 25개, 후보 9개 계약 통과
- 요청·성공 경로 5,100개, 누락 0개 계약 통과
- `git diff --check` 통과

## 7. 현재 진행 상태

| 단계 | 상태 |
|---|---|
| 대상 조사와 비밀정보 점검 | 완료 |
| 독립 README·로드맵·데이터 계보 준비 | 완료 |
| 고정 스냅샷 다운로드·검증 | 완료 |
| Git 이력 분리 | 완료 |
| `ssg-sak/golden-data-lab` 원격 저장소 생성 | 대기 |
| 독립 이력 push와 원격 파일 검증 | 대기 |
| 양쪽 README 상호 링크 | 대기 |
| `golden-project`의 기존 폴더 제거 | 대기 |

원격 생성이 대기 중인 이유는 로컬 GitHub CLI의 `ssg-sak` 인증이 만료됐고, 현재 세션에서 사용할 수 있는 로그인 브라우저가 없기 때문이다. 인증을 우회하거나 토큰을 파일에 저장하지 않았다.

## 8. 남은 실행 절차

1. GitHub CLI 인증을 복구한다.

   ```bash
   gh auth login -h github.com -p https -w
   ```

2. 빈 공개 저장소 `ssg-sak/golden-data-lab`을 생성한다.
3. 추출된 `export/golden-data-lab` 이력을 새 저장소 `main`으로 push한다.
4. 새 저장소에서 README·노트북·다운로드 검증을 재확인한다.
5. 두 저장소 README에 상호 링크를 추가한다.
6. 별도 Draft PR에서 기존 `golden-data-lab/` 폴더를 제거한다.

## 9. 삭제·복구 원칙

- 새 저장소 검증 전에는 원본 폴더를 삭제하지 않는다.
- 제거 커밋은 기능 변경과 섞지 않는다.
- 새 저장소의 기본 브랜치와 이력 SHA를 기록한다.
- 이관 실패 시 기존 폴더를 유지하고 다시 시도한다.
- 과거 데이터랩 이력은 원본 저장소와 분리 저장소 양쪽 Git 이력에서 복구할 수 있게 한다.

## 10. 후속 개발 우선순위

1. EDA 노트북 전체 재실행과 출력 검증
2. 결측·중복·이상치 점검표 추가
3. PostgreSQL 스키마와 분석 쿼리 구현
4. SQL과 Python 집계 교차 검증
5. Power BI 데이터 모델과 대시보드 제작
6. 통합 분석 보고서와 재현 기록 작성

SQL과 Power BI는 아직 계획 단계다. 구현 전에는 포트폴리오에서 완료 결과로 소개하지 않는다.
