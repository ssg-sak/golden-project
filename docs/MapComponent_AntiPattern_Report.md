# 🚨 MapComponent 안티패턴 발생 원인 및 사후 분석 보고서 (Post-Mortem)

본 보고서는 프로젝트의 핵심 뷰인 `MapComponent.tsx`가 왜 단일 컴포넌트로서 붕괴 직전의 '스파게티 코드(God Component)'가 되었는지, 그 발생 원인(Root Cause)과 문제점을 철저히 분석하기 위해 작성되었습니다.

---

## 1. 어떻게 이런 일이 발생했는가? (Root Cause Analysis)

### 1.1 "빨리 돌아가게 만들기"의 함정 (Technical Debt)
초기 기획 당시 `MapComponent`는 단순히 카카오 지도를 화면에 띄우고 핀을 꽂는 **'단순한 캔버스(View)'**에 불과했습니다.
하지만 프로젝트가 진척되면서 다음과 같은 요구사항들이 **동시다발적으로 추가**되었습니다.
- "선택한 병원이 필터에 안 맞으면 선택을 해제해주세요."
- "클릭한 행정동으로 지도를 부드럽게 이동시켜주세요."
- "행정동 취약 지수에 따라 1위부터 10위까지 순위를 매겨주세요."

이때 기능들을 별도의 비즈니스 레이어(Store나 Hook)로 분리하지 않고, 화면을 그리는 `MapComponent` 안에 `useEffect`와 `useState`를 통해 계속해서 **땜질(Patch)하듯 덧붙인 것**이 기술 부채(Technical Debt)의 시발점이 되었습니다.

### 1.2 프레임워크(React) 생태계에 대한 이해 부족
React는 상태(State)가 변하면 화면을 **선언적으로(Declarative)** 다시 그리는 프레임워크입니다. 
하지만 지도 API(카카오 맵)는 좌표를 강제로 이동시키는 **명령형(Imperative)** 동작 방식을 가집니다.
이 두 가지 패러다임이 충돌할 때, 이를 중재하는 완충 지대(예: MapController)를 만들지 않고 `useEffect` 안에서 무작정 강제 좌표 이동(`panTo`) 로직을 실행한 것이 아키텍처를 망가뜨린 가장 큰 원인입니다.

---

## 2. 발생한 치명적 안티패턴들 (Anti-Patterns)

### 🚨 2.1 런타임 붕괴 위험 (Temporal Dead Zone)
```typescript
// [문제의 코드 흐름]
// 1. 여기서 변수를 사용함 (ReferenceError 발생 위험)
const { handleExportCsv } = useDashboardActions({ sortedByRiskDesc });

// 2. 하지만 변수는 이보다 한참 밑에서 선언됨
const sortedByRiskDesc = useMemo(() => { ... }, []);
```
**분석**: 코드의 위에서 아래로 흐르는 실행 문맥을 무시한 채, 컴포넌트의 몸집이 너무 비대해지다 보니 개발자조차 변수가 어디서 선언되었는지 추적하지 못하고 먼저 사용해버리는 치명적 실수가 발생했습니다.

### 🚨 2.2 상태 추적의 지옥 (Ref Hell)
```typescript
const skipMapClearRef = useRef(false);
const lastPannedDistrictRef = useRef<string | null>(null);
const lastPannedHospitalRef = useRef<string | null>(null);
```
**분석**: 무한 렌더링이 도는 것을 막기 위해 임시방편으로 `useRef`를 3개나 만들어 상태 변경을 강제로 '방어'하고 있습니다. 이는 코드가 정상적인 데이터 흐름(Data Flow)을 타지 않고 억지로 구동되고 있다는 명백한 증거입니다.

### 🚨 2.3 불필요한 연쇄 렌더링 (Double Render)
```typescript
useEffect(() => {
  if (selectedHospital && !hospitalMatchesFilter(selectedHospital, activeFilter)) {
    onHospitalSelect(null); // 강제 렌더링 유발
  }
}, [activeFilter, selectedHospital]);
```
**분석**: 상태 A(필터)가 변해서 화면을 그렸는데, 화면을 다 그리고 나니 `useEffect`가 실행되어 상태 B(선택된 병원)를 바꾸고 화면을 또 그립니다. 앱이 무거워지고 버벅거리는(Lag) 핵심 원인입니다.

---

### 🚨 2.4 과도한 프롭 드릴링 (Props Drilling)
`	ypescript
<MapToolbar
  vulnerabilityLoading={vulnerabilityLoading}
  optimalLocations={optimalLocations}
  // ... (총 12개의 Props 전달)
/>
`
**분석**: MapComponent가 자신이 사용하지도 않을 데이터(예: AI 마커 위치 데이터, 로딩 상태 등)를 오직 자식 컴포넌트(MapToolbar, OptimalLocationMarkers)에게 전달하기 위해 짊어지고 있습니다. 이는 상태(State)를 불필요하게 부모에게 끌어올린 전형적인 안티패턴으로, 컴포넌트 간의 결합도를 높여 재사용성을 파괴합니다.

---

### 🚨 2.5 외부 라이브러리(Kakao Map) 내 DOM 엘리먼트 무단 삽입 (DOM Injection Error)
`	ypescript
// [문제의 코드]
{optimalLocations.map((loc) => (
  <div key={loc.id}>  // 👈 치명적 결함: 지도 컨테이너 안에 뜬금없는 <div>가 렌더링됨
    <MapMarker />
    <CustomOverlayMap />
  </div>
))}
`
**분석**: React는 Virtual DOM을 쓰지만 카카오 맵은 자신만의 Native DOM 캔버스를 조작합니다. eact-kakao-maps-sdk 컴포넌트들은 내부적으로 포탈(Portal)이나 컨텍스트를 써서 지도 위에 마커를 올리는데, 여기에 순수 HTML 태그인 <div>를 묶음용으로 억지로 끼워 넣으면 카카오 맵의 레이아웃이 완전히 깨지거나 런타임 에러가 발생합니다. 배열 매핑 시 요소를 묶을 때는 화면에 렌더링되지 않는 <React.Fragment key={...}>를 사용해야 합니다.

---

## 3. 교훈 및 해결 방안 (Lessons Learned)

이러한 사태를 두 번 다시 겪지 않기 위해서는 **명확한 역할 분담(Separation of Concerns)**이 필수적입니다.

1. **View는 바보처럼 만들어라 (Thin Client)**: 
   `MapComponent`는 데이터를 계산하거나 판단하지 말고, 오직 '주어진 데이터를 화면에 그리는 역할'만 수행해야 합니다.
2. **연산은 밖에서 해라**: 
   배열을 정렬하고 필터링하는 로직은 이번에 신설한 **AI 파이프라인(Python)**으로 보내거나, 최소한 Zustand 같은 전역 상태 관리자(Store)에서 처리해야 합니다.
3. **명령형 로직은 격리하라**: 
   지도를 강제로 이동시키는 등의 부수 효과(Side-Effect)는 렌더링 사이클에서 완전히 분리된 전용 커스텀 훅(`useMapController`) 내부에서만 통제해야 합니다.
