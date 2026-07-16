# 카카오맵 모바일 임베드 학습서

작성일: 2026-07-16  
최종 갱신: 2026-07-16 (상세+지도 · 스크롤 셸)  
관련 통합본: [모바일 시민용 지도+목록 계획·보고 통합본](../reports/mobile_citizen_map_list_integrated_20260716.md)  
관련 학습: [모바일 브라우저 히스토리·상세 UX 학습서](./mobile_browser_history_ux_study_20260716.md)

## 핵심 원칙

1. **UX 레퍼런스와 지도 SDK는 다르다.**  
   “네이버처럼”은 마커+목록 동시 UX이고, 구현은 **카카오맵**이다.
2. **카카오맵은 부모 높이 없이 `height: 100%`면 빈 패널**이 된다.
3. 컨테이너 크기가 나중에 잡히면 **`relayout()`**이 필요하다.
4. 모바일/데스크톱에 지도를 동시에 마운트하지 않는다.
5. **상세에서도 지도를 유지**한다. 위치 감각이 상세에서 끊기면 피드백이 다시 난다.
6. **직선 Polyline ≠ 도로 경로.** Directions API 없이 방향만 보여 준다.
7. **스크롤 박스는 확정된 높이 안에서만** 생긴다. flex `flex-1`만으로는 부족할 수 있다 → 상세는 **fixed 뷰포트 셸**.

## 1. 왜 빈 패널만 보였는가

### 잘못된 가정

```text
flex 부모
  └─ basis-[42%] + min-h-[12rem]   ← “높이 있을 것”
       └─ 자식 h-full / Map 100%   ← 타일이 그려질 것
```

플렉스 `basis`는 부모의 **확정 높이**에 의존한다.  
조상이 `min-h-0` + 남은 공간 분배 중이면 `%` 높이가 0에 가까워지고,  
카카오맵은 그 순간 픽셀로 캔버스를 만들어 **회색/흰 박스만** 남긴다.

### 안전한 패턴

```text
명시적 픽셀/dvh 높이 래퍼
  └─ absolute inset-0
       └─ Map width/height 100%
       └─ onCreate → relayout()
       └─ ResizeObserver → relayout()  (드래그·프리셋)
```

## 2. mobileEmbed variant

| | default | mobileEmbed |
|--|---------|-------------|
| 최소 높이 | `min-h-[50vh]` 등 | 부모 명시 높이에 맞춤 |
| 범례 | 일반 | 더 작게 |
| 선택 팬 오프셋 | 바텀시트 가정 | 상세 하단 패널 고려 |
| 키보드 숏컷 | 켜기 | 끄기(터치 우선) |
| 직선 경로 | 없음 | 선택(또는 포커스) 병원 `Polyline` |

## 3. 높이 조절: 프리셋 + 드래그 (탐색 화면)

```text
보기 버튼 (균형 / 지도 크게 / 목록 크게)
  → mapHeightPx = 프리셋 픽셀

드래그 핸들 (pointer capture)
  → mapHeightPx = clamp(start + Δy, 120px, 뷰포트 65%)
  → MapRelayout → map.relayout()
```

상세 화면의 지도 높이는 별도 `getDetailMapHeight()`(~38vh, clamp)로 고정해  
하단 정보 패널 공간을 확보한다.

## 4. 탐색 ↔ 상세 (현재 모델)

```text
목록 카드 / 마커 탭
  → selectedHospital
  → fixed 셸: [목록으로] + 지도 + HospitalDetailPanel(layout=panel)

목록으로 / 물리 Back
  → closeDetail / popstate
  → 탐색 화면 (지도+목록)
```

| | 탐색 | 상세 (지도 OK) | 상세 (지도 실패) |
|--|------|----------------|------------------|
| 지도 | 있음 (드래그·프리셋) | 있음 (고정 높이) | 없음 |
| 하단 | 목록 | 상세 패널 스크롤 | 상세 패널 스크롤 |
| history | 없음 | `pushState` 1단 | 동일 |

