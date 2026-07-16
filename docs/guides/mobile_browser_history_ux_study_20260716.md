# 모바일 브라우저 히스토리·상세 UX 학습서

작성일: 2026-07-16  
관련 보고서: [모바일 병원 상세 UX 개선 보고서](../reports/mobile_hospital_detail_ux_report_20260716.md)

## 핵심 원칙

모바일 웹에서 “화면”이 바뀌어도 URL이 그대로면, 브라우저는 앱 내부 상태를 모른다.  
사용자는 물리 Back을 누르면 **이전 앱 화면**으로 돌아갈 거라 기대하지만, 히스토리에 아무 것도 없으면 브라우저는 **이전 사이트·탭 종료**로 해석한다.

SPA 상세 오버레이·바텀시트·풀스크린 패널을 만들 때는 다음을 함께 설계한다.

1. 이 상태가 Back으로 닫혀야 하는가?
2. 닫기 버튼과 물리 Back이 **같은 결과**를 내는가?
3. 상세를 여러 번 열 때 히스토리가 무한히 쌓이지 않는가?
4. 긴 콘텐츠의 스크롤은 **어느 컨테이너**가 담당하는가?
5. 고정 헤더/버튼이 반투명이면 스크롤 중 가독성이 깨지지 않는가?

## 1. History API로 “가상 화면”을 만들기

### 왜 필요한가

React state만으로 `selectedHospital`을 바꾸면 UI는 상세로 바뀌지만 `window.history`에는 기록이 없다.  
안드로이드 Chrome에서 Back은 히스토리 스택을 한 단계 되돌린다.

### 기본 패턴

```text
목록 (기존 히스토리 엔트리)
  └─ pushState(상세 플래그)  →  상세 UI
        └─ Back / history.back()  →  popstate  →  목록 UI
```

이번 프로젝트 적용:

- 플래그 키: `mobileCitizenHospitalDetail`
- 파일: `frontend/src/shared/hooks/useMobileHospitalDetailHistory.ts`

### 중복 push 방지

병원 A 상세에서 병원 B로 바꾸면 UI만 바꾸고 **히스토리는 추가하지 않는다**.  
이미 `history.state`에 상세 플래그가 있으면 `pushState`를 건너뛴다.  
Back 한 번으로 목록으로 돌아가게 유지한다.

### 닫기 단일화

| 사용자 행동 | 권장 처리 |
|-------------|-----------|
| 「병원 목록으로」 | `closeDetail()` → 상세 플래그가 있으면 `history.back()` |
| 물리 Back / 브라우저 Back | `popstate` → `selectedHospital = null` |
| 필터 변경으로 상세 강제 해제 | 상태만 null + `replaceState`로 플래그 정리 |

버튼이 state만 닫고 Back은 `history.back()`만 하면, 히스토리와 UI가 어긋난다.  
한쪽이 `history.back()`을 쓰면, 다른 쪽도 **popstate가 상태를 닫는 구조**로 맞춘다.

### SSR·테스트 환경

`typeof window !== 'undefined'`로 History API 접근을 감싼다.  
단위 테스트에서는 `pushState`/`popstate` 전체 훅보다,  
`isMobileHospitalDetailHistoryState` 같은 **순수 헬퍼**를 먼저 검증하는 편이 가볍다.

## 2. 스크롤 소유권을 하나만 두기

### 증상

- 상세가 “아래부터” 열린 느낌
- body와 패널이 같이 움직이거나, 이전 상세의 스크롤이 남음

### 권장 구조

```text
viewport / 셸
  overflow-hidden   ← 바깥은 고정
  고정 액션 버튼 (목록으로)
  패널
    헤더·핸들 (shrink-0, 불투명)
    본문
      overflow-y-auto   ← 스크롤은 여기만
      overscroll-contain
```

이번 적용:

- `MobileCitizenHospitalBrowser`: 상세 wrapper `overflow-hidden` + `pt-14`
- `HospitalDetailPanel`: 본문 `overflow-y-auto`, 병원 변경 시 `scrollTop = 0`

