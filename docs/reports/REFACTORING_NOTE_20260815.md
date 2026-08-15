# 도로 접근성 계산 pandas 벡터화 기록

- 작성일: 2026-08-15
- 대상: `ai-model/build_actual_road_accessibility.py`의 `apply_actual_road_results()`
- 목적: 행정동별 VDI 계산과 정규화를 pandas 조인·벡터 연산으로 전환하고 산출값 동일성을 검증한다.

## 변경 이유

기존 구현은 행정동별 점수를 Python 루프로 계산한 뒤 각 점수를 정규화할 때마다 전체 목록의 최솟값과 최댓값을 다시 구했다. 이 구조는 정규화 단계가 O(n²)이며, 행정동과 GeoJSON의 결합 관계도 이름 기반 dict 조회에 의존해 중복 키를 검증하지 못했다.

변경 후에는 다음 구조를 사용한다.

1. `matrix["districts"]`를 DataFrame으로 변환한다.
2. `nearest_emergency_resource`를 `pd.json_normalize()`로 평탄화한다.
3. GeoJSON의 `adm_nm`과 `how="left"`, `validate="one_to_one"` 조건으로 병합한다.
4. `np.log1p(eta) * population`을 한 번의 벡터 연산으로 계산한다.
5. 전체 점수의 min/max를 한 번만 계산해 O(n)으로 정규화한다.

`how="left"`는 GeoJSON의 모든 행정동을 보존하기 위해 사용했다. `validate="one_to_one"`은 양쪽 이름 키가 중복되어 결과 행이 의도치 않게 늘어나는 오류를 즉시 감지한다. `pd.json_normalize()`는 중첩된 최근접 기관 dict의 ETA·거리·기관 정보를 열로 펼쳐 벡터 연산과 조인에 사용할 수 있게 한다.

## 핵심 코드 비교

변경 전에는 각 점수에 대해 `normalize(raw_scores, score)`를 호출해 `min()`과 `max()`를 반복 계산했다.

```python
raw_scores.append(math.log1p(eta) * population)
properties["vdi_norm"] = round(normalize(raw_scores, score), 2)
```

변경 후에는 전체 Series의 범위를 한 번만 계산한다.

```python
raw_scores = np.log1p(eta_minutes) * populations
score_minimum = float(raw_scores.min())
score_maximum = float(raw_scores.max())
normalized_scores = (
    (raw_scores - score_minimum) / (score_maximum - score_minimum) * 100
)
```

## 코드 규모

| 구분 | 변경 전 | 변경 후 |
|---|---:|---:|
| 전체 파일 | 856줄 | 904줄 |
| `apply_actual_road_results()` | 108줄 | 154줄 |

코드 줄 수는 DataFrame 생성, 명시적 열 선택, 병합 카디널리티 검증을 드러내면서 증가했다. 이번 변경의 목적은 줄 수 축소가 아니라 데이터 처리 관계를 검증 가능한 형태로 만들고 반복 정규화 비용을 제거하는 것이다.

## 실행 시간

동일한 Windows 개발 환경에서 `time.perf_counter()`로 측정했다.

| 측정 대상 | 변경 전 | 변경 후 | 결과 |
|---|---:|---:|---:|
| 실제 150개 행정동 전체 함수, 9회 중앙값 | 0.041665초 | 0.053715초 | pandas 준비 비용으로 0.012050초 증가 |
| 5,100행 점수 계산·정규화, 3회 중앙값 | 0.729268초 | 0.053632초 | 13.60배 단축 |

현재 150개 규모에서는 DataFrame 생성 비용이 더 커 전체 함수가 빨라지지 않는다. 반면 기존 O(n²) 정규화는 행 수가 커질수록 반복 비용이 증가하며, 5,100행 확장 실험에서는 벡터화 구현이 13.60배 빨랐다. 따라서 이 변경은 현재 규모의 속도 과장이 아니라 확장 시 계산 복잡도와 조인 안전성을 개선한 것이다.

## 산출값 동일성

변경 전후 150개 행정동 전체에서 다음 필드를 대조했다.

- `actual_road_vdi_log`
- `travel_time_vdi_log`
- `travel_time_vulnerability_index`
- `vulnerability_index`
- `vdi_log`
- `vdi_norm`
- `travel_time_vdi_norm`
- ETA·도로 거리·최근접 기관 필드

후보지별 접근성 결과도 함께 비교했다. 변경 전후 직렬화 결과의 SHA-256은 모두 `b12182f50aba0a6af7d426044138664dc039a443738e7049d2a637750bb8d17e`로 일치했으며, 5,100행 확장 실험의 정규화 최댓값 차이도 `0`이었다.
