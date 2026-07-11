# 🗺️ React Kakao Maps SDK 중심축 관리 가이드 (Declarative vs Imperative)

본 문서는 `react-kakao-maps-sdk`를 활용하여 지도를 렌더링할 때 발생하는 흔한 안티 패턴인 **"지도 원위치 튕김(Bouncing) 버그"**의 원인과 올바른 설계 패턴을 정리한 기술 가이드입니다.

## 1. 문제 현상 (The Bouncing Bug)
사용자가 마커나 리스트 항목을 클릭하여 지도를 특정 위치로 이동(`panTo`)시켰음에도 불구하고, 화면 내 다른 상태(State)가 변경되어 컴포넌트가 리렌더링될 때 **지도가 원래 위치(초기 위치)로 강제로 튕겨 돌아가는 현상**입니다.

## 2. 근본 원인 (Root Cause)
이는 React의 **선언적(Declarative)** 렌더링 방식과 지도 조작의 **명령적(Imperative)** 제어 방식이 충돌하기 때문에 발생합니다.

### ❌ 잘못된 안티 패턴 (Anti-Pattern)
```tsx
const mapCenter = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : DEFAULT_CENTER;

// ... 마커 클릭 시
map.panTo(new kakao.maps.LatLng(hospital.lat, hospital.lng)); // 1. 명령적으로 지도 이동시킴

// ... 렌더링
<Map center={mapCenter}> // 2. 렌더링 시 선언된 center를 보고 다시 원래 위치(userLocation)로 지도를 튕겨냄
```
- 컴포넌트가 리렌더링될 때마다 `mapCenter` 객체가 새로 생성됩니다.
- `<Map>` 컴포넌트는 `center` Prop이 변경된 것으로 인식하고, 개발자가 "이 지도의 중심은 무조건 `mapCenter`여야 해!"라고 선언한 것으로 받아들입니다.
- 결과적으로 `panTo()`로 아무리 이동시켜봤자, 다음 렌더링 사이클에 즉시 `center` Prop의 좌표(원위치)로 지도를 돌려버립니다.

## 3. 올바른 설계 패턴 (Best Practice)
**지도의 선언적 `center` Prop은 정적인 초기값 전용으로만 사용**하고, 런타임에 발생하는 모든 동적인 지도 이동은 철저히 **명령적 API(`panTo`)로만 제어**해야 합니다.

### ✅ 올바른 패턴 (Correct Pattern)
```tsx
// 1. 선언적: 초기 렌더링 시의 중심축은 상수(정적 데이터)로 고정합니다.
<Map center={DEFAULT_CENTER}>

// 2. 명령적: 내 위치 찾기, 병원 클릭 등 모든 동적 이동은 Effect와 panTo로만 처리합니다.
useEffect(() => {
  if (userLocation) {
    panMapTo(userLocation.lat, userLocation.lng); // 최초 1회만 이동되도록 ref 등으로 중복 방지
  }
}, [userLocation]);

useEffect(() => {
  if (selectedHospital) {
    panMapTo(selectedHospital.lat, selectedHospital.lng);
  }
}, [selectedHospital]);
```

### 요약
- `<Map center={...}>` 에는 절대 렌더링 시마다 재생성되는 동적인 상태 객체(State)를 넣지 마십시오.
- 초기 로드, 사용자 액션 등 지도가 움직여야 할 때는 오직 `map.panTo()`만 사용하십시오.