### 스크롤 초기화 타이밍

DOM이 그려지기 전에 `scrollTop = 0`을 하면 무시될 수 있다.  
`requestAnimationFrame`으로 **페인트 직후** 한 번 더 맞춘다.  
키는 병원 식별값(`name` 등)이 바뀔 때마다 실행한다.

### body scroll lock은 최후 수단

`document.body.style.overflow = 'hidden'`은 다른 모달·지도와 충돌하기 쉽다.  
먼저 컨테이너 `overflow-hidden` / 내부 `overflow-y-auto`로 해결하고,  
그래도 배경이 움직이면 상세 활성 구간에만 lock + cleanup을 넣는다.

## 3. 반투명 헤더와 가독성

### 왜 문제가 되나

`bg-white/50` + `backdrop-blur`는 지도·목록이 비칠 때 “고급”처럼 보이지만,  
스크롤 중에는 **글자 뒤 콘텐츠가 움직여** 읽기 어렵고 데모 완성도가 떨어진다.

공공·의료 정보 화면에서는 정보 위계가 장식보다 우선이다.

### 이번 프로젝트 규칙

- 상세 핸들·목록 복귀 버튼·GNB: **불투명 `bg-white`**
- blur는 제거하거나, 장식용 카드에만 제한

전역 CSS(`index.css`)에서 `#root .backdrop-blur-*`를 끄는 경우도 있지만,  
클래스에 `/50` 투명도가 남아 있으면 여전히 비친다. **배경색 자체**를 불투명으로 바꾸는 것이 확실하다.

## 4. 데스크톱과 모바일을 나누는 이유

히스토리 훅은 `MobileCitizenHospitalBrowser`에만 연결했다.  
데스크톱은 지도 + 사이드 패널이 동시에 보이는 **분할 레이아웃**이라,  
Back으로 패널만 닫는 UX가 모바일과 같지 않을 수 있다.

원칙:

- **모바일**: 목록 ↔ 상세를 화면 전환처럼 취급 → History 연동
- **데스크톱**: 선택 강조·패널 표시 → 기존 state만으로도 충분할 수 있음

공통 컴포넌트(`HospitalDetailPanel`)를 쓰더라도,  
History·고정 버튼·`pt-14`는 **모바일 셸**에서만 감싸는 편이 안전하다.

## 5. 스스로 점검하는 체크리스트

구현 후 아래를 순서대로 확인한다.

- [ ] 상세에서 물리 Back → 목록 (탭 종료 아님)
- [ ] 「목록으로」와 Back 결과가 동일
- [ ] 병원 A → B 전환 후 Back 한 번에 목록
- [ ] 새 상세는 항상 상단부터
- [ ] 긴 본문은 패널 내부만 스크롤
- [ ] 스크롤 중 상단 UI 뒤로 본문이 비치지 않음
- [ ] 목록에서 Back은 사이트/이전 페이지 기본 동작

## 6. 관련 코드 지도

| 개념 | 파일 |
|------|------|
| History push / pop / close | `frontend/src/shared/hooks/useMobileHospitalDetailHistory.ts` |
| 모바일 목록·상세 전환 | `frontend/src/widgets/app/MobileCitizenHospitalBrowser.tsx` |
| 상세 본문·스크롤 | `frontend/src/widgets/map-dashboard/HospitalDetailPanel.tsx` |
| 시민 상위 상태 | `frontend/src/widgets/app/CitizenView.tsx` |
| 상단 네비 | `frontend/src/widgets/app/GlobalNavigationBar.tsx` |
| 단위 테스트 | `tests/unit/frontend/mobile-hospital-detail-history.test.ts` |

## 한 줄 요약

모바일 SPA 상세는 **UI state + History state**를 같이 설계하고,  
스크롤·불투명 헤더는 **한 컨테이너·한 배경**으로 고정한다.
