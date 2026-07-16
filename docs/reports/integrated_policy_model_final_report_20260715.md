# 통합 정책 입지 모델 최종 구현 보고서

- 작성일: 2026-07-15
- 범위: K-Means 후보 생성부터 실제 도로망 p-median·MCLP 최적화와 프론트엔드 표시까지
- 상태: 구현 및 자동 검증 완료

## 1. 통합 목적

기존 모델은 취약 수요의 공간적 중심을 K-Means 후보로 제시하고 민감도 분석으로 반복 등장 후보를 분리했다. 이번 작업은 그 후보를 폐기하거나 별도 모델로 교체한 것이 아니라, 실제 도로 이동시간을 이용해 후보의 정책 효과를 다시 평가하고 여러 후보를 함께 선택할 때의 최적조합을 계산하는 후속 단계로 결합했다.

## 2. 최종 파이프라인

```text
공공데이터와 응급 관련 기관
-> 소아·고령층 수요 분리
-> K-Means 후보 생성
-> K, seed, 거리 조건 민감도 분석
-> 안정 후보 승격
-> 행정동-응급기관·후보지 Kakao 도로 ETA 수집
-> 영구 캐시와 도로 좌표 스냅
-> 실제 도로 ETA 기반 VDI
-> p=1~3 p-median·MCLP 모든 조합 탐색
-> 후보별 지표와 최적조합을 프론트엔드에 표시
```

재실행 명령:

```powershell
python ai-model\run_integrated_policy_pipeline.py
```

기존 캐시만 사용하는 오프라인 재현 명령:

```powershell
python ai-model\run_integrated_policy_pipeline.py --offline
```

## 3. 모델별 역할

| 단계 | 역할 | 최종 결정 여부 |
|---|---|---|
| K-Means | 취약 수요가 모인 후보 좌표 생성 | 후보 생성기 |
| 민감도 분석 | 조건 변화에도 반복되는 안정 후보 분리 | 후보 승격 기준 |
| 실제 도로 ETA | 직선거리 대신 도로 경로 이동 부담 측정 | 접근성 입력 |
| p-median | 취약인구 가중 평균 ETA가 최소인 조합 선택 | 목적함수별 최적조합 |
| MCLP | 15분·30분 안에 포함되는 인구가 최대인 조합 선택 | 목적함수별 최적조합 |
| 자원 시나리오 | 주변 전문의·장비 보강 검토 항목 제시 | 탐색용 참고값 |

## 4. 도로망 데이터

| 항목 | 결과 |
|---|---:|
| 행정동 | 150개 |
| 응급 관련 기관 | 24개 |
| 정책 후보 | 9개 |
| 전체 경로 요청 | 4,950개 |
| 정상 도로 경로 | 4,901개 |
| 경로 불가 | 49개 |
| 기준 응급기관 경로가 없는 행정동 | 0개 |

경로 불가 결과는 추정 이동시간으로 대체하지 않고 `unavailable`로 보존했다. 비도로 중심점은 주변 도로 좌표를 단계적으로 탐색하고 사용한 좌표 오프셋을 캐시에 기록했다.

## 5. 정책 대상 분리

| 모델 | 가중인구 |
|---|---:|
| 소아 | 0~9세 126,489명 |
| 고령층 | 65세 이상 529,421명 |

두 모델은 같은 후보 최적화 코드를 사용하지만 목적함수의 인구 가중치와 커버리지 분모를 분리했다.

## 6. 최적조합

| 대상 | 시설 수 | p-median | MCLP 15분 | MCLP 30분 |
|---|---:|---|---|---|
| 소아 | 1 | 4 | 1 | 1 |
| 소아 | 2 | 1, 4 | 1, 3 | 1, 3 |
| 소아 | 3 | 1, 4, 5 | 1, 3, 4 | 1, 2, 3 |
| 고령층 | 1 | 1 | 1 | 1 |
| 고령층 | 2 | 1, 3 | 1, 2 | 1, 2 |
| 고령층 | 3 | 1, 2, 3 | 1, 2, 3 | 1, 2, 3 |

목적함수가 다르면 최적조합도 다를 수 있다. 평균 이동시간을 줄이는 조합과 제한시간 내 인구를 늘리는 조합 중 하나를 절대적 정답으로 표현하지 않는다.

## 7. 프론트엔드 반영

- 취약 행정동 VDI를 Kakao 도로 ETA 기준으로 표시
- 후보 마커 상세에서 단일 후보의 평균 ETA 개선과 15분·30분 커버리지 표시
- 후보 상세에서 해당 후보가 포함된 `p=1~3` 최적조합 표시
- 지도 위 통합 요약 카드에서 시설 수를 전환하며 목적함수별 최적조합 비교
- 정책 데이터가 실제 도로 경로 스냅샷임을 명시

## 8. 재현성과 API 운영

- 좌표 조합 SHA-256 키로 경로 캐시
- 성공한 경로는 재호출하지 않음
- 50건 단위 원자적 체크포인트 저장
- 네트워크·429·5xx 재시도
- 입력 데이터 SHA-256 기록
- 오프라인 캐시 재생성 지원

## 9. 검증

- Python 문법 검사 통과
- 전체 도로 경로 수와 행렬 내부 경로 수 일치 확인
- 행정동별 응급 관련 기관 경로 저장 확인
- 소아·고령층 목적함수 인구 분리 확인
- 최적조합 결과와 프론트 후보 멤버십 일치 확인
- TypeScript 타입 검사 통과
- Vitest 5개 파일, 15개 테스트 통과
- Vite 프로덕션 빌드 통과
- 프론트 페이지와 최적화 JSON HTTP 200 확인

