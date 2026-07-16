# 모바일 브라우저 히스토리·상세 UX 학습서

작성일: 2026-07-16  
최종 갱신: 2026-07-16 (상세+지도 fixed 셸 · 스크롤 복구)  
관련 보고서: [모바일 병원 상세 UX 개선 보고서](../reports/mobile_hospital_detail_ux_report_20260716.md)  
관련 통합본: [지도+목록 계획·보고 통합본](../reports/mobile_citizen_map_list_integrated_20260716.md)

## 핵심 원칙

모바일 웹에서 “화면”이 바뀌어도 URL이 그대로면, 브라우저는 앱 내부 상태를 모른다.  
사용자는 물리 Back을 누르면 **이전 앱 화면**으로 돌아갈 거라 기대하지만, 히스토리에 없으면 **이전 사이트·탭 종료**로 해석한다.

SPA 상세를 만들 때 함께 설계한다.

1. 이 상태가 Back으로 닫혀야 하는가?
2. 닫기 버튼과 물리 Back이 **같은 결과**인가?
3. 상세를 여러 번 열 때 히스토리가 무한히 쌓이지 않는가?
4. 긴 콘텐츠의 스크롤은 **어느 컨테이너**가 담당하는가? (높이는 확정됐는가?)
5. 고정 헤더가 반투명이면 가독성이 깨지지 않는가?
6. 상세에서 **지도(위치)가 함께** 필요한가?

## 1. History API로 “가상 화면”을 만들기

### 기본 패턴

```text
목록 (기존 히스토리 엔트리)
  └─ pushState(상세 플래그)  →  상세 UI (지도+패널)
        └─ Back / history.back()  →  popstate  →  목록 UI
```

- 플래그 키: `mobileCitizenHospitalDetail`
- 파일: `frontend/src/shared/hooks/useMobileHospitalDetailHistory.ts`

### 중복 push 방지

병원 A → B로 바꾸면 UI만 바꾸고 **히스토리는 추가하지 않는다**.  
이미 상세 플래그가 있으면 `pushState`를 건너뛴다. Back 한 번으로 목록 복귀.

### 닫기 단일화

| 사용자 행동 | 처리 |
|-------------|------|
| 「병원 목록으로」 | `closeDetail()` → 플래그 있으면 `history.back()` |
| 물리 / 브라우저 Back | `popstate` → `selectedHospital = null` |
| 필터 등으로 상세 강제 해제 | state null + `replaceState`로 플래그 정리 |

버튼이 state만 닫고 Back만 `history.back()`을 쓰면 히스토리와 UI가 어긋난다.

## 2. 스크롤 소유권 — 높이부터 확정한다

### 권장 구조 (현재 모바일 상세)

```text
fixed 셸 (top: --mobile-nav-height, bottom: 0)
  overflow-hidden          ← 바깥은 고정, 높이 = 뷰포트
  ├─ 「목록으로」 (shrink-0, 불투명)
  ├─ 지도 (명시 px 높이)     ← 선택 사항이지만 피드백상 권장
  └─ min-h-0 flex-1 overflow-hidden
       └─ HospitalDetailPanel layout="panel"
            ├─ 헤더 (shrink-0)
            └─ 본문 overflow-y-auto overscroll-contain touch-pan-y
                 hospital 변경 시 scrollTop = 0 (rAF)
```

### 흔한 실패

| 잘못된 패턴 | 결과 |
|-------------|------|
| 문서 흐름 `flex-1`만으로 상세 전체 | 높이 미확정 → 스크롤 없음 |
| 바깥 `overflow-y-auto` + 안쪽도 auto | 이중 스크롤·터치 뺏김 |
| `layout="page"`로 부모에만 스크롤 맡김 + 부모 높이 없음 | 스크롤 멈춤 |

### 스크롤 초기화

`requestAnimationFrame` 후 `scrollTop = 0`. 키는 병원명 등 식별값.

### body scroll lock

최후 수단. 먼저 컨테이너 `overflow-hidden` / 내부 `overflow-y-auto`로 해결한다.

카카오맵 임베드·빈 패널 이슈는 [카카오맵 모바일 임베드 학습서](./kakao_mobile_map_embed_study_20260716.md)를 본다.

## 3. 반투명 헤더와 가독성

공공·의료 화면에서는 정보 위계가 장식보다 우선이다.

- 상세 핸들·목록 복귀·GNB: **불투명 `bg-white`**
- `bg-white/50` + blur는 스크롤 중 본문이 비쳐 읽기 어렵다

## 4. 상세와 지도의 관계

히스토리만 잘 되어도, 상세가 **정보만 전체 화면**이면  
“병원마다 들어가서 지도를 본다” 불편이 일부 남는다.

현재 시민 모바일:

- 상세 진입 = **지도(선택·직선) + 상세 정보**
- Back = 탐색(지도+목록)

History는 **상세 여부**만 담당하고, 지도 표시 여부는 `kakao` 폴백이 담당한다.

## 5. 데스크톱과 모바일

히스토리 훅은 `MobileCitizenHospitalBrowser`에만 연결한다.  
데스크톱은 지도+사이드 패널 분할이라 Back으로 패널만 닫는 UX가 다를 수 있다.

## 6. 점검 체크리스트

- [ ] 상세에서 물리 Back → 목록 (탭 종료 아님)
- [ ] 「목록으로」와 Back 결과 동일
- [ ] 병원 A → B 후 Back 한 번에 목록
- [ ] 새 상세는 상단부터 + 본문 스크롤 가능
- [ ] 상세에 지도가 보이면 선택 핀·직선이 맞는지
- [ ] 스크롤 중 상단 UI 뒤로 본문이 비치지 않음
- [ ] 목록에서 Back은 사이트 기본 동작

## 7. 관련 코드

| 개념 | 파일 |
|------|------|
| History | `useMobileHospitalDetailHistory.ts` |
| 모바일 셸 | `MobileCitizenHospitalBrowser.tsx` |
| 상세 패널 | `HospitalDetailPanel.tsx` |
| 시민 상위 | `CitizenView.tsx` |
| GNB | `GlobalNavigationBar.tsx` |
| 테스트 | `tests/unit/frontend/mobile-hospital-detail-history.test.ts` |

## 한 줄 요약

모바일 SPA 상세는 **UI state + History state + 확정 높이 스크롤 셸**을 같이 설계하고,  
가능하면 **지도와 정보를 한 화면에** 둔다.
