# 모바일 병원 상세 UX 개선 보고서

작성일: 2026-07-16  
최종 갱신: 2026-07-16 (상세+지도 · 스크롤 고정 셸)  
대상: 모바일 시민용 병원 목록 · 병원 상세 화면  
기준: GitHub `main` (`frontend` → `build` / `build:demo`)

## 목적

1. 안드로이드 물리 Back이 탭을 종료하지 않고 **목록으로** 돌아가게 한다.
2. 상세는 항상 상단부터 열리고, **본문이 스크롤**된다.
3. 상단 UI가 반투명으로 본문을 가리지 않는다.
4. *(후속)* 상세에서도 **지도와 병원 정보**를 같이 보여 위치 감각을 유지한다.

## 문제와 개선 결과

| 영역 | 기존 문제 | 개선 결과 |
|------|-----------|-----------|
| 안드로이드 물리 Back | 히스토리 없음 → 탭/사이트 종료 | `pushState` + `popstate`로 목록 복귀 |
| 닫기 경로 | 버튼과 Back이 다른 경로 | `closeDetail()` 단일화 |
| 상세 스크롤 위치 | 이전 병원 스크롤 잔존 | 병원명 변경 시 `scrollTop = 0` |
| 스크롤 구조 | 높이 미확정으로 스크롤 멈춤 | **fixed 셸** + 패널 `overflow-y-auto` |
| 상단 반투명 | 핸들·버튼·GNB 뒤로 본문 비침 | `bg-white` 불투명 |
| 상세와 지도 단절 | 상세=정보만 전체 화면 | **상단 지도 + 하단 상세** |

## 구현 요약

### 1. 히스토리 기반 Back

`frontend/src/shared/hooks/useMobileHospitalDetailHistory.ts`

- 상세 열릴 때 `pushState({ mobileCitizenHospitalDetail, hospitalName })`
- A→B 전환 시 중복 push 없음
- 「병원 목록으로」= `closeDetail()` → 필요 시 `history.back()`
- 외부에서 상세 해제 시 `replaceState`로 플래그 정리

### 2. 상세 패널

`HospitalDetailPanel.tsx`

- `layout="panel"`: 내부 스크롤 (모바일 상세 셸에서 사용)
- `layout="page"`: 부모 스크롤용 (높이 확정된 부모일 때만)
- 핸들·헤더 불투명, 병원 변경 시 스크롤 초기화

### 3. 모바일 셸 (현재)

`MobileCitizenHospitalBrowser.tsx`

- **탐색:** 지도+목록, 프리셋·드래그
- **상세(지도 OK):** `fixed` + GNB 아래부터 하단까지  
  `[목록으로] → 지도 → HospitalDetailPanel(panel)`
- **상세(지도 실패):** 같은 fixed 셸, 패널만
- 목록 카드·마커 모두 상세+지도로 진입

### 4. GNB

`GlobalNavigationBar.tsx` — 불투명 `bg-white`

## 변경 파일

| 파일 | 역할 |
|------|------|
| `useMobileHospitalDetailHistory.ts` | History push/pop/close |
| `MobileCitizenHospitalBrowser.tsx` | 탐색·상세 셸, 지도 동시 표시 |
| `HospitalDetailPanel.tsx` | layout·스크롤 |
| `CitizenMapComponent.tsx` | mobileEmbed·선택 병원 Polyline |
| `GlobalNavigationBar.tsx` | 헤더 불투명 |
| `mobile-hospital-detail-history.test.ts` | 단위 테스트 |

## 검증

| 검증 | 결과 |
|------|------|
| `npm run typecheck` | 통과 |
| `npm test` | 18 테스트 통과 |
| 스크롤 복구 커밋 | `3aff5c8` |

### 수동 확인

1. 병원 선택 → 상단 지도 + 하단 상세, **아래로 스크롤**
2. 「병원 목록으로」 / 물리 Back → 탐색 복귀
3. 병원 A 스크롤 후 B 선택 → B는 상단부터
4. 마커로 병원 전환 후 Back 한 번 → 목록

## 관련 문서

- 학습서: [모바일 브라우저 히스토리·상세 UX](../guides/mobile_browser_history_ux_study_20260716.md)
- 학습서: [카카오맵 모바일 임베드](../guides/kakao_mobile_map_embed_study_20260716.md)
- 통합본: [지도+목록 계획·보고](./mobile_citizen_map_list_integrated_20260716.md)
