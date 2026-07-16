# 모바일 병원 상세 UX 개선 보고서

작성일: 2026-07-16  
대상: 모바일 시민용 병원 목록 · 병원 상세 화면  
기준: GitHub 데모와 동일 소스 (`frontend` → `build` / `build:demo`)

## 목적

모바일에서 병원 상세를 볼 때 발생하던 뒤로가기, 스크롤, 상단 UI 가독성 문제를 해결했다.  
안드로이드 물리 Back이 앱을 종료하지 않고 목록으로 돌아가게 하고, 상세는 항상 상단부터 열리며, 헤더 뒤로 본문이 비치지 않도록 정리했다.

## 문제와 개선 결과

| 영역 | 기존 문제 | 개선 결과 |
|------|-----------|-----------|
| 안드로이드 물리 Back | 상세 상태가 히스토리에 없어 브라우저/탭이 종료되는 흐름 | 상세 진입 시 `pushState`, Back 시 목록 복귀 |
| 닫기 경로 | 「병원 목록으로」와 Back이 서로 다른 상태 경로 | `closeDetail()`로 단일화 |
| 상세 스크롤 | 이전 병원의 스크롤 위치가 남을 수 있음 | 병원명 변경 시 `scrollTop = 0` |
| 스크롤 구조 | 외부·내부 스크롤 경계 불명확 | 외부 `overflow-hidden`, 본문만 `overflow-y-auto` |
| 상단 반투명 | 핸들·목록 버튼·GNB 뒤로 콘텐츠 비침 | `bg-white` 불투명 처리 |
| 버튼·병원명 겹침 | 고정 목록 버튼이 헤더와 겹침 | 상세 영역에 `pt-14` 확보 |

## 구현 요약

### 1. 히스토리 기반 Back

신규 훅: `frontend/src/shared/hooks/useMobileHospitalDetailHistory.ts`

- 상세가 열릴 때 `history.pushState({ mobileCitizenHospitalDetail: true, hospitalName })`
- 이미 상세 히스토리 상태면 **중복 push 하지 않음** (병원 A → B 전환 시 히스토리 1단만 유지)
- `popstate`에서 상세가 열려 있으면 `onHospitalSelect(null)`
- 「병원 목록으로」는 `closeDetail()` → 상세 히스토리면 `history.back()`, 아니면 상태만 닫기
- 필터 변경 등으로 상세가 외부에서 닫히면 `replaceState`로 상세 플래그 정리

### 2. 상세 패널 스크롤·레이아웃

수정: `frontend/src/widgets/map-dashboard/HospitalDetailPanel.tsx`

- 핸들: `bg-white/50 backdrop-blur-md` → `bg-white`
- 본문 스크롤 컨테이너에 `ref` + `hospital.name` 변경 시 상단 초기화 (`requestAnimationFrame`)
- `overscroll-contain`으로 스크롤 체이닝 완화

### 3. 모바일 브라우저 셸

수정: `frontend/src/widgets/app/MobileCitizenHospitalBrowser.tsx`

- `closeDetail` 연결
- 상세 wrapper: `overflow-hidden` + `pt-14`
- 목록 복귀 버튼: `bg-white` (반투명·blur 제거)

### 4. 전역 네비게이션

수정: `frontend/src/widgets/app/GlobalNavigationBar.tsx`

- 모바일/데스크톱 공통으로 GNB·탭 바를 불투명 `bg-white`로 통일

## 변경 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/shared/hooks/useMobileHospitalDetailHistory.ts` | 히스토리 push / pop / close 통합 |
| `frontend/src/widgets/app/MobileCitizenHospitalBrowser.tsx` | 모바일 목록·상세 셸, 닫기·레이아웃 |
| `frontend/src/widgets/map-dashboard/HospitalDetailPanel.tsx` | 스크롤 초기화, 핸들 불투명 |
| `frontend/src/widgets/app/GlobalNavigationBar.tsx` | 상단 헤더 불투명 |
| `tests/unit/frontend/mobile-hospital-detail-history.test.ts` | 히스토리 헬퍼 단위 테스트 |

## 검증 결과

| 검증 | 결과 |
|------|------|
| `npm run typecheck` | 통과 |
| `npm test` | 6 파일 · 18 테스트 통과 (히스토리 헬퍼 3건 포함) |
| `npm run build` | 통과 (로컬 프로덕션) |
| `npm run build:demo` | 통과 (GitHub 데모 모드) |

### 수동 확인 권장

1. 모바일 뷰포트에서 병원 선택 → 상세 오픈
2. 「병원 목록으로」 → 목록 복귀
3. 상세에서 브라우저 Back / 안드로이드 물리 Back → 목록 복귀 (탭 종료 아님)
4. 목록에서 Back → 기존 브라우저 동작 유지
5. 병원 A 상세에서 스크롤 후 병원 B 선택 → B는 상단부터 표시
6. 스크롤 중 상단 핸들·GNB·목록 버튼 뒤로 본문이 비치지 않음

## 영향 범위

- **직접**: 모바일 시민용 병원 목록/상세, 브라우저 Back
- **간접**: iOS 스와이프 Back, GNB 배경(전 화면 공통 불투명)
- **비영향 목표**: 데스크톱 시민 지도·사이드바 선택 로직은 기존 `CitizenView` 상태 유지. 히스토리 훅은 모바일 브라우저 컴포넌트에서만 사용

## 남은 리스크

| 리스크 | 대응 상태 |
|--------|-----------|
| 필터/중증질환 변경으로 상세가 닫힐 때 히스토리 잔여 | `replaceState`로 상세 플래그 해제 |
| 전역 body scroll lock 부작용 | 적용하지 않음. 컴포넌트 내부 스크롤로 해결 |
| 정책(관리자) 모바일 바텀시트의 유사 패턴 | 이번 범위 외. 시민 상세만 우선 적용 |

## 관련 문서

- 학습서: [모바일 브라우저 히스토리·상세 UX 학습서](../guides/mobile_browser_history_ux_study_20260716.md)
- 계획 기준: 사용자 제공 「모바일 병원 상세 UX 피드백 개선 계획서」(2026-07-16)
