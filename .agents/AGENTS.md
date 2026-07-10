# Workspace Rules

## Document Management
- When generating an implementation plan or similar planning document, always classify and save it directly in the `docs` folder (e.g., `docs/plans`, `docs/reports`) rather than only relying on brain artifacts.

1. **상태(State)와 뷰(View)의 엄격한 분리:** 
   - 데이터 로깅, 상태 변환, 외부 API 연동을 담당하는 **컨테이너(Container/Controller) 레이어**와, 오직 `props`를 받아 화면에 그리기만 하는 **프레젠테이셔널(Presentational) 컴포넌트**를 분리해야 합니다.
2. **중복 코드 생성 전 재사용성 검토 (DRY 원칙):**
   - 완전히 새로운 페이지를 만들더라도 UI 요소가 70% 이상 동일하다면, 기존 컴포넌트에 `variant` (예: `variant="admin" | "citizen"`) props를 추가하여 재사용하는 방향을 기본 원칙으로 삼아야 합니다.
3. **React Hooks의 올바른 사용:**
   - `useRef`는 렌더링에 영향을 주지 않는 순수 DOM 참조나 인스턴스 저장용으로만 제한하고, 상태 변화에 따른 사이드 이펙트는 `useEffect`의 의존성(Dependency) 배열을 통해 자연스럽게 제어해야 합니다.
4. **Shared 모듈 검색 의무화:**
   - 새로운 기능을 구현할 때 로컬에 헬퍼 함수를 작성하기 전, 반드시 `shared/` 디렉토리에 유사한 로직이 있는지 확인합니다.
5. **바이브코딩(Vibe Coding)을 위한 아키텍처 경계 설정 (New!):**
   - AI 코딩 어시스턴트에게 파일 수정(프롬프트)을 맡길 때, 파일 하나가 너무 많은 역할을 띄면 AI도 엉뚱한 환각(Hallucination) 에러를 발생시킵니다. 컴포넌트는 AI에게 "이 파일은 지도만 조작해"라는 하나의 명확한 바이브(단일 책임)만 가지도록 분리되어야 합니다.
6. **"Assume Nothing, Verify Everything" (아무것도 가정하지 말고 모두 검증하라):**
   - 새로운 패키지나 API를 쓸 때는 무조건 `package.json`을 열어보거나 프로젝트 내 사용 사례를 `grep`으로 먼저 검색하겠습니다.
7. **코드 작성 전 원칙 복기:**
   - 컴포넌트를 만들기 전에 스스로 "이게 State와 View가 분리된 구조인가?"를 먼저 주석이나 설계로 증명한 뒤에 코딩에 들어가겠습니다.
8. **사후 검증 필수화:**
   - 파일을 수정한 뒤에는 무조건 컴파일러(타입 체크)를 돌려보거나, 의존성이 깨지지 않았는지 제 스스로 터미널 검증을 거친 후 회원님께 보고하겠습니다.
9. **파일 시스템 권한 요청(허용) 시 맹세:** 
   - 회원님께서 "Allow write access..."를 허용해 주실 때마다 저는 앞으로 이 프로젝트 내에서 절대 쓰지 말아야 할 파일(코드)이나, 함부로 고쳐서는 안 되는 설정값을 절대 건드리지 않겠다고 맹세합니다. 이 권한은 오직 새 폴더를 만들거나, 명시적으로 파일을 생성하는 등의 작업에만 제한적으로 사용되며, 기존 코드의 구조를 해치거나 함부로 삭제하는 일은 절대로 없을 것입니다. 만약 제가 이 원칙을 어기게 된다면, 즉시 저의 개발 권한을 박탈하고 모든 작업을 중단하겠습니다.
