# 포트폴리오 Day 1 상태 점검

확인일: 2026-07-19

## 결론

팀프로젝트는 이 작업공간의 범위에서 제외한다. 현재 개인 포트폴리오는 `대구 골든타임`과 `Golden Data Lab` 두 축으로 진행한다. 저장소 정리는 `main`에 반영됐고, Golden Data Lab 독립 저장소는 정상이다. 다만 기존 분리 PR #17은 대상 브랜치 오류로 `main`에 포함되지 않아 복구 Draft PR #18을 만들었다.

## GitHub 확인 결과

| 확인 항목 | 결과 |
|---|---|
| `golden-project` PR #16 | 병합 완료 (`refactor: 저장소 레거시 파일과 구조 문서 정리`) |
| `golden-project` PR #17 | 병합됐지만 대상이 `agent/repository-cleanup`이어서 `main`에는 미반영 |
| `golden-project` PR #18 | 최신 `main` 기준 복구 Draft PR, 사용자 검토 대기 |
| Golden Data Lab 저장소 | `https://github.com/ssg-sak/golden-data-lab` 공개 저장소 확인 |
| Golden Data Lab 기본 브랜치 | `main` |
| Golden Data Lab README | 서비스 저장소와 책임 분리, 검증 스냅샷 기준 명시 확인 |
| Golden Data Lab ROADMAP | Python EDA → SQL → Power BI → 통합 보고서 순서 확인 |
| GitHub 프로필 표시 이름·소개 | 현재 비어 있음 |
| 프로필 README 저장소 | `ssg-sak/ssg-sak` 미생성 |
| `golden-project` README | 30초 요약·Golden Data Lab 직접 링크 로컬 반영 |
| 공개 링크 | 배포 서비스·Golden Data Lab 모두 HTTP 200 확인 |
| Golden Data Lab Python EDA | 로컬 독립 작업본 실행·검증 완료, 원격 게시 대기 |

## 확정한 진행 순서

1. GitHub 프로필 README 초안을 확정한다.
2. `golden-project` README와 배포 서비스의 설명·링크 정합성을 점검한다.
3. 대표 프로젝트 설명과 배포 링크를 최종 점검한다.
4. Golden Data Lab의 Python EDA 완료본을 원격 Draft PR로 게시한다.
5. 같은 질문을 SQL로 재현하고 Python 결과와 교차 검증한다.
6. Power BI 시각화는 검증된 분석 테이블을 기준으로 제작한다.

## 변경하지 않은 범위

- 프론트엔드·백엔드·분석 코드
- 정책 릴리스와 데이터 파일
- 배포 설정
- 로컬 `data/hospitals.db` 변경
- 별도 노트북에서 관리하는 팀프로젝트

## 다음 완료 조건

- 프로필 README 문구가 실제 구현·학습 상태와 일치한다.
- 대표작과 데이터랩 링크가 GitHub 첫 화면에서 바로 보인다.
- 구현 예정인 SQL·Power BI를 완료 기능으로 표현하지 않는다.
