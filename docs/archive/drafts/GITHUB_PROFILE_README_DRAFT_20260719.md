# GitHub 프로필 README 초안

> 이 문서는 향후 생성할 `ssg-sak/ssg-sak` 저장소의 `README.md` 초안이다. 현재 프로젝트 저장소의 README가 아니다.

---

# 공공데이터로 시민 서비스와 정책분석을 연결합니다

Python 기반 데이터 분석과 React·FastAPI 서비스 구현을 함께 학습하고 있습니다. 데이터를 화면에 표시하는 데서 끝내지 않고, 출처·기준 시점·결측·분석 한계를 기록하며 재현 가능한 결과를 만드는 데 관심이 있습니다.

## 대표 프로젝트

### 대구 골든타임

시민용 응급의료 탐색 서비스와 골든 거버넌스 정책분석 엔진을 결합한 개인 프로젝트입니다.

- 현재 위치 기반 응급의료기관 탐색, 전화, 길찾기, 최근 조회 병상정보
- 대구 150개 행정동과 25개 응급 관련 기관의 접근성 분석
- 9개 정책 후보지와 5,100개 도로 경로를 사용한 자원배치 비교
- React, TypeScript, FastAPI, Python, 공공 API, GitHub Actions 활용
- 의료정보의 `0`, `미확인`, `오래됨`을 구분하고 정책 모델의 한계를 명시

[저장소](https://github.com/ssg-sak/golden-project) · [배포 서비스](https://ssg-sak.github.io/golden-project/)

### Golden Data Lab

대구 골든타임의 검증 정책 스냅샷을 데이터 분석가 관점에서 다시 탐색하는 독립 프로젝트입니다.

- 150개 행정동·25개 기관·9개 후보·5,100개 경로 데이터 계약 검증
- Python EDA와 데이터 품질 점검
- SQL 분석과 Power BI 시각화는 현재 구축 예정
- 실시간 데이터가 아닌 고정된 검증 스냅샷을 사용

[저장소](https://github.com/ssg-sak/golden-data-lab)

## 사용 기술

- Data: Python, Pandas, GeoPandas, scikit-learn, Jupyter
- Backend: FastAPI, SQLite, REST API
- Frontend: React, TypeScript, Vite
- Quality: Pytest, Vitest, ESLint, GitHub Actions
- Learning: SQL, PostgreSQL, Power BI

## 작업 원칙

- 확인되지 않은 기능이나 수치를 완료된 결과처럼 쓰지 않습니다.
- 데이터 출처와 기준 시점을 기록합니다.
- 분석 결과와 실제 의료·정책 결정을 구분합니다.
- AI 도구는 초안, 오류 분석, 반복 점검에 활용하고 최종 판단과 검증 책임은 직접 확인합니다.

## 현재 집중하는 일

1. Golden Data Lab Python EDA 완성
2. SQL 분석과 Python 결과 교차 검증
3. Power BI 대시보드 설계
4. 대표 프로젝트의 분석 방법과 검증 과정을 직접 설명하는 면접 자료 정리

---

## 게시 전 확인

- GitHub 프로필의 표시 이름과 한 줄 소개 입력
- `ssg-sak/ssg-sak` 공개 저장소 생성
- 이 초안에서 안내 문구인 첫 줄과 이 확인 섹션을 제거
- SQL·Power BI 상태가 바뀌면 `예정` 표현 갱신
- 실제 연락 수단을 공개할 경우 본인이 선택한 주소만 추가
