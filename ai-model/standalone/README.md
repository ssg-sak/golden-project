# 독립 분석 스크립트

## `ml_blind_spot_filtering.py`

유치원과 병원 CSV의 위도·경도를 Haversine 거리로 비교하고, 최근접 병원이 3km보다 먼 유치원을 별도 CSV로 추출하는 초기 탐색용 스크립트다.

현재 정책 분석 정본인 `run_integrated_policy_pipeline.py`에는 포함하지 않는다. 정본 파이프라인은 행정동 취약인구, 실제 도로 ETA, 역할별 응급의료기관과 정책 후보 최적화를 결합하는 반면, 이 스크립트는 유치원과 병원의 직선거리만 사용하는 독립 실험이어서 데이터 계약과 산식이 다르다.

저장소 루트에서 다음과 같이 실행한다.

```bash
python -X utf8 ai-model/standalone/ml_blind_spot_filtering.py
```

기본 입력은 `data/raw/daegu_kindergartens.csv`와 `data/raw/daegu_hospitals.csv`, 출력은 `data/processed/blind_spot_kindergartens.csv`다. 실제 입력이 없으면 스크립트 내부의 예시 데이터를 사용하므로, 정책 릴리스 산출물 생성 용도로 사용하면 안 된다.
