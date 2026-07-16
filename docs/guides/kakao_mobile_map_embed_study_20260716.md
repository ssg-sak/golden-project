# 카카오맵 모바일 임베드 학습서

작성일: 2026-07-16  
관련 통합본: [모바일 시민용 지도+목록 계획·보고 통합본](../reports/mobile_citizen_map_list_integrated_20260716.md)

## 핵심 원칙

1. **UX 레퍼런스와 지도 SDK는 다르다.**  
   피드백의 “네이버처럼”은 마커+목록 동시 표시 UX이고, 구현은 기존 **카카오맵**을 쓴다.
2. **카카오맵은 부모 높이 없이 `height: 100%`면 빈 패널**이 된다.
3. 컨테이너 크기가 나중에 잡히면 **`relayout()`**이 필요하다.
4. 모바일/데스크톱에 지도를 동시에 마운트하지 않는다.
5. **미리보기(마커)와 상세(목록)를 분리**하면 Back 히스토리를 오염시키지 않는다.
6. **직선 Polyline ≠ 도로 경로.** UI에 “직선 미리보기”를 명시한다.

## 1. 왜 빈 패널만 보였는가

### 잘못된 가정

```text
flex 부모
  └─ basis-[42%] + min-h-[12rem]   ← “높이 있을 것”
       └─ 자식 h-full / Map 100%   ← 타일이 그려질 것
```

플렉스 `basis` 비율은 부모의 **확정된 높이**에 의존한다.  
조상이 `min-h-0` + 남은 공간 분배 중이면, 비율 기준이 애매해져 자식 `%` 높이가 0에 가깝게 계산되는 경우가 있다.  
카카오맵 JS는 그 순간의 픽셀 높이로 캔버스를 만들므로 **회색/흰 박스만** 남는다.

### 안전한 패턴

```text
명시적 픽셀/dvh 높이 래퍼
  └─ absolute inset-0
       └─ Map width/height 100%
       └─ onCreate → relayout()
       └─ ResizeObserver → relayout()  (드래그·프리셋 대응)
```

체크 질문:

- 지도 래퍼에 **픽셀로 환산 가능한 높이**가 있는가?
- 크기 변경 후 `ResizeObserver` 또는 `relayout()`가 도는가?

## 2. mobileEmbed variant

데스크톱 전체 지도와 모바일 상단 슬롯은 요구가 다르다.

| | default | mobileEmbed |
|--|---------|-------------|
| 최소 높이 | `min-h-[50vh]` 등 | 부모 명시 높이에 맞춤 |
| 범례 | 일반 | 더 작게 |
| 선택 팬 오프셋 | 바텀시트 가정 | 더 작게 / 미리보기는 오프셋 없음 |
| 키보드 숏컷 | 켜기 | 끄기(터치 우선) |
| 경로 미리보기 | 없음 | `previewHospital` + `Polyline` |

한 컴포넌트를 쓰되 **variant로 분리**하면 데스크톱 회귀를 줄인다.

## 3. 높이 조절: 프리셋 + 드래그

```text
보기 버튼 (균형 / 지도 크게 / 목록 크게)
  → mapHeightPx = 프리셋 픽셀

드래그 핸들 (pointer capture)
  → mapHeightPx = clamp(start + Δy, 120px, 뷰포트 65%)
  → 래퍼 style.height 변경
  → MapRelayout(ResizeObserver) → map.relayout()
```

왜 CSS class 전환만으로 부족한가?  
드래그 중에는 **연속적인 픽셀 값**이 필요하고, 드래그 후에도 프리셋과 같은 상태 소스를 쓰는 편이 단순하다.

## 4. 미리보기 vs 상세

```text
마커 탭  → previewHospital (지도 강조 + 직선 선 + 칩)
목록 탭  → selectedHospital (상세 패널 + history Back)
칩 「상세 보기」 → preview 해제 후 selectedHospital
```

| | previewHospital | selectedHospital |
|--|-----------------|------------------|
| history pushState | 없음 | `useMobileHospitalDetailHistory` |
| Polyline | 있음 (내 위치 있을 때) | 상세 화면에서는 맵 숨김 |
| 목적 | 훑어보기 | 정보·행동 |

물리 Back은 **상세만** 닫아야 하므로, 미리보기를 history에 넣지 않는다.

## 5. 직선 경로 미리보기

백엔드 `/api/routing/eta`는 **ETA·거리만** 주고 도로 좌표열은 없다.  
그래서 3단계는 카카오 `Polyline`으로 **내 위치 → 병원** 직선을 그린다.

- 장점: 추가 SDK/키 없이 방향 감각 제공
- 한계: 실제 도로·일방통행과 다를 수 있음 → 칩에 「직선 미리보기」표시
- ETA 분이 있으면 칩에 함께 표시 (기존 ETA API 재사용)

도로 폴리라인이 필요해지면 Directions/길찾기 API를 **별도 계획**으로 도입한다.

## 6. 폴백

지도는 있으면 좋고, 없어도 **목록 탐색은 되어야** 한다.

```text
kakao.configured && !loading && !error  → 지도+목록
그 외                                   → 안내 문구 + 목록
```

헤더 문구도 상태에 맞게 바꾼다.  
(`카카오맵과 목록으로 비교` vs `목록으로 확인`)

구버전 문구 `지도 없이 목록으로 확인`이 보이면 **옛 번들/미배포 데모**일 가능성이 크다.

## 7. 로컬 확인 절차

1. 백엔드 `8000`, 프론트 `5173` 기동
2. 모바일 폭(또는 기기 모드)으로 http://127.0.0.1:5173 열기
3. 헤더가 `카카오맵과 목록으로 비교`인지 확인
4. 지도 타일·병원 마커·목록 스크롤 확인
5. 보기 프리셋·드래그 핸들로 높이 변경 후 타일이 깨지지 않는지 확인
6. 마커 탭 → 직선 선·칩 → 「상세 보기」→ Back → 목록+지도
7. 목록 카드 → 상세 → Back

## 8. 관련 코드

| 개념 | 파일 |
|------|------|
| 모바일 셸 | `MobileCitizenHospitalBrowser.tsx` |
| 카카오맵 | `CitizenMapComponent.tsx` |
| relayout | `MapRelayout.tsx` |
| 키 설정 | `shared/config/kakao.ts`, `VITE_KAKAO_MAP_APP_KEY` |
| 상세 Back | `useMobileHospitalDetailHistory.ts` |

## 한 줄 요약

모바일 카카오맵 임베드는 **명시적 높이 + relayout + 목록 폴백**이 기본이고,  
높이는 **프리셋·드래그**, 비교는 **마커 미리보기(직선) / 목록 상세**로 나눈다.  
네이버는 따라 할 UX일 뿐 SDK를 바꾸지 않는다.