초기에 마커=미리보기 칩 / 목록=상세로 나눈 적 있으나,  
“상세에 지도도 같이” 피드백 후 **둘 다 상세+지도**로 통일했다.  
미리보기 전용 `previewHospital` 상태는 셸에서 제거했고,  
Polyline은 `selectedHospital` 기준으로 그린다.

## 5. 상세 스크롤이 또 멈춘 이유

### 증상

상세+지도를 flex `flex-1` 섹션으로 넣으면, 본문에 `overflow-y-auto`가 있어도  
**스크롤이 생기지 않거나 터치가 먹히지 않는** 경우가 있다.

### 원인

`overflow-y-auto`는 부모에 **유한한 높이**가 있을 때만 스크롤 박스가 된다.  
문서 흐름 + `min-h-dvh` 체인 + 푸터 등이 섞이면 `flex-1`이 “남은 공간”을  
제대로 못 받아 패널이 콘텐츠만큼 늘어나고, 스크롤이 바깥으로 새거나 멈춘다.

### 해결 패턴 (현재)

```text
fixed inset-x-0 bottom-0
  top: var(--mobile-nav-height)   ← 뷰포트 높이 확정
  overflow-hidden
  ├─ 목록으로 버튼 (shrink-0)
  ├─ 지도 (명시 px 높이)
  └─ min-h-0 flex-1 overflow-hidden
       └─ HospitalDetailPanel layout="panel"
            └─ 본문 overflow-y-auto touch-pan-y
```

체크 질문:

- 상세 셸이 **뷰포트에 고정**되어 있는가?
- 스크롤 컨테이너 조상에 **`min-h-0`**이 있는가?
- 스크롤은 **패널 본문 한곳**만 담당하는가?

자세한 History·닫기 단일화는 [히스토리·상세 UX 학습서](./mobile_browser_history_ux_study_20260716.md)를 본다.

## 6. 직선 경로

`/api/routing/eta`는 ETA·거리만 주고 **도로 좌표열은 없다**.  
카카오 `Polyline`으로 내 위치 → 병원 직선을 그린다.

- 장점: 추가 SDK 없이 방향 감각
- 한계: 실제 도로와 다를 수 있음
- 도로 폴리라인은 별도 Directions 계획으로 둔다

## 7. 폴백

```text
kakao.configured && !loading && !error
  → 탐색: 지도+목록 / 상세: 지도+패널
그 외
  → 탐색: 안내+목록 / 상세: 패널만 (같은 fixed 셸)
```

구버전 문구 `지도 없이 목록으로 확인`이 보이면 **옛 번들/미배포 데모** 가능성이 크다.

## 8. 로컬 확인 절차

1. 백엔드 `8000`, 프론트 `5173` 기동
2. 모바일 폭으로 http://127.0.0.1:5173
3. 탐색: 마커·목록·프리셋·드래그
4. 목록/마커 → 상세: **지도가 위에 남는지**, 본문 **스크롤**되는지
5. 다른 마커 → 병원 전환 후 Back 한 번에 탐색 복귀
6. 길찾기·전화 영역까지 스크롤 가능한지

## 9. 관련 코드

| 개념 | 파일 |
|------|------|
| 모바일 셸 | `MobileCitizenHospitalBrowser.tsx` |
| 카카오맵 | `CitizenMapComponent.tsx` |
| 상세 패널 | `HospitalDetailPanel.tsx` |
| relayout | `MapRelayout.tsx` |
| Back | `useMobileHospitalDetailHistory.ts` |
| 키 | `shared/config/kakao.ts`, `VITE_KAKAO_MAP_APP_KEY` |

## 한 줄 요약

모바일 카카오맵은 **명시적 높이 + relayout + 목록 폴백**이 기본이고,  
상세는 **fixed 셸 + 지도 + 패널 내부 스크롤**로 위치와 정보를 같이 유지한다.
