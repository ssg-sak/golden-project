Codex 작업 지시서 — 2026년 8월 개선

저장소에 넣을 위치: docs/plans/active/CODEX_TASKS_2026-08.md 이 저장소는 이미 AGENTS.md(v1.1)와 .agents/*.md 규약을 갖고 있으므로, Codex는 그 규칙을 먼저 읽고 따릅니다. 이 문서는 그 규약 위에 얹는 작업 명세입니다.

0. 사용 방법 — 한 번에 하나씩

이 저장소의 기존 방식(agent/<주제> 토픽 브랜치 → PR → 머지, 41건 실적)이 이미 검증되어 있습니다. 그 방식을 그대로 유지하세요.

TASK 1개 = 브랜치 1개 = PR 1개 = 커밋 1~2개

❌ 하지 말 것: "이 문서 전체를 다 해줘" 라고 한 번에 던지기 ✅ 할 것: TASK 1 → 검증 → PR 머지 → TASK 2 → …

이유는 두 가지입니다.

한 번에 여러 곳을 고치면 어느 변경이 결과를 바꿨는지 추적 불가합니다. 이 프로젝트는 해시 계약으로 결과를 고정하므로 특히 위험합니다.
본인이 각 변경을 이해하지 못한 채 코드만 늘어나면 이 작업의 목적 자체가 무너집니다. 각 TASK 끝에 자가검증 관문을 뒀습니다. 통과 못 하면 다음 TASK로 넘어가지 마세요.
1. 모든 프롬프트 앞에 붙일 공통 헤더

Codex 대화창에 매번 이 블록을 먼저 붙이세요.

text
[공통 규칙]
- 저장소 루트의 AGENTS.md(v1.1)와 .agents/AI_DATA_AGENTS.md를 먼저 읽고 그 규칙을 따른다.
- 기존 구조·네이밍·코딩 스타일을 유지한다. 전체 파일 재작성 금지, 최소 변경만 수행한다.
- 지시된 파일 외에는 수정하지 않는다. 리팩터링을 임의로 확대하지 않는다.
- Python 코드에는 타입 힌트를 명시한다.
- 주석은 "무엇을 하는지"가 아니라 "왜 이렇게 했는지"를 쓴다.
- 확실하지 않으면 추측하지 말고 "확인이 필요합니다"라고 답한다.
- 작업 후 반드시 지정된 검증 명령을 실행하고 결과를 보고한다.
- 커밋 메시지는 Conventional Commits(한국어 본문)를 따른다.
⚠️ 라이브러리 추가에 대한 사전 승인

AGENTS.md 3번은 AI의 임의 라이브러리 추가를 금지합니다. scipy는 사람이 명시적으로 승인한 것이므로, 프롬프트에 아래를 함께 넣어 규칙 위반이 아님을 알려주세요.

text
[라이브러리 승인]
scipy 도입은 사람이 승인함. 근거는 다음과 같다.
- 사용 이유: Spearman 순위상관의 동점(tie) 평균 순위 처리와 p-value가 필요하고,
  최근접 탐색에 공간 인덱스(KD-트리)가 필요하다.
- 장점: 표준 구현이라 통계 정의와 일치하며, 직접 구현한 코드보다 신뢰할 수 있다.
- 단점: 의존성이 1개 늘어난다.
- 기존 방식과의 차이: 현재는 statistics 모듈로 Pearson을 직접 구현해 Spearman을 흉내내며,
  동점 처리가 누락되어 정의와 어긋난다.
- 설치 부담 없음: scikit-learn이 이미 scipy를 필수 의존성으로 설치한다.
TASK 1 — 분석 의존성 선언 파일 신설

브랜치: agent/analysis-requirements 난이도: 낮음 / 소요: 20분

배경

ai-model/과 scripts/는 scikit-learn·numpy·matplotlib·seaborn·geopandas를 사용하지만, 어떤 requirements 파일에도 선언되어 있지 않습니다. backend/requirements.txt만 설치해서는 분석 파이프라인이 실행되지 않아 재현성이 깨집니다.

복붙용 프롬프트
text
[공통 규칙 + 라이브러리 승인 블록을 여기 붙임]

[작업]
저장소 루트에 requirements-analysis.txt 를 새로 만든다.

포함할 패키지: 분석·모델링 파이프라인(ai-model/, scripts/, backend/scripts/)이
실제로 import 하는 것만 넣는다. 실제 import 문을 확인한 뒤 목록을 확정할 것.
최소한 다음은 포함된다: scipy, scikit-learn, numpy, pandas, geopandas, shapely,
matplotlib, seaborn.
버전은 backend/requirements.txt 와 동일한 하한 표기 방식(>=)을 따른다.

그리고 README.md 의 "8. 실행 방법 > 정책 분석 파이프라인" 절에
이 파일을 설치하는 절차를 한 줄 추가한다.

[검증]
- 각 패키지가 실제로 import 되는 파일 경로를 근거로 제시할 것.
- backend/requirements.txt 는 수정하지 말 것(서비스와 분석의 의존성 경계를 유지).

[커밋]
chore: 분석 파이프라인 의존성 파일 분리
자가검증 관문
 왜 backend/requirements.txt에 합치지 않고 파일을 나눴는지 한 문장으로 설명할 수 있다. → "서비스 컨테이너에 분석용 무거운 패키지를 싣지 않으려고 경계를 나눴다"
TASK 2 — Spearman 순위상관을 scipy로 교체 ⭐최우선

브랜치: agent/scipy-spearman 난이도: 중 / 소요: 40분

배경

scripts/vdi_sensitivity.py는 순위를 직접 만들고(_ranks) Pearson을 직접 계산해(_pearson) Spearman을 흉내냅니다. 동점(tie)을 이름 순으로 임의 배정하는데, 정확한 Spearman은 동점에 평균 순위를 부여해야 합니다. 정의와 어긋난 구현입니다.

복붙용 프롬프트
text
[공통 규칙 + 라이브러리 승인 블록을 여기 붙임]

[대상] scripts/vdi_sensitivity.py

[문제]
현재 _ranks() 는 동점 점수를 이름 사전순으로 임의 배정한다.
표준 Spearman 순위상관은 동점에 평균 순위(average rank)를 부여해야 하므로
현재 구현은 통계적 정의와 어긋난다.

[작업]
1. scipy.stats.spearmanr 를 사용하도록 _comparison() 을 수정한다.
2. 반환 dict 에 "spearman_p_value" 키를 추가한다.
3. 순위 산출도 동점 평균 순위를 쓰도록 수정한다
   (scipy.stats.rankdata 사용을 검토하고, 선택 이유를 주석으로 남길 것).
4. 더 이상 쓰이지 않게 된 _pearson() 등 죽은 코드는 제거한다.
5. top10_overlap_count / median_absolute_rank_shift /
   maximum_absolute_rank_shift 의 의미와 계산 방식은 그대로 유지한다.

[금지]
- calculate_vdi_rank_sensitivity() 의 반환 구조(키 이름)를 기존 키에 대해 바꾸지 말 것.
  추가는 허용, 변경·삭제는 금지.
- 다른 파일 수정 금지.

[검증]
1. python -X utf8 scripts/vdi_sensitivity.py 를 실행해 정상 출력 확인
2. 교체 전후의 spearman_rank_correlation 값을 비교해 보고할 것.
   값이 달라졌다면 "동점 처리 방식이 바뀌었기 때문"인지 확인하고 근거를 설명할 것.
3. python -X utf8 -m pytest tests/ -q 전체 통과 확인

[커밋]
refactor: 순위 상관 계산을 scipy.stats.spearmanr로 교체

수동 구현한 순위 산출이 동점을 이름순으로 임의 배정해 Spearman 정의와
어긋났다. scipy로 교체해 동점 평균 순위를 적용하고 p-value를 함께 기록한다.
작성자 이해 점검
 Pearson과 Spearman의 차이를 설명할 수 있다.
 동점 처리가 왜 문제인지, 평균 순위가 무슨 뜻인지 설명할 수 있다.
 p-value가 여기서 무엇을 의미하는지 말할 수 있다. ("두 순위 배열의 상관이 우연히 나올 확률")
 교체 전후 값이 얼마나 달라졌는지 숫자로 말할 수 있다.
TASK 3 — 최근접 응급기관 탐색을 KD-트리로

브랜치: agent/kdtree-nearest 난이도: 중 / 소요: 60분

배경

backend/scripts/spatial_analysis.py는 행정동 150개마다 병원 전체와 거리를 비교합니다(O(n×m)). 공간 인덱스를 쓰면 O(n log m)이 되고, 전국 확장 시 차이가 커집니다.

⚠️ 이 작업의 위험 요소

이 프로젝트는 분석 계약과 SHA-256 해시로 결과를 고정합니다. 거리 계산 방식을 바꿔 값이 미세하게 달라지면 릴리스 검증이 실패할 수 있습니다. 그래서 "결과값이 동일해야 한다"를 수용 기준에 반드시 넣습니다.

복붙용 프롬프트
text
[공통 규칙 + 라이브러리 승인 블록을 여기 붙임]

[대상] backend/scripts/spatial_analysis.py 의 compute_distances_and_index()

[작업]
행정동 centroid 마다 병원 전체를 순회하며 최소 거리를 구하는 루프를
scipy.spatial.cKDTree 질의로 교체한다.

- 투영 좌표계(EPSG:5179)에서 수행하므로 유클리드 거리가 곧 미터다.
- tree.query(..., k=1) 로 최근접 거리와 인덱스를 동시에 얻는다.
- 기존과 동일하게 km 단위로 소수점 3자리 반올림한다.
- 왜 KD-트리를 쓰는지(확장 시 O(n*m) → O(n log m))를 주석에 남긴다.

[절대 조건 — 결과 동일성]
이 프로젝트는 분석 계약과 SHA-256 해시로 결과를 고정한다.
따라서 min_dist_to_hospital, vdi_log, vdi_norm, vulnerability_index 의
값이 교체 전과 완전히 동일해야 한다.

작업 순서:
1. 먼저 현재 코드로 산출물을 만들고 값을 보관한다.
2. 교체 후 다시 산출해 두 결과를 행정동 150개 전부에 대해 대조한다.
3. 한 건이라도 다르면 원인을 설명하고, 해결 못 하면 되돌린 뒤 보고한다.

[금지]
- vulnerability_index 산식 자체는 절대 변경하지 말 것.
- 08_compute_vulnerability_geojson.py 는 건드리지 말 것(TASK 7에서 정리 예정).

[검증]
1. 150개 행정동 전부에 대한 값 일치 대조 결과를 표로 보고
2. python -X utf8 -m pytest tests/ -q 전체 통과
3. 가능하면 교체 전후 실행 시간을 time.perf_counter() 로 측정해 보고

[커밋]
perf: 최근접 응급기관 탐색을 cKDTree로 전환

행정동마다 기관 전체를 순회하던 O(n*m) 비교를 KD-트리 질의로 바꿔
전국 단위 확장에 대비한다. 산출값은 기존과 동일함을 150개 전수 대조로 확인했다.
작성자 이해 점검
 KD-트리가 왜 빠른지 한 문장으로 설명할 수 있다.
 왜 EPSG:5179에서 계산해야 하는지 설명할 수 있다. (위경도는 각도라 유클리드 거리가 실제 거리가 아님)
 150개 규모에서는 왜 차이가 안 나는지, 언제부터 차이가 나는지 말할 수 있다.
TASK 4 — 도로 접근성 점수 계산 벡터화 ⭐pandas 실적

브랜치: agent/vectorize-road-accessibility 난이도: 중상 / 소요: 2~3시간

배경

ai-model/build_actual_road_accessibility.py의 apply_actual_road_results()는 for 루프 2개로 점수를 계산·주입합니다. 그리고 normalize(raw_scores, score)가 feature마다 min/max를 다시 계산해 O(n²)가 됩니다.

복붙용 프롬프트
text
[공통 규칙]

[대상] ai-model/build_actual_road_accessibility.py 의
       apply_actual_road_results() 와 normalize()

[문제]
1. 점수 계산과 주입이 각각 for 루프로 되어 있어 pandas 벡터 연산을 쓰지 않는다.
2. normalize(raw_scores, score) 가 feature 마다 min()/max() 를 다시 계산한다.
   행정동 150개면 min/max 를 150번 반복하는 O(n^2) 낭비다.

[작업]
1. 점수 계산부를 pandas DataFrame 기반 벡터 연산으로 재작성한다.
   - matrix["districts"] 를 DataFrame 으로 만든다.
   - GeoJSON feature 의 adm_nm 과 merge 한다.
     merge 시 validate="one_to_one" 으로 조인 카디널리티를 검증한다.
   - 중첩된 nearest_emergency_resource 는 pd.json_normalize 로 평탄화한다.
   - VDI = np.log1p(eta) * population 을 벡터 연산 1회로 계산한다.
2. min-max 정규화는 min/max 를 한 번만 계산하도록 고친다.
3. 매칭되지 않는 행정동은 기존과 동일하게 population=0, eta=0.0 으로 처리한다.

[절대 조건 — 결과 동일성]
actual_road_vdi_log, travel_time_vdi_log, vulnerability_index, vdi_log, vdi_norm
값이 교체 전과 완전히 동일해야 한다.
작업 전 산출물을 보관하고, 교체 후 150개 행정동 전부를 대조해 보고할 것.
한 건이라도 다르면 원인을 설명하고 해결 못 하면 되돌린다.

[금지]
- 산식 변경 금지. 리팩터링만 수행한다.
- GeoJSON 출력 구조(properties 키 이름·순서)를 바꾸지 말 것.
- 같은 파일의 다른 함수는 건드리지 말 것.

[검증]
1. 150개 행정동 값 전수 대조 결과 보고
2. python -X utf8 -m pytest tests/unit/ai_model/ -q 통과
3. 변경 전후 코드 라인 수와 실행 시간을 측정해 보고
4. 결과를 docs/reports/REFACTORING_NOTE_20260815.md 로 정리
   (변경 이유, before/after 코드, 라인 수, 실행 시간, 값 동일성 확인 결과)

[커밋]
refactor: 도로 접근성 점수 계산을 pandas 벡터 연산으로 전환

for 루프 2회로 나뉘어 있던 점수 계산·주입을 DataFrame merge 와 벡터
연산으로 통합한다. feature 마다 min/max 를 다시 계산하던 O(n^2) 정규화도
1회 계산으로 고쳤다. 산출값은 기존과 동일함을 150개 전수 대조로 확인했다.
작성자 이해 점검 (핵심)

이 작업은 코드 개선뿐 아니라 pandas 벡터 연산을 정확히 이해하고 재현하는 것이 목적입니다. 구현 내용을 설명하거나 수정할 수 없으면 완료로 판정하지 않습니다.

 merge의 how="left"와 validate="one_to_one"이 각각 무엇을 하는지 설명할 수 있다.
 pd.json_normalize가 왜 필요했는지 설명할 수 있다.
 for 루프와 벡터 연산의 속도 차이가 왜 생기는지 설명할 수 있다.
 O(n²) → O(n)으로 바뀐 지점을 코드에서 짚을 수 있다.
 변경 전후 라인 수와 실행 시간을 숫자로 말할 수 있다.

통과 못 하면 이 PR을 머지하지 마세요. 설명 못 하는 코드가 저장소에 늘어나는 건 진단 보고서가 지적한 최대 리스크입니다.

TASK 5 — K-Means k 선택 근거 생성

브랜치: agent/kmeans-k-selection 난이도: 중 / 소요: 90분

배경

현재 KMeans(n_clusters=k, ...) 호출만 있고 k를 왜 그 값으로 정했는지 근거가 없습니다. 모델 평가 지표가 존재하지 않아 .agents/AI_DATA_AGENTS.md의 "평가지표 기록" 규칙에도 어긋납니다.

복붙용 프롬프트
text
[공통 규칙]

[대상] ai-model/compare_projected_kmeans_candidates.py

[배경]
.agents/AI_DATA_AGENTS.md 는 "모델 선택 이유를 설명하고 평가 지표를 기록한다",
"기준 모델(Baseline)과 비교 결과를 제시한다" 를 요구한다.
현재 KMeans 는 k 선택 근거와 평가 지표가 없다.

[작업]
1. evaluate_k(points, k_range=range(2, 8), seed=42) 함수를 추가한다.
   각 k 에 대해 sklearn.metrics.silhouette_score 와 model.inertia_ 를 기록한다.
2. 소아 모드와 어르신 모드 각각에 대해 실행한다.
3. 결과를 docs/reports/kmeans_k_selection_report_20260815.md 로 저장한다.
   - k별 실루엣 계수·inertia 표
   - 실루엣 기준 최적 k
   - 현재 채택한 k 와 다르다면, 왜 통계적 최적값이 아닌 값을 쓰는지
     (정책적으로 검토 가능한 거점 수 제약) 를 명시

[금지]
- 기존 후보 생성 로직과 산출물은 변경하지 말 것. 평가 함수 추가만 수행한다.
- 후보 개수를 실루엣 결과에 맞춰 바꾸지 말 것.

[검증]
1. 스크립트 실행 후 보고서 파일 생성 확인
2. 기존 산출물(candidates JSON)이 변경되지 않았음을 확인
3. python -X utf8 -m pytest tests/ -q 통과

[커밋]
feat: K-Means 후보 개수 선택 근거로 실루엣 계수 비교 추가
작성자 이해 점검
 실루엣 계수가 무엇을 재는 값인지 설명할 수 있다. (군집 내 응집도 vs 군집 간 분리도)
 inertia_가 무엇인지 설명할 수 있다.
 통계적 최적 k와 실제 채택 k가 다르다면, 그 이유를 정책 언어로 설명할 수 있다.
 n_init=10, random_state=42가 왜 필요한지 설명할 수 있다.
TASK 6 — 분석 로직 단위 테스트 신설

브랜치: agent/test-vdi-core 난이도: 중 / 소요: 60분

배경

테스트가 2,680줄 있는데 정작 VDI 계산과 정규화 함수에는 테스트가 없습니다. 가장 중요한 분석 로직이 미검증 상태입니다.

복붙용 프롬프트
text
[공통 규칙]

[작업]
tests/unit/ai_model/test_vdi.py 를 신설한다.
기존 테스트 파일(tests/unit/ai_model/test_actual_road_accessibility.py)의
스타일·import 방식을 그대로 따른다.

[테스트 대상과 케이스]
1. build_actual_road_accessibility.normalize()
   - 모든 값이 동일할 때 0.0 을 반환하는가 (math.isclose 분기)
   - 최솟값이 0, 최댓값이 100 이 되는가
2. VDI 산식
   - ETA 가 0 이면 log1p(0)=0 이므로 VDI 가 0 인가
   - 취약인구가 0 이면 VDI 가 0 인가
   - ETA 와 인구가 함께 커지면 VDI 가 단조 증가하는가
3. scripts/vdi_sensitivity.calculate_vdi_rank_sensitivity()
   - 동점 점수가 포함된 입력에서 순위가 평균 순위로 처리되는가
   - 필수 필드가 없는 입력에 대해 ValueError 를 던지는가

부동소수점 비교에는 pytest.approx 를 사용한다.
반복되는 케이스는 @pytest.mark.parametrize 로 묶는다.

[금지]
- 테스트를 통과시키려고 소스 코드를 수정하지 말 것.
  기존 코드가 실패하면 그 사실을 그대로 보고할 것.

[검증]
python -X utf8 -m pytest tests/unit/ai_model/test_vdi.py -v

[커밋]
test: VDI 산출·정규화 경계 조건 테스트 추가
자가검증 관문
 각 테스트가 어떤 실패를 잡으려는 것인지 설명할 수 있다.
 pytest.approx를 왜 쓰는지 설명할 수 있다.
TASK 7 — 레거시·중복 파일 정리

브랜치: agent/cleanup-legacy-scripts 난이도: 낮음 / 소요: 40분

배경

리뷰어가 저장소를 열었을 때 모순되어 보이는 파일들이 남아 있습니다. 특히 08_compute_vulnerability_geojson.py는 로그 변환이 없는 구식 VDI 산식을 그대로 갖고 있어, 프로젝트의 핵심 강점(로그 변환 도입)과 정면으로 충돌합니다.

복붙용 프롬프트
text
[공통 규칙]

[작업]
1. backend/scripts/08_compute_vulnerability_geojson.py 를 삭제한다.
   - 이 파일은 vulnerability_index = 거리 * 65세이상인구 라는 구식 산식을 쓴다.
   - 현재 정본은 spatial_analysis.py 의 log1p 기반 산식이다.
   - 삭제 전, 이 파일을 참조하는 곳이 없는지 저장소 전체를 검색해 확인할 것.
     README·docs·workflow 에 언급이 있으면 함께 정리한다.

2. ai-model/ml_blind_spot_filtering.py 를 ai-model/standalone/ 으로 이동한다.
   - 삭제하지 말 것. 독립 실행 가능한 스크립트다.
   - ai-model/standalone/README.md 를 만들어 이 스크립트의 용도와
     본 파이프라인에 편입되지 않은 이유를 기록한다.

3. backend/test_kakao_navi.py 를 tests/ 하위 적절한 위치로 이동하거나,
   수동 확인용 스크립트라면 backend/scripts/ 로 옮긴다.
   어느 쪽이 맞는지 파일 내용을 보고 판단한 뒤 근거와 함께 제안할 것.

4. backend/scripts/06_migrate_json_to_sqlite.py 와 06_migrate_to_sqlite.py
   두 파일의 내용을 비교하고, 중복이면 하나만 남긴다.
   어느 쪽이 현행인지 스스로 판단하지 말고 차이점을 보고한 뒤 확인을 요청할 것.

[검증]
1. python -X utf8 -m pytest tests/ -q 전체 통과
2. 삭제·이동한 파일을 참조하는 곳이 남아 있지 않은지 전체 검색 결과 제시

[커밋]
chore: 레거시 VDI 스크립트 제거와 독립 스크립트 분리
자가검증 관문
 08_compute_*.py와 spatial_analysis.py의 VDI 산식 차이를 설명할 수 있다.
 왜 로그 변환이 필요했는지 설명할 수 있다. (거리 편차 900배 vs 인구 편차 18배 → 거리가 지표를 지배)
2. 작성자가 직접 학습·검증해야 하는 것

자동화 도구 사용 여부와 관계없이 다음 항목은 작성자가 원리와 결과를 직접 검증합니다.

항목	왜 직접 해야 하는가
SQL 학습 및 indicators.py·dashboard.py의 SQL 전환	쿼리의 조인·집계·실행계획과 결과 정합성을 작성자가 직접 검증해야 합니다
pandas 학습 (groupby().agg(), pivot_table 등)	벡터 연산·조인 카디널리티·결측 처리의 의미와 결과를 작성자가 직접 확인해야 합니다
분석 개념 복습	p-median·MCLP·VDI·도로 ETA의 역할과 한계를 코드와 산출물에서 직접 확인해야 합니다
methodology.md의 p-median/MCLP 설명 추가	코드를 읽고 작성자가 이해한 내용을 본인 문장으로 정리해야 합니다
공개 문서 정합성	정본 데이터와 재산출 결과를 근거로만 문구를 갱신해야 합니다
3. 진행 체크리스트
순서	TASK	브랜치	상태	자가검증
1	분석 의존성 선언	agent/analysis-requirements	☐	☐
2	scipy Spearman ⭐	agent/scipy-spearman	☐	☐
3	KD-트리 최근접 탐색	agent/kdtree-nearest	☐	☐
4	pandas 벡터화 ⭐⭐	agent/vectorize-road-accessibility	☐	☐
5	K-Means k 선택 근거	agent/kmeans-k-selection	☐	☐
6	분석 로직 테스트	agent/test-vdi-core	☐	☐
7	레거시 정리	agent/cleanup-legacy-scripts	☐	☐
—	SQL 전환 (직접)	agent/sql-indicators	☐	—
—	분석 개념 복습 (직접)	—	☐	—

TASK 2·3·4를 마치면 설명 가능성과 코드 근거 사이의 불일치 위험을 줄일 수 있습니다.

4. 매 PR 전에 돌릴 검증 명령
bash
# Python
python -X utf8 -m pytest tests/ -q

# Frontend (프론트를 건드린 경우에만)
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend

# 분석 파이프라인 무결성 (TASK 2·3·4 이후 필수)
python -X utf8 backend/scripts/monthly_policy_release.py --mode check

⚠️ TASK 3·4는 산출값이 바뀌면 분석 계약·SHA-256 검증이 실패합니다. 값 동일성 대조를 통과하지 못한 PR은 절대 머지하지 마세요.
