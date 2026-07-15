# 엔터프라이즈 데모 검증 기준선 보고서

- 실행일: 2026-07-13
- 결과: 코드 기준선 통과, 실제 브라우저 및 공개 배포 환경 검증은 후속 P0로 유지

## 1. 자동 검증 결과

| 영역 | 명령 | 결과 |
|---|---|---|
| 프런트 단위 테스트 | `npm.cmd test --prefix frontend` | 성공: 4개 파일, 14개 테스트 |
| 프런트 타입 검사 | `npm.cmd run typecheck --prefix frontend` | 성공 |
| 프런트 린트 | `npm.cmd run lint --prefix frontend` | 성공 |
| 프런트 일반 빌드 | `npm.cmd run build --prefix frontend` | 성공 |
| GitHub Pages 데모 빌드 | `npm.cmd run build:demo --prefix frontend` | 성공 |
| 백엔드 단위·통합 테스트 | 백엔드 디렉터리에서 `python -m pytest ..\\tests\\unit\\backend ..\\tests\\integration\\backend -q` | 성공: 19개 테스트 |

## 2. 서버 확인 결과

- `http://localhost:5173`: HTTP 200
- `http://127.0.0.1:8000/`: HTTP 200
- `http://127.0.0.1:8000/api/hospitals`: HTTP 200
- `http://127.0.0.1:8000/api/dashboard/data-status`: HTTP 200
- `/api/dashboard/data-status`의 `sources`는 빈 배열이고 최신 스냅샷 시점은 `2026-07-12T12:52:26`이었다. 엔드포인트 장애는 아니며 `DataSourceStatus` 레코드 또는 수집 파이프라인 상태를 P0-6에서 확인한다.
- `/health`는 구현된 엔드포인트가 아니므로 404를 서버 장애 판정에 사용하지 않는다.

## 3. 실패 재현과 올바른 실행 위치

저장소 루트에서 아래 명령을 실행하면 테스트가 `app` 패키지를 찾지 못해 수집 단계에서 실패한다.

```powershell
python -m pytest tests/unit/backend tests/integration/backend -q
```

백엔드는 `backend`가 import root이므로 다음처럼 실행한다.

```powershell
Set-Location backend
python -m pytest ..\tests\unit\backend ..\tests\integration\backend -q
```

## 4. 아직 수행하지 못한 검증

- 현재 실행 환경에는 제어 가능한 브라우저 세션이 없어 실제 DOM, 반응형 레이아웃, 클릭 흐름과 화면 캡처를 자동 확인하지 못했다.
- 공개 GitHub Pages URL과 실제 모바일 기기 검증은 로컬 빌드 성공과 별개다.
- 위 두 항목은 `docs/plans/roadmaps/enterprise_demo_backlog_20260713.md`의 P0-1과 P0-8로 추적한다.

