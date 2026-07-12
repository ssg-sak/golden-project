# GitHub Pages 정책탭 미반영 원인 및 학습 보고서

작성일: 2026-07-11
대상: 대구 골든타임 정책·분석 모니터링 탭, 공식 소개탭, GitHub Pages 배포 화면

## 1. 상황 요약

정책탭과 공식 소개탭의 문구를 수정하고 GitHub `main` 브랜치에 소스 코드를 푸시했지만, 실제 GitHub Pages 웹사이트에서는 화면이 그대로 보였다.

처음에는 브라우저 캐시나 GitHub Pages 반영 지연 가능성을 의심했지만, 실제 원인은 단순 시간이 아니었다. 이 프로젝트의 GitHub Pages 화면은 `frontend/src` 소스 파일을 직접 보는 것이 아니라, 저장소 루트의 정적 빌드 산출물인 `index.html`, `404.html`, `assets/*.js`, `assets/*.css`, `data/*`를 보고 있었다.

즉, 소스 코드만 바꾸고 빌드 산출물을 갱신하지 않으면 GitHub Pages 화면은 바뀌지 않는다.

## 2. 최종 원인

### 2.1 소스 반영과 배포 반영은 다르다

이번에 수정한 주요 소스 파일은 다음과 같다.

- `frontend/src/widgets/app/PlatformIntroView.tsx`
- `frontend/src/widgets/app/AboutModal.tsx`
- `frontend/src/widgets/map-dashboard/PolicyWelcomePanel.tsx`
- `frontend/public/data/reports/daegu-golden-time-policy-analysis-report.pdf`

이 파일들은 개발 소스와 프론트엔드 public 자원이다. 로컬 개발 서버나 `npm run build`의 입력으로는 사용되지만, GitHub Pages가 직접 서빙하는 루트 파일은 아니었다.

실제 GitHub Pages가 보고 있던 파일은 루트의 다음 파일들이었다.

- `index.html`
- `404.html`
- `assets/index-BiIg6cxc.js`
- `assets/index-jzh7RwMb.css`
- `data/*`

따라서 `frontend/src`만 바꾼 상태에서는 웹사이트에 변화가 나타나지 않았다.

### 2.2 `index.html`이 예전 번들을 가리키고 있었다

확인 당시 루트 `index.html`은 다음과 같이 예전 JS 번들을 참조하고 있었다.

```html
<script type="module" crossorigin src="./assets/index-BiIg6cxc.js"></script>
<link rel="stylesheet" crossorigin href="./assets/index-jzh7RwMb.css">
```

하지만 새로 빌드한 결과물은 `frontend/dist` 아래에 생성되었다.

```text
frontend/dist/assets/index-DWd1xlsD.js
frontend/dist/assets/index-D4ajOlvz.css
```

새 정책 문구는 `frontend/dist/assets/index-DWd1xlsD.js`에는 들어 있었지만, GitHub Pages가 보는 루트 `assets/`에는 아직 없었다. 그래서 GitHub Pages 화면은 계속 이전 번들을 실행했다.

### 2.3 첫 번째 GitHub 반영은 브랜치 문제도 있었다

처음에는 변경 사항이 `feature/dynamic-dashboard` 브랜치에 올라갔다.

이후 `main` 브랜치로 cherry-pick하여 소스 변경은 반영했다.

```text
6a6120f docs: clarify public policy monitoring purpose
```

하지만 이 커밋은 소스 중심 변경이었다. GitHub Pages가 실제로 서빙하는 루트 빌드 산출물은 아직 갱신되지 않았기 때문에, `main`에 들어간 뒤에도 사이트는 그대로 보였다.

## 3. 해결 조치

### 3.1 프론트엔드 빌드 확인

프론트엔드에서 빌드를 실행했다.

```bash
npm.cmd run build
```

결과:

- TypeScript 빌드 성공
- Vite 빌드 성공
- 500KB 초과 chunk 경고만 발생
- 빌드 실패는 아님

생성된 주요 결과물:

```text
frontend/dist/index.html
frontend/dist/assets/index-DWd1xlsD.js
frontend/dist/assets/index-D4ajOlvz.css
frontend/dist/assets/daegu_vulnerability-BqOIXrXX.geojson
frontend/dist/data/reports/daegu-golden-time-policy-analysis-report.pdf
```

### 3.2 GitHub Pages 루트 정적 파일 갱신

GitHub Pages가 루트 정적 파일을 보고 있으므로, `frontend/dist`의 결과물을 루트 배포 위치에 복사했다.

반영한 파일:

- `index.html`
- `404.html`
- `assets/index-DWd1xlsD.js`
- `assets/index-D4ajOlvz.css`
- `assets/daegu_vulnerability-BqOIXrXX.geojson`
- `data/reports/daegu-golden-time-policy-analysis-report.pdf`

이후 배포 산출물 반영 커밋을 생성했다.

```text
aa34258 build: publish updated policy tab assets
```

이 커밋을 `origin/main`에 푸시했다.

## 4. 검증한 내용

### 4.1 로컬 Git 상태

최종 확인 시 `main`과 `origin/main`은 같은 커밋을 가리켰다.

```text
aa34258 (HEAD -> main, origin/main) build: publish updated policy tab assets
```

