# 🚨 장애 보고서 (Post-Mortem): CI/CD 배포 파이프라인 붕괴 및 구버전 노출 사태

## 1. 사건 개요 (Incident Overview)
- **발생 일시:** 2026년 7월 11일
- **장애 현상:** 
  - 모바일 바텀 시트 스크롤 불가 및 카카오맵 지도 미노출 버그를 픽스하고 `main` 브랜치에 코드를 Push했음에도 불구하고, 실제 **라이브 웹사이트(GitHub Pages)에는 픽스가 전혀 반영되지 않는 현상** 발생.
  - 사용자는 픽스되었다고 안내받았으나, 실제로는 과거의 고장난 화면을 계속해서 마주하게 됨.

## 2. 근본 원인 분석 (Root Cause Analysis)

### 2-1. 기술적 원인 (Technical Cause)
- 프론트엔드 모바일/PC 레이아웃을 분리하는 리팩토링 과정에서 `CitizenView` 관련 코드만 수정하고, **동일한 레이아웃 상수를 공유하고 있던 `AdminView` 등 관리자 페이지 컴포넌트들의 수정(Import 교체)을 누락**함.
- 이 상태로 코드가 Push 되면서, GitHub Actions 환경에서 실행된 `npm run build:demo` 단계 중 **TypeScript 컴파일(`tsc -b`) 에러가 발생하여 배포 파이프라인이 강제 중단(Crash)**됨.
- 배포가 중단되었으므로 GitHub Pages의 정적 파일들은 업데이트되지 않았고, 사용자는 캐싱된 구버전(버그가 있는 버전)을 그대로 바라보게 됨.

### 2-2. 프로세스적 원인 (Process Cause)
- 개발자(에이전트)가 코드를 검증할 때, 실제 배포 환경과 동일한 **전체 빌드 명령어(`npm run build:demo`)**를 돌려보지 않고, 부분적인 타입 체크 명령어(`npm run typecheck`)의 결과만 맹신함.
- GitHub Actions의 파이프라인 성공/실패 여부를 교차 검증(Cross-check)하지 않고, 로컬 저장소에서 Push가 성공했다는 사실 하나만으로 "배포가 완료되었다"고 성급하게 오판함.

## 3. 긴급 조치 내역 (Emergency Actions Taken)
1. **빌드 실패 지점 추적:** 로컬에서 `cmd.exe /c npm run build:demo`를 실행하여 컴파일 에러가 터지는 정확한 파일들(`AdminView.tsx`, `AdminHospitalSidebar.tsx`, `OptimalLocationsPanel.tsx`)을 식별함.
2. **코드 핫픽스(Hotfix):** 식별된 파일들에서 존재하지 않는 구형 상수(`DASHBOARD_SIDEBAR_COL_CLASS` 등)를 신규 분리된 상수(`DESKTOP_SIDEBAR_WRAPPER_CLASS` 등)로 모두 교체함.
3. **로컬 빌드 최종 검증:** 다시 빌드 명령어를 실행하여 100% 정상적으로 번들링(Bundling)되는 것을 확인함.
4. **재배포 및 정상화:** 픽스된 코드를 즉각 `main` 브랜치에 Push하여 GitHub Actions가 정상적으로 완료되도록 유도, 라이브 사이트에 최신 코드를 성공적으로 반영함.

## 4. 재발 방지 대책 (Preventative Measures)
> [!IMPORTANT]  
> 앞으로 프론트엔드 구조를 변경하는 핵심 아키텍처 리팩토링이나 상수명 변경 작업 후에는, **절대로 부분 테스트(`typecheck`)만으로 검증을 끝내지 않습니다.**

- **Rule 1. 배포 전 로컬 빌드 의무화:** 코드 푸시 전, 반드시 로컬에서 `npm run build` (또는 `build:demo`) 명령어를 돌려 프로덕션 빌드 레벨에서의 에러가 없는지 100% 확정짓습니다.
- **Rule 2. CI/CD 파이프라인 결과 주시:** Push 명령어가 성공했다고 해서 작업이 끝난 것이 아님을 명심하고, 실제 호스팅 서버(GitHub Pages)에 최신 커밋이 반영되어 빌드가 완료되었는지 논리적으로 한 번 더 의심하고 검증하는 방어적 개발 스탠스를 취합니다.
