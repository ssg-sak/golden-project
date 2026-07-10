# MapComponent 대대적 수리공사 계획 (Major Repair Plan)

작성해 드린 사후 분석 보고서(Post-Mortem)를 바탕으로, `MapComponent`의 안티패턴을 근본적으로 제거하고 새로 도입한 AI 파이프라인의 이점을 프론트엔드에 완전히 연동하기 위한 수리 공사 계획입니다.

## 1. AI 파이프라인(Data-Driven) 연동 및 연산 걷어내기
- **`generate_policy_reports.py` 수정**: CSV 파일을 프론트엔드가 다운로드할 수 있도록 `frontend/public/data/policy_monitoring_report.csv` 경로에도 복사본을 생성하도록 파이썬 스크립트를 수정합니다.
- **`useDashboardActions.ts` 리팩토링**:
  - `handleExportCsv`: 기존 브라우저 메모리 기반의 CSV 생성 로직을 싹 지우고, 단순히 `/data/policy_monitoring_report.csv` 파일을 다운로드하도록 변경합니다.
  - `handlePresetSelect`: 기존의 무거운 정렬 로직(`.sort()`)을 걷어내고, 파이썬이 미리 생성해 둔 `/data/priority_targets.json`을 `fetch`로 읽어와 즉시 포커싱하도록 비동기(Async) 함수로 개선합니다.

## 2. 🚨 MapComponent.tsx 치명적 안티패턴 제거
- **Temporal Dead Zone(ReferenceError) 해결**: `sortedByRiskDesc` 변수는 AI 파이프라인 연동으로 인해 더 이상 필요가 없어지므로 완전히 삭제하여 에러 위험을 뿌리뽑습니다.
- **연쇄 렌더링(Double Render) 제거**: `useEffect` 안에서 필터(Filter)가 바뀌면 `onHospitalSelect(null)`을 강제로 트리거하던 로직을 삭제합니다. 대신, `MapToolbar`에서 필터 변경 이벤트가 발생할 때(`onFilterChange`) 동기적으로 처리하여 불필요한 렌더링 사이클을 1회 줄입니다.
- **불필요한 Refs 및 스파게티 로직 제거**: 
  - `lastPannedHospitalRef`, `lastPannedDistrictRef`, `skipMapClearRef` 등 명령형 코드를 위해 억지로 도입된 상태 방어 로직들을 최대한 걷어내고, 의존성 배열(Dependency Array)을 올바르게 교정합니다.
- **코드 포맷팅**: 600줄에 달하도록 만든 원인인 '비정상적으로 띄워진 과도한 여백(빈 줄)'을 깔끔하게 제거하여 가독성을 극대화합니다.

## Verification Plan
1. 파이썬 스크립트 재실행 후 `public/data` 폴더에 CSV가 정상 적재되는지 확인합니다.
2. 프론트엔드에서 `tsc --noEmit`을 실행하여 참조 에러나 타입 에러가 없는지 검증합니다.
3. 리액트 컴포넌트가 렌더링 사이클 낭비 없이 매끄럽게 동작하는지 코드로 재확인합니다.

> [!CAUTION]
> 이 작업은 `MapComponent.tsx`와 `useDashboardActions.ts`의 핵심 구조를 크게 덜어내는 파괴적 리팩토링(Destructive Refactoring)입니다. 기존 로직을 '수정'하는 것이 아니라 대부분 '삭제'하는 것이 핵심입니다.