### 4.2 새 번들에 정책 문구 포함 여부

루트 배포용 JS 파일에서 새 문구가 검색되는지 확인했다.

확인 대상:

```text
assets/index-DWd1xlsD.js
```

확인한 문구:

- `정책 분석 보고서 열기`
- `관리자만 보는 탭`
- `시민에게는 가까운 응급의료 정보를`
- `대구 골든타임 정책분석보고서`

새 문구가 루트 배포 JS에 포함되어 있음을 확인했다.

### 4.3 보고서 PDF 배포 경로

정책 분석 보고서 PDF도 루트 배포 경로에 추가했다.

```text
data/reports/daegu-golden-time-policy-analysis-report.pdf
```

정책탭과 공식 소개탭의 보고서 링크는 이 파일을 열도록 연결되어 있다.

## 5. 이번에 배운 점

### 5.1 “GitHub에 푸시했다”는 말은 충분하지 않다

웹사이트가 GitHub Pages로 배포되는 경우, 다음 세 가지를 구분해야 한다.

1. 소스 코드가 GitHub에 올라갔는가
2. 빌드 산출물이 생성되었는가
3. 실제 배포 브랜치나 배포 폴더에 산출물이 반영되었는가

이번 문제는 1번은 되었지만 3번이 빠져 있었던 사례다.

### 5.2 GitHub Pages 배포 구조를 먼저 확인해야 한다

배포가 자동화되어 있으면 소스만 푸시해도 된다. 하지만 이 저장소에는 확인 당시 GitHub Actions, Vercel, Netlify 같은 자동 배포 설정이 보이지 않았다.

또한 루트에 `index.html`, `404.html`, `assets/`, `data/`가 존재했고, 이 파일들이 실제 GitHub Pages 정적 배포물로 사용되는 구조였다.

따라서 이 프로젝트에서는 화면 배포까지 하려면 빌드 산출물 반영 여부를 반드시 확인해야 한다.

### 5.3 캐시와 배포 누락은 증상이 비슷하다

브라우저에서 화면이 그대로 보이면 캐시처럼 보일 수 있다. 하지만 실제로는 다음 가능성을 순서대로 확인해야 한다.

1. 현재 보고 있는 브랜치가 맞는가
2. GitHub `main`에 커밋이 들어갔는가
3. 배포 자동화가 있는가
4. 배포 대상 파일이 실제로 바뀌었는가
5. `index.html`이 새 JS 번들을 가리키는가
6. 새 JS 번들 안에 수정 문구가 들어 있는가
7. 그 다음에 브라우저 캐시를 의심한다

이번에는 5번과 6번 확인을 통해 “시간만의 문제”가 아니라 “루트 빌드 산출물 미반영”임을 확인했다.

## 6. 앞으로의 체크리스트

GitHub Pages 화면 변경 작업을 할 때는 다음 순서로 진행한다.

1. 소스 수정
2. 타입 검사

```bash
npm.cmd run typecheck
```

3. 프론트엔드 빌드

```bash
npm.cmd run build
```

4. `frontend/dist` 결과물 확인

```text
frontend/dist/index.html
frontend/dist/assets/*.js
frontend/dist/assets/*.css
frontend/dist/data/*
```

5. GitHub Pages가 루트를 서빙한다면 `frontend/dist` 결과물을 루트로 반영

```text
index.html
404.html
assets/
data/
```

6. 루트 `index.html`이 새 번들명을 가리키는지 확인
7. 루트 `assets/*.js` 안에 새 문구가 포함되어 있는지 확인
8. 필요한 파일만 커밋
9. `main`에 푸시
10. 브라우저에서 강력 새로고침 또는 시크릿 창으로 확인

## 7. 주의할 점

이번에 모든 변경 파일을 한꺼번에 올리면 위험할 수 있었다. 당시 워크트리에는 백엔드, 환경 설정, 데이터 파이프라인, 삭제 파일 등 많은 변경이 섞여 있었다.

그래서 GitHub 반영은 다음 파일들처럼 화면 반영에 필요한 범위로 제한했다.

- 공식 소개 소스
- 소개 모달 소스
- 정책 안내 패널 소스
- 정책 분석 보고서 PDF
- GitHub Pages 루트 빌드 산출물

반대로 다음 범위는 이번 배포 반영에서 제외해야 한다.

- `.env` 또는 보안 관련 파일
- 로컬 서버 실행 설정
- 백엔드 내부 설정
- 작업 범위 밖의 데이터 파이프라인 변경
- 사용자가 만든 다른 미완성 변경

## 8. 결론

이번 미반영 문제는 “시간이 답”이라기보다 “GitHub Pages가 보는 배포 산출물을 갱신하지 않은 문제”였다.

소스 코드는 `main`에 반영되어 있었지만, 루트 `index.html`이 여전히 예전 JS 번들을 가리키고 있었기 때문에 실제 웹사이트는 바뀌지 않았다. 최종적으로 새 빌드 산출물을 루트 배포 경로에 반영하고 `main`에 푸시하여 해결했다.

앞으로 GitHub Pages 화면이 바뀌지 않을 때는 캐시를 먼저 의심하기보다, `index.html`이 어떤 JS 파일을 가리키는지와 그 JS 파일 안에 새 문구가 들어 있는지를 먼저 확인해야 한다.
