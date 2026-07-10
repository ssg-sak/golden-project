# 지도 대시보드 컴포넌트 리팩토링 보고서

본 보고서는 `MapComponent`, `MapToolbar`, `AdminView` 등 지도 위젯 주변부 컴포넌트의 유지보수성, 폴백(Fallback), 그리고 상태 관리 일관성을 점검하고 개선한 내용을 학습 목적으로 정리한 문서입니다.

## 1. 리팩토링 배경 및 목적

기존 지도 대시보드 영역의 컴포넌트들은 다음과 같은 문제를 안고 있었습니다.

- **상태 관리의 파편화 (Prop Drilling vs Zustand 혼용)**:
  `MapComponent`와 `MapToolbar` 내부에서 Zustand (`useVulnerabilityStore`)의 일부 상태(`showHeatmap`)를 직접 접근하면서도, 데이터 그루핑의 핵심이 되는 배열이나 로딩 상태(`vulnerabilityRecords`, `vulnerabilityLoading`)는 상위 컴포넌트인 `AdminView`에서 Props로 전달받는 비일관적인 구조였습니다.
- **폴백(Fallback) 및 예외 처리의 부재**:
  `MapComponent` 내부에서 AI 입지 분석(Optimal Locations) 데이터를 fetch할 때, 로딩 중이거나 실패했을 때 사용자에게 보여줄 에러 UI가 없었으며, 단지 콘솔에만 에러를 출력하고 무시되었습니다.
- **컴포넌트 비대화**:
  `MapComponent.tsx` 파일이 약 800줄에 달하며, 지도 인터랙션 및 상태 관리, 그리고 데이터 Fetching(Optimal Locations) 등 수많은 역할을 모두 담당하고 있어 단일 책임 원칙(SRP) 측면에서 분리가 필요했습니다.

이러한 문제들을 해결하여 향후 코드 가독성과 유지보수성을 극대화하는 것이 리팩토링의 목적입니다.

---

## 2. 주요 개선 사항

### 2.1 Zustand를 활용한 상태 관리 일관성 확보

- **문제점**:
  `AdminView` -> `MapComponent` -> `MapToolbar` 흐름으로 Props 전달이 과도하게 발생하고 있었습니다. 이미 Zustand에 들어있는 데이터임에도 불구하고 Props로 내림으로써 혼란을 야기했습니다.
- **개선 후**:
  - `MapComponent.tsx` 및 `MapToolbar.tsx`에서 Props(`vulnerabilityRecords`, `vulnerabilityLoading` 등)를 제거했습니다.
  - 두 컴포넌트 모두 내부에서 직접 `useVulnerabilityStore`를 호출해 데이터를 가져오도록 변경하였습니다. 이로써 Prop Drilling이 크게 줄어들고 컴포넌트 인터페이스가 훨씬 간결해졌습니다.
  - **학습 포인트**: 하위 컴포넌트들이 이미 스토어에 의존하고 있다면, 무리하게 컨테이너-프리젠터(Container-Presenter) 패턴을 고집하기보다는 각 컴포넌트가 직접 스토어를 구독하게 하는 편이 훨씬 직관적입니다.

### 2.2 `useOptimalLocations` 커스텀 훅 추출 및 에러 UI 대응

- **문제점**:
  기존 `MapComponent.tsx` 내부 `useEffect`에서 하드코딩된 `fetch('/data/optimal_locations.json')` 로직이 존재했습니다. 로딩 상태(`isLoading`) 및 실패 상태(`error`)가 누락되어 네트워크 오류 시 대응이 불가했습니다.
- **개선 후**:
  - `frontend/src/widgets/map-dashboard/lib/useOptimalLocations.ts` 커스텀 훅을 만들어 데이터 Fetching 로직을 캡슐화했습니다.
  - 훅 내부에서 데이터 로딩과 에러 상태 관리를 추가하였습니다.
  - `MapComponent.tsx`에서는 해당 훅을 사용해 오류 발생 시 에러 알림(`optimalLocationsError`), 로딩 시 로딩 표시자를 노출하도록 폴백 처리를 완료했습니다.
  - **학습 포인트**: 데이터 페칭 및 관련 상태(`data`, `isLoading`, `error`) 관리는 가능한 한 컴포넌트 바깥(커스텀 훅)으로 빼내어 컴포넌트의 메인 렌더링 로직에 집중하도록 분리하는 것이 모범적인 프론트엔드 패턴입니다.

### 2.3 `MapToolbar`의 파생 상태 연산 최적화

- **문제점**:
  `vulnerabilityMin`, `vulnerabilityMax`는 `vulnerabilityRecords` 배열을 바탕으로 계산되는 **파생 상태(Derived State)**였습니다. 기존에는 상위에서 계산 후 Props로 넘겼습니다.
- **개선 후**:
  - `MapToolbar.tsx` 안에서 Zustand 스토어를 이용해 `records`를 가져온 뒤, `useMemo`를 통해 스스로 최소값과 최대값을 계산하도록 변경했습니다.
  - **학습 포인트**: 상태에 종속된 파생 데이터는 스토어의 Selector 레벨에서 연산하거나 컴포넌트 내 `useMemo`를 사용해 불필요한 Props 추가를 방지하는 것이 좋습니다.

---

## 3. 리팩토링 후 기대 효과

1. **유지보수성 향상**: Props 인터페이스가 간결해져 컴포넌트의 역할을 파악하기 쉬워졌습니다.
2. **UX 안정성 확보**: 네트워크 오류 등의 예기치 못한 상황에서 사용자에게 시각적인 피드백(에러 토스트, 로딩 메시지)을 제공하게 되었습니다.
3. **재사용성**: AI 입지 분석 페칭 로직이 분리되어, 훗날 다른 컴포넌트에서 입지 분석 데이터가 필요할 때 훅을 손쉽게 재사용할 수 있습니다.

---

## 4. 참고 사항 (학습을 위한 팁)

- **Prop Drilling vs Global State**: React 컴포넌트 설계 시 무조건 상태 관리를 전역 스토어로 빼는 것이 정답은 아닙니다. 하지만 이번 사례처럼 이미 컴포넌트 트리 깊은 곳에서 해당 스토어를 쳐다보고 있다면, 혼용하기보다는 통일성 있게 스토어 접근 방식으로 마이그레이션 하는 것이 관리에 훨씬 수월합니다.
- **Race Condition 방지**: `useOptimalLocations` 훅 작성 시 `isMounted` 같은 플래그를 활용해 컴포넌트가 언마운트된 후 불필요한 상태 업데이트(State mutation on unmounted component)가 일어나는 현상을 방지하는 로직을 함께 숙지하면 좋습니다.