## 10. 남은 한계

- 도로 ETA는 수집 시점 Kakao 추천 경로의 스냅샷이다.
- 시간대가 달라지면 교통 ETA가 달라질 수 있다.
- 구급차 우선 통행과 실제 출동 기록은 반영하지 않는다.
- 현재 후보군 안에서는 정확 최적조합이지만 대구 전역 모든 좌표의 전역 최적해는 아니다.
- 실제 정책 결정에는 부지, 비용, 인력, 법적 기준과 전문가 검토가 추가로 필요하다.

## 11. 자동 리팩토링 및 배포 환경 구축 (2026-07-16 업데이트)

본 업데이트는 실무(Production) 수준의 서비스 구축을 목표로, 보안 및 아키텍처 구조를 전면 리팩토링한 결과입니다. 

### 11.1 프로젝트 전반적 구조 개선점 및 수정 사유
- **보안 이슈 (API Key 노출 위험)**: 공공데이터 API 키가 코드 내에 하드코딩되거나 프론트엔드로 노출될 위험이 있었습니다.
  - **개선**: `.env` 및 `os.getenv` 기반 환경 변수 관리로 통합하고, `.gitignore`를 통해 Github 업로드를 원천 차단했습니다. React는 외부 API를 직접 호출하지 않고 FastAPI만을 호출하도록 강제하였습니다.
- **아키텍처 (Layer 분리 미흡)**: Router 레벨에서 외부 API를 직접 호출하거나 로직이 혼재된 경우가 있었습니다.
  - **개선**: 외부 공공데이터 API 연동을 철저히 `Service Layer`(`data_go_kr_client.py` 등)로 이동시키고, Router(`hospitals.py`)는 오직 Service만 호출하도록 리팩토링했습니다.
- **예외 처리 및 안정성 (Timeout/Retry 부재)**: 네트워크 지연 시 프로세스가 행(hang)에 걸릴 위험이 존재했습니다.
  - **개선**: `tenacity` 라이브러리를 통해 Timeout 10초 설정 및 3회 Exponential Backoff 재시도 로직을 도입해 간헐적 공공 API 장애에도 견디도록 구성했습니다. 

### 11.2 파일별 변경 사항 (Diff Summary)

#### 1) `backend/app/services/api_clients/data_go_kr_client.py` (Service Layer 강화 및 Retry 도입)
**변경 사유**: 공공 API 응답 불안정성에 대비해 Retry 및 Timeout 적용
```diff
- import httpx
+ import httpx
+ from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

- static_response = await client.get(static_url, ...)
+ @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10), retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)))
+ async def fetch_static() -> httpx.Response:
+     return await client.get(static_url, timeout=10.0, ...)
+ static_response = await fetch_static()
```

#### 2) `backend/requirements.txt` (운영 및 복원력 패키지 추가)
**변경 사유**: 재시도 모듈 및 프로덕션 서버(gunicorn) 구성
```diff
+ tenacity>=8.2.0
+ gunicorn>=21.2.0
```

#### 3) `Dockerfile` & `docker-compose.yml` (Render 배포 준비)
**변경 사유**: Render 컨테이너 배포 규격화 및 포트 설정
- `Dockerfile (Backend)`: `uvicorn main:app --host 0.0.0.0 --port 8000` 구성.
- `docker-compose.yml`: 환경변수 `${DATA_GO_KR_API_KEY}` 자동 주입 매핑.
- `frontend/Dockerfile`: `nginx`를 활용한 정적 파일 배포(Multi-stage build).

### 11.3 GitHub 파일 업로드 정책 

**GitHub에 올라가도 되는 파일 (Public)**
- 프로젝트 메인 코드 베이스 (`frontend/src/**`, `backend/app/**`)
- 인프라 및 배포 파일 (`Dockerfile`, `docker-compose.yml`, `requirements.txt`, `package.json`)
- `.env.example` (환경변수 템플릿)

**GitHub에 절대 올라가면 안 되는 파일 (Private/Ignored)**
- `.env`, `.env.*` (실제 API 키 및 Secret)
- `backend/hospitals.db`, `*.sqlite3` (운영 데이터베이스)
- `node_modules/`, `.venv/` 등 라이브러리 폴더 및 캐시

### 11.4 데모(Demo) 및 시뮬레이션(Simulation) 기능 제거 (완료)
- **데모 안내 모달 및 경고 배너 완전 제거**: 실제 프로덕션 환경과의 혼선을 막기 위해 프론트엔드 UI상의 `DemoNoticeModal` 및 `DemoWarningBanner` 렌더링 코드를 안전하게 제거하였습니다.
- **시뮬레이션 모드 전면 비활성화**: `useAppModeStore.ts` 및 `env.ts`에서 포트폴리오 데모 전용 모드인 `IS_SIMULATION_MODE` 플래그를 `false`로 상시 고정하여 항상 실제 서버의 데이터를 로드하도록 변경하였습니다.
- **MOCK API 기본값 비활성화**: 백엔드 `env.py`에서 `USE_MOCK_API` 환경변수 기본값을 `True`에서 `False`로 변경하여, 명시적인 모킹 설정이 없는 한 항상 실시간 공공데이터 API를 직접 바라보도록 설정했습니다.


