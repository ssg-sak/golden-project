# 🔍 [3차 총점검] 목적에 맞지 않게 뭉쳐진 '뚱뚱한 녀석들' 추가 분해 계획

사용자님의 예리한 지적대로, 프로젝트 전체를 다시 한 번 스캔해 보았습니다. 프론트엔드와 백엔드 양쪽 모두에서 여전히 본연의 목적을 상실하고 여러 기능이 억지로 뭉쳐진 **'뚱뚱한 녀석들(Fat Modules)'**을 2곳 더 발견했습니다.

이에 따라 "하나의 목적에는 하나의 파일"이라는 원칙을 완벽하게 관철하기 위한 3차 해체 계획을 제안합니다.

---

## 🚨 발견된 '뚱뚱한 녀석들'과 문제점

### Target 1. [Frontend] `HospitalSidebar.tsx` (약 250줄)
현재 시민용 앱의 사이드바 하나에 너무 많은 책임이 뭉쳐져 있습니다.
- **문제점**: 상단 안내 문구, 진료 대상 필터(성인/소아), 스위치 토글(진료 가능 병원만 보기), 그리고 수십 개의 병원 목록을 렌더링하는 로직이 하나의 파일에 믹스되어 있습니다.
- **해결책**: 이를 목적에 맞게 **필터 제어부(Controls)**와 **목록 렌더링부(List)**로 명확히 분할합니다.

### Target 2. [Backend] `hospital_realtime.py` (약 340줄) - 백엔드 최악의 God Module
실시간 병상 데이터를 가져오는 이 파일은 혼자서 무려 3가지 역할을 억지로 수행하고 있습니다.
- **문제점**: 
  1) `SafetyData` API 통신 및 데이터 파싱
  2) `공공데이터포털(Data.go.kr)` API 통신 및 XML 파싱
  3) 이 두 가지를 통합하여 In-Memory Cache에 병합하는 비즈니스 로직
  이렇게 이질적인 외부 API 클라이언트 2개가 하나의 파일에 하드코딩되어 얽혀있어, 새로운 API가 추가될 경우 파일이 무한정 길어질 수밖에 없는 구조입니다.
- **해결책**: API 연동 목적에 따라 클라이언트를 별도 파일로 완전히 분리(Adapter Pattern)해야 합니다.

---

## 🛠️ Proposed Changes (개선 계획)

### [Phase 1: Frontend] HospitalSidebar 다이어트
현재 하나의 덩어리인 `HospitalSidebar`를 3개의 조각으로 해체합니다.

#### [NEW] `frontend/src/widgets/map-dashboard/HospitalSidebarControls.tsx`
- 사용자 필터 제어(진료 대상 선택 버튼, 진료 가능 토글 스위치 등) 렌더링과 이벤트만을 전담.
#### [NEW] `frontend/src/widgets/map-dashboard/HospitalSidebarList.tsx`
- 병원 목록 배열을 넘겨받아 무한 스크롤 및 개별 병원 카드 렌더링만을 전담.
#### [MODIFY] `frontend/src/widgets/map-dashboard/HospitalSidebar.tsx`
- 위의 2개 모듈을 불러와서 조립만 하는 가벼운 껍데기 레이아웃으로 변경.

### [Phase 2: Backend] 실시간 API 연동 모듈 해체
백엔드 연동부를 전략 패턴(Strategy) 혹은 어댑터(Adapter) 패턴 형식으로 분리합니다.

#### [NEW] `backend/app/services/api_clients/safety_data_client.py`
- Safety Data 포털과의 통신, JSON 파싱, 에러 처리 전담.
#### [NEW] `backend/app/services/api_clients/data_go_kr_client.py`
- 공공데이터포털과의 통신, 시군구 루프 처리, XML 파싱 전담.
#### [MODIFY] `backend/app/services/hospital_realtime.py`
- 통신 로직을 걷어내고, 위 두 클라이언트 중 어떤 것을 쓸지 결정하여 최종 데이터 구조를 조립하는 '오케스트레이터' 역할만 수행하도록 경량화.

---

> [!IMPORTANT]
> **사용자 리뷰 요청**
> 
> "목적에 맞는 분리가 중요하다"는 기조를 프론트엔드의 남은 잔재들뿐만 아니라 **백엔드 코어 시스템(API 연동부)**까지 확대 적용하는 강력한 아키텍처 개선안입니다.
> 
> 이 방향성이 맞으시다면 우측 하단의 **"Proceed(진행)"** 버튼을 눌러주세요. 즉시 프론트엔드/백엔드 동시 해체 수술에 돌입하겠습니다!
