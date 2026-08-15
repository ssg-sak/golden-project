# 대구 골든타임 데이터 사전

이 문서는 시민용 응급의료 화면과 골든 거버넌스 정책분석이 사용하는 데이터의 의미, 상태, 안전한 해석 범위를 정리합니다. 현재 정책분석에는 HIRA 전문의 수·MRI·CT 기반 인프라 가중치나 자원 보강 추천을 사용하지 않습니다.

- **현행 파일 점검일:** 2026-07-31
- **정책분석 기준 릴리스:** `2026-07-r1`
- **인구 기준월:** `2026.07`
- **문서 범위:** `data/`의 원천·가공·분석·SQLite 데이터와 이를 배포하기 위한 프론트엔드 복제본
- **제외 범위:** PNG·PDF·노트북 같은 비정형 산출물, 루트의 미추적 진단 캡처 `test_api.json`, 별도 실험 폴더 `golden-data-lab/`

파일 수와 행 수는 2026-07-31 작업공간에서 직접 읽은 값이다. 운영 SQLite와 외부 API 응답은 이후 갱신될 수 있으므로 고정 릴리스 수치와 구분한다.

## 1. 데이터 상태 구분

| 구분 | 예시 | 갱신 방식 | 해석 원칙 |
|---|---|---|---|
| 변동 정보 | 응급실 병상·특이사항·중증질환 응답 | 외부 API 조회 후 백엔드 캐시 | 조회값만으로 실제 수용을 확정하지 않음 |
| 정적 기본정보 | 병원명·주소·좌표·전화·분류 | 검증된 저장소 정본 또는 원천 갱신 | API 장애 때도 탐색에 유지 |
| 기준월 입력 | 행정동별 0~9세·65세 이상 인구 | 공식 연령별 입력이 검증될 때 갱신 | 전체 인구로 연령별 인구를 추정하지 않음 |
| 기준시점 분석 | VDI·후보·도로 ETA·최적 조합 | 전체 파이프라인 재실행 후 검증 | 실시간 정책 결론이 아닌 고정 분석본 |
| fallback | 마지막 정상 병상 캐시·정적 병원 정본 | 원천 장애 때 유지 | 미확인을 진료·수용 가능으로 바꾸지 않음 |
| 테스트 자료 | fixture·mock 응답 | 테스트 실행 시 | 운영 데이터로 설명하지 않음 |

### 1.1 정본 우선순위

같은 내용이 여러 위치에 있을 때는 다음 순서로 판단한다.

1. `data/processed/policy_release.json`: 공개 정책분석의 단일 정본
2. `data/processed/`의 릴리스 구성 파일: 도로 행렬·최적화·민감도·후보 추적
3. `frontend/public/data/`: 정본을 웹에서 제공하기 위한 배포 복제본
4. `data/analysis/`, `frontend/src/assets/`, `frontend/src/data/`: 분석 실행 또는 번들링을 위한 동기화 복제본
5. `data/raw/`: 변경하지 않는 원천 또는 원천에서 파싱한 입력
6. `mock`, `BASELINE`, 루트 `data/*.json|csv`: 실험·회귀·구형 호환 자료

`policy_release.json` 내부의 `hospitals`, `vulnerability`, `candidates`, `candidate_trace`, `optimization`은 해당 릴리스에서 함께 검증된 묶음이다. 화면과 포트폴리오 수치를 설명할 때 개별 구형 파일보다 이 묶음을 우선한다.

### 1.2 현재 데이터셋 목록

| 영역 | 논리 데이터셋 | 대표 파일 | 규모·분석 단위 | 주요 키 | 상태 |
|---|---|---|---|---|---|
| 정책 릴리스 | 통합 정책분석본 | `data/processed/policy_release.json` | 릴리스 1건 | `metadata.version` | **정본** |
| 정책 릴리스 | 행정동 취약도 | `data/processed/daegu_vulnerability.geojson` | 150행정동 | `properties.adm_nm` | 정본 구성요소 |
| 정책 릴리스 | 기준 기관 | `data/processed/final_hospitals.json` | 25기관 | `name` | 정본 구성요소 |
| 정책 릴리스 | 안정 후보 | `frontend/public/data/stable_policy_candidates.json` | 9후보 | `mode` + `id` | 정본 구성요소 |
| 정책 릴리스 | 후보 근거 추적 | `data/processed/accessibility_candidate_trace.json` | 9후보 | `mode` + `id` | 정본 구성요소 |
| 정책 릴리스 | 도로 접근성 행렬 | `frontend/public/data/actual_road_accessibility_matrix.json` | 150행정동·5,100경로 | 행정동 ID + 자원 ID | 정본 구성요소 |
| 정책 릴리스 | 후보 민감도 | `data/processed/candidate_sensitivity_analysis.json` | 2모드·480시나리오 | `mode` + `scenario_key` | 정본 구성요소 |
| 정책 릴리스 | 입지 최적화 | `data/processed/policy_location_optimization.json` | 2모드 × 시설 수 1~3 | `mode` + `facility_count` | 정본 구성요소 |
| 원천 공간 | 행정동 경계 | `data/raw/geo/daegu_dong.geojson` | 150행정동 | `properties.adm_nm` | 원천 입력 |
| 원천 인구 | KOSIS 5세 구간 인구 | `data/raw/population/kosis_dong_5yr_population_202606.csv` | 486데이터행·2행 헤더 | 지역명 + 항목 | 원천 입력·CP949 |
| 분석 인구 | 소아·고령 인구 파싱본 | `data/raw/population/daegu_population_real.csv` | 150행정동 | `동이름` | 검증 입력 |
| 분석 인구 | 인구 원천 manifest | `data/raw/population/daegu_population_real.manifest.json` | 파일 1건 | `source_sha256` | 검증 메타데이터 |
| 원천 수요 | 어린이집 | `data/raw/daegu_kindergartens.csv` | 992시설 | 명시적 PK 없음 | 원천 입력·CP949 |
| 가공 수요 | 지오코딩 어린이집 | `data/processed/daegu_kindergartens_geocoded.csv` | 992시설 | 명시적 PK 없음 | 실험 입력 |
| 외부 기초 | 대구 병·의원·약국 | `data/processed/daegu_medical_facilities.csv` | 5,647기관 | `암호화요양기호` | 별도 추출본·현행 정책 미사용 |
| 외부 기초 | 행정동 코드 이력 | `data/processed/daegu_administrative_codes.csv` | 22,366이력행 | 단일 PK 미확정 | 별도 추출본·현행 정책 미사용 |
| 외부 기초 | 시군구별 인구 | `data/processed/daegu_population.csv` | 10데이터행·2행 헤더 | `행정구역(시군구)별` | 별도 추출본·현행 정책 미사용 |
| 운영 DB | 병원·행정동·원천상태·스냅샷 | `data/hospitals.db` | 7테이블 | 테이블별 PK | 변동 운영 저장소 |
| 재현 캐시 | Kakao 도로경로 캐시 | `data/cache/kakao_road_eta_cache.json` | 5,100경로 | SHA-256 캐시 키 | 재현용·Git 비추적 |
| 정책 출력 | 모니터링 CSV | `data/analysis/policy_monitoring_report.csv` | 150행정동 | `행정동` | 릴리스 파생 출력 |
| 비교 실험 | 투영 K-Means 비교 | `data/processed/projected_kmeans_candidate_comparison.json` | 2모드 | `mode` | 진단 자료 |
| 목업 | 행정 지표·의료 접근성 | `data/processed/region_indicators.csv`, `data/processed/mock_medical_data.json` | 각각 150행정동 | `행정동`, `adm_nm` | 합성 테스트 자료 |
| 구형 호환 | 과거 후보·우선순위·보고서 | 루트 `data/optimal_locations.json`, `data/priority_targets.json`, `data/policy_monitoring_report.csv` | 4후보·우선순위 1묶음·5행 | 파일별 상이 | **현행 정본 아님** |

### 1.3 배포·분석 복제본

다음 파일은 독립 데이터셋이 아니라 정본의 복제본이다. 값을 수정할 때는 복제본만 직접 고치지 말고 생성 파이프라인으로 다시 동기화한다.

| 정본 또는 생성 원본 | 복제 위치 | 현재 관계 |
|---|---|---|
| `data/processed/policy_release.json` | `frontend/public/data/policy_release.json` | 바이트 동일 |
| `frontend/public/data/actual_road_accessibility_matrix.json` | `frontend/public/data/actual_road_accessibility_matrix.json` | 바이트 동일 |
| `data/processed/accessibility_candidate_trace.json` | `frontend/public/data/accessibility_candidate_trace.json` | 바이트 동일 |
| `data/processed/policy_location_optimization.json` | `frontend/public/data/policy_location_optimization.json` | 바이트 동일 |
| `data/processed/final_hospitals.json` | `data/analysis/`, `frontend/src/assets/`, `frontend/src/data/`의 동명 파일 | 바이트 동일 |
| `data/processed/daegu_vulnerability.geojson` | `data/analysis/`, `frontend/src/assets/`, `frontend/src/data/`의 동명 파일 및 릴리스 내부 | JSON 구조·값 동일, 직렬화 공백만 다를 수 있음 |
| `data/raw/geo/daegu_dong.geojson` | `data/analysis/daegu_dong.geojson` | 바이트 동일 |
| `data/raw/population/daegu_population.csv` | `data/analysis/daegu_population.csv` | 바이트 동일 |

`data/priority_targets.json`과 `frontend/public/data/priority_targets.json`은 현재 내용이 서로 다르며 현행 프론트엔드는 둘 대신 `policy_release.json`을 사용한다.

## 2. 정책분석 기관 정본

현재 `final_hospitals.json`과 단일 정책 분석본에는 25개 기관이 포함됩니다. 구성은 국립중앙의료원 응급기관 조회에서 확인한 19개 응급기관과 대구시 지정 달빛어린이병원 6개입니다.

### 기관 범위와 제외 항목

공식 응급의료기관 지정 명단에는 권역응급의료센터·지역응급의료센터·지역응급의료기관 외에 지역응급의료시설이 별도 범주로 표시될 수 있습니다. 현재 정책 분석은 병상·기관 식별자·좌표를 같은 기준으로 연결해 검증한 19개 응급기관과 달빛어린이병원 6개만 공급 지점으로 사용합니다. 지역응급의료시설 4개소는 이번 25개 기준 분석에 포함하지 않았습니다.

따라서 `25개 기관`은 대구의 모든 응급 관련 시설을 뜻하지 않으며, 현재 정책 릴리스에서 검증된 분석 대상 범위를 뜻합니다. 제외 기관을 추가하려면 기관 식별자·좌표·분류·도로 경로를 확인한 뒤 별도 분석 릴리스로 재실행해야 합니다.

| 필드 | 타입 | 의미 | 검증·주의사항 |
|---|---|---|---|
| `name` | String | 기관명 | 중복 및 필수 기관 누락 검사 |
| `lat` | Float | WGS84 위도 | 대구 범위와 결측 검사 |
| `lng` | Float | WGS84 경도 | 대구 범위와 결측 검사 |
| `tier` | Integer | 프로젝트 내부 분석 분류 1·2·3 | 의료기관의 법적 등급 전체를 대체하지 않음 |
| `address` | String | 표시용 주소 | 원천별 정확한 개별 수집일은 추가 확인 필요 |

정책분석의 소아 모드는 분류 3의 6곳, 어르신 모드는 분류 1·2의 19곳을 기준 기관으로 사용합니다. 전문의 수와 MRI·CT 보유 여부는 현재 VDI·K-Means·p-median·MCLP 입력에 포함되지 않습니다.

## 3. 행정동·인구·VDI

| 필드 | 타입 | 의미 | 현재 분석에서의 사용 |
|---|---|---|---|
| `adm_nm` | String | 행정동 전체 명칭 | 150개 행정동 식별 |
| `동이름` | String | 정규화된 구·군+행정동명 | 인구 결합 키 |
| `65세이상_인구` | Integer | 65세 이상 주민등록인구 | 어르신 수요 및 전체 취약인구 |
| `0~9세_인구` | Integer | 0~9세 주민등록인구 | 소아 수요 및 전체 취약인구 |
| `취약인구` | Integer | 두 연령집단의 합 | VDI의 인구 항 |
| `center_lat`, `center_lng` | Float | 행정동 분석 중심점 | 도로 경로 출발점. 실제 거주지·출동 위치가 아님 |
| `min_dist_to_hospital` | Float | 최근접 기준 기관까지의 직선거리(km) | 후보 생성·설명 보조자료 |
| `travel_time_minutes` | Float | 저장된 일반 차량 도로 ETA(분) | 현재 공개 VDI의 접근성 항 |
| `vulnerability_index` | Float | `ln(1 + ETA) × 취약인구` | 행정동 상대 비교 |
| `vdi_norm` | Float | 현재 VDI의 0~100 선형 정규화 값 | 같은 분석본 내부의 보조 비교값 |

현재 고위험 표시는 의료적 절대 기준이 아니다. 150개 행정동 VDI의 상위 25%를 우선 확인 대상으로 구분하며 현재 경계값은 13,429.72이다.

## 4. 정책 후보와 근거 추적

| 필드 | 타입 | 의미 |
|---|---|---|
| `id` | Integer | 모드 내부 후보 식별자 |
| `mode` | String | `pediatric` 또는 `senior` |
| `candidate_type` | String | 안정·보류·별도 권역 분류 |
| `lat`, `lng` | Float | 후보 중심 좌표 |
| `demand` | Integer | 후보 생성에 사용된 수요점 수. 환자 수가 아님 |
| `covered_districts` | Array | 접근성 개선 근거가 연결된 행정동 |
| `accessibility_gain_km` | Float | 후보 추가 전후 직선거리 기반 평균 개선량 |
| `vulnerable_population` | Integer | 근거 추적에 포함된 취약인구 합 |

후보 정본 9곳과 후보 추적 9곳의 모드·ID·좌표가 일치해야 분석본 생성이 통과한다. 후보 좌표는 확정 입지나 건축 부지를 뜻하지 않는다.

## 5. 도로 ETA 행렬과 최적화

### 행렬 메타데이터

| 필드 | 의미 |
|---|---|
| `district_count` | 행정동 수, 현재 150 |
| `resource_count` | 기준 기관 수, 현재 25 |
| `candidate_count` | 후보 수, 현재 9 |
| `requested_route_count` | 요청 계약 경로 수, 현재 5,100 |
| `successful_route_count` | 성공 경로 수, 현재 5,100 |
| `missing_route_count` | 누락 경로 수, 현재 0 |
| `source_sha256` | 행정동·기관·후보 입력 해시 |
| `route_result_sha256` | 실제 경로 결과 해시 |
| `route_provenance` | 캐시·신규 조회·좌표 보정 경로 수 |

### 최적화 결과

| 필드 | 의미 | 해석 제한 |
|---|---|---|
| `p_median_optimum` | 취약인구 가중 평균 ETA 최소 조합 | 후보군 내부 비교 |
| `mclp_15min_optimum` | 15분 내 모델 커버 인구 최대 조합 | 실제 수용·치료 가능 인구가 아님 |
| `mclp_30min_optimum` | 30분 내 모델 커버 인구 최대 조합 | 시설 건립 효과 예측이 아님 |
| `candidate_ids` | 선택된 후보 ID | 확정 입지가 아님 |

## 6. 시민용 병상·의료 응답

시민 화면의 변동 정보는 공공데이터 응답을 정규화한 병상 페이로드다. 원천에서 조회되지 않은 필드는 `null`을 유지한다.

| 필드 | 타입 | 의미 |
|---|---|---|
| `available_beds` | Integer 또는 null | 조회된 일반 응급실 가용 병상 값 |
| `total_beds` | Integer 또는 null | 조회된 전체 기준 병상 값 |
| `severe_conditions` | Object 또는 null | 원천에서 확인된 중증질환별 상태 |
| `equipment_status` | Object 또는 null | 원천 응답의 장비 운용 관련 상태 |
| `realtime_messages` | Array 또는 null | 원천 메시지 |
| `realtime_source` | String | 데이터 출처·fallback 상태 |

병상 캐시는 생성 시각, 마지막 오류, stale 여부를 별도로 전달한다. `null`은 미확인이며 병상 0, 진료 불가, 수용 불가와 동일하지 않다. 실제 방문·이송 전에는 의료기관과 119의 안내를 우선해야 한다.

## 7. 원천 추적의 남은 한계

- 병원 기본정보 원천별 정확한 개별 수집일은 저장소만으로 확정할 수 없다.
- 저장된 행정동 경계는 150개 구조와 좌표계를 검증했지만 SGIS 원본의 정확한 수집일은 추가 확인이 필요하다.
- 도로 ETA는 일반 차량 경로의 수집시점 스냅샷이며 구급차 우선통행·실제 출동시간을 반영하지 않는다.
- 분석 입력이 변경되면 새 분석본으로 재실행·검증하고, 실패하면 기존 검증본을 유지한다.

## 8. 원천·기초 데이터 컬럼 설명

### 8.1 행정동 경계 GeoJSON

- 파일: `data/raw/geo/daegu_dong.geojson`
- 형식: GeoJSON `FeatureCollection`, 150개 `Feature`
- 좌표: 경도·위도 순서의 WGS84 계열 좌표
- 출처 기록: 생성 스크립트는 `vuski/admdongkor`의 2023-07-01 GeoJSON을 가리킨다. 원 데이터의 SGIS 계보·정확한 수집일·재배포 라이선스는 저장소에 완전하게 고정돼 있지 않아 확인이 필요하다.

| 경로 | 타입 | 의미 | 주의사항 |
|---|---|---|---|
| `type` | String | 컬렉션은 `FeatureCollection`, 개별 행은 `Feature` | GeoJSON 표준 필드 |
| `features` | Array | 행정동 경계 목록 | 현재 150건 |
| `features[].properties.adm_nm` | String | 시도·시군구·행정동을 포함한 전체 명칭 | 분석 결합의 기준 키 |
| `features[].properties.adm_cd` | String | 원천의 행정동 코드 | 선행 0과 코드 체계를 보존하기 위해 문자열 사용 |
| `features[].properties.adm_cd2` | String | 원천이 제공하는 대체 행정동 코드 | 코드 체계의 공식 정의는 원천 사전 확인 필요 |
| `features[].properties.adm_cd8` | String | 원천이 제공하는 8자리 행정동 코드 | 다른 행정코드와 직접 JOIN하지 않음 |
| `features[].properties.sido` | String | 시도 코드 | 현재 대구 값 `27` |
| `features[].properties.sidonm` | String | 시도명 | `대구광역시` |
| `features[].properties.sgg` | String | 시군구 코드 | 문자열 코드 |
| `features[].properties.sggnm` | String | 시군구명 | 예: `중구` |
| `features[].properties.temp` | String | 시군구+행정동 축약 명칭 | 표시·보조 결합용 |
| `features[].geometry.type` | String | `Polygon` 또는 `MultiPolygon` | 행정동 형상 종류 |
| `features[].geometry.coordinates` | Array | 행정동 경계 좌표 배열 | 순서 `[longitude, latitude]` |

`data/processed/daegu-dong.geojson`은 화면용 경량본이며 `adm_nm`, `temp`, `sggnm`, `geometry`만 남긴다.

### 8.2 KOSIS 5세 구간 인구 원본

- 파일: `data/raw/population/kosis_dong_5yr_population_202606.csv`
- 형식: CP949 CSV, 2행 헤더, 486데이터행
- 기준월: 2026.07
- 분석 대상 행: `항목 == "총인구수 (명)"`; 시도·시군구 합계와 출장소 행은 파싱 단계에서 제외

| 컬럼 | 타입 | 의미 | 파싱 사용 |
|---|---|---|---|
| `행정구역(동읍면)별` | String | 시도·시군구·행정동 명칭이 계층적으로 배치된 지역명 | 시군구 문맥과 행정동 이름 구성 |
| `항목` | String | 총인구·남자·여자 등 측정 항목 | `총인구수 (명)`만 사용 |
| `0 - 4세` | Integer text | 0~4세 인구, 명 | `0~9세_인구`에 합산 |
| `5 - 9세` | Integer text | 5~9세 인구, 명 | `0~9세_인구`에 합산 |
| `65 - 69세` | Integer text | 65~69세 인구, 명 | `65세이상_인구`에 합산 |
| `70 - 74세` | Integer text | 70~74세 인구, 명 | 동일 |
| `75 - 79세` | Integer text | 75~79세 인구, 명 | 동일 |
| `80 - 84세` | Integer text | 80~84세 인구, 명 | 동일 |
| `85 - 89세` | Integer text | 85~89세 인구, 명 | 동일 |
| `90 - 94세` | Integer text | 90~94세 인구, 명 | 동일 |
| `95 - 99세` | Integer text | 95~99세 인구, 명 | 동일 |
| `100+` | Integer text | 100세 이상 인구, 명 | 동일 |

첫 번째 헤더 행에는 각 연령 컬럼 대신 기준월 `2026.07`이 반복된다. 일반적인 단일 헤더 CSV로 읽으면 안 된다.

### 8.3 행정동별 소아·고령 인구 파싱본과 manifest

- 파일: `data/raw/population/daegu_population_real.csv`, `data/raw/population/daegu_population.csv`
- 형식: UTF-8 BOM CSV, 150행
- 키: `동이름`; 현재 두 파일은 동일한 3컬럼 스키마지만 검증 릴리스는 manifest가 가리키는 `daegu_population_real.csv`를 기준으로 한다.

| 컬럼 | 타입 | 단위 | 의미 |
|---|---|---|---|
| `동이름` | String | - | `시군구 행정동` 형식의 인구 결합 키 |
| `65세이상_인구` | Integer | 명 | 65~69세부터 100세 이상까지의 합 |
| `0~9세_인구` | Integer | 명 | 0~4세와 5~9세의 합 |

`daegu_population_real.manifest.json`:

| 필드 | 타입 | 의미 |
|---|---|---|
| `manifest_version` | Integer | manifest 스키마 버전 |
| `population_base_month` | String | 인구 기준월, `YYYY.MM` |
| `district_count` | Integer | 파싱된 행정동 수 |
| `source_file` | String | manifest가 검증하는 CSV 파일명 |
| `source_sha256` | String | 원천 CSV SHA-256 |
| `verified_on` | String | 검증일 |
| `collection_date_status` | String | 개별 수집일 확인 상태 |

### 8.4 어린이집 원본·지오코딩본

- 원본: `data/raw/daegu_kindergartens.csv`, CP949, 992행
- 가공본: `data/processed/daegu_kindergartens_geocoded.csv`, UTF-8 BOM, 992행
- 원본 제공기관·수집일·라이선스는 파일과 현행 문서에서 확정할 수 없어 확인이 필요하다.
- 가공 좌표는 프로젝트 기록상 OpenStreetMap Nominatim 지오코딩 결과다. 원천 주소 오류와 지오코딩 오차를 고려해야 한다.

| 컬럼 | 타입 | 존재 파일 | 의미 |
|---|---|---|---|
| `시도` | String | 원본·가공본 | 시도명 |
| `시군구` | String | 원본·가공본 | 시군구명 |
| `어린이집유형` | String | 원본·가공본 | 시설 유형 분류 |
| `어린이집명` | String | 원본·가공본 | 시설명 |
| `전화번호` | String | 원본·가공본 | 시설 연락처 |
| `주소` | String | 원본·가공본 | 지오코딩 입력 주소 |
| `latitude` | Float | 가공본 | WGS84 위도 |
| `longitude` | Float | 가공본 | WGS84 경도 |

시설명을 고유키로 보장하는 계약은 없다. 중복 확인에는 시설명·주소·전화번호의 복합 비교가 필요하다.

### 8.5 대구 병·의원·약국 추출본

- 파일: `data/processed/daegu_medical_facilities.csv`
- 형식: UTF-8 BOM CSV, 5,647행, 47컬럼
- 출처 기록: `전국 병의원 및 약국 현황 2026.3` ZIP의 병원·약국 기본정보와 시설정보를 `암호화요양기호`로 결합
- 처리 규칙: 모든 셀을 문자열로 읽고 앞뒤 공백만 제거했다. 숫자처럼 보이는 값도 CSV에서는 문자열이며 빈 문자열이 결측을 뜻한다.
- 용도: 별도 분석용 추출본이다. 현행 VDI·후보·최적화의 병원 공급점에는 사용하지 않는다.

| 컬럼 | 의미 |
|---|---|
| `암호화요양기호` | 원천이 제공하는 의료기관·약국 식별값; 기본정보와 시설정보 JOIN 키 |
| `요양기관명` | 의료기관 또는 약국 명칭 |
| `종별코드`, `종별코드명` | 기관 종별의 코드와 표시명 |
| `시도코드`, `시도코드명` | 원천의 시도 코드와 명칭 |
| `시군구코드`, `시군구코드명` | 원천의 시군구 코드와 명칭 |
| `읍면동` | 주소의 읍면동 명칭 |
| `우편번호` | 우편번호 문자열 |
| `주소` | 기관 도로명 또는 지번 주소 |
| `전화번호` | 대표 전화번호 |
| `병원홈페이지` | 홈페이지 URL 문자열 |
| `개설일자` | 기관 개설일시 문자열 |
| `총의사수` | 전체 의사 인원수 |
| `의과일반의 인원수` | 의과 일반의 인원수 |
| `의과인턴 인원수` | 의과 인턴 인원수 |
| `의과레지던트 인원수` | 의과 레지던트 인원수 |
| `의과전문의 인원수` | 의과 전문의 인원수 |
| `치과일반의 인원수` | 치과 일반의 인원수 |
| `치과인턴 인원수` | 치과 인턴 인원수 |
| `치과레지던트 인원수` | 치과 레지던트 인원수 |
| `치과전문의 인원수` | 치과 전문의 인원수 |
| `한방일반의 인원수` | 한방 일반의 인원수 |
| `한방인턴 인원수` | 한방 인턴 인원수 |
| `한방레지던트 인원수` | 한방 레지던트 인원수 |
| `한방전문의 인원수` | 한방 전문의 인원수 |
| `조산사 인원수` | 조산사 인원수 |
| `좌표(X)` | 경도 값으로 저장된 X 좌표 |
| `좌표(Y)` | 위도 값으로 저장된 Y 좌표 |
| `설립구분코드`, `설립구분코드명` | 설립 주체의 코드와 표시명 |
| `일반입원실상급병상수` | 일반입원실 상급 병상 수 |
| `일반입원실일반병상수` | 일반입원실 일반 병상 수 |
| `성인중환자병상수` | 성인 중환자 병상 수 |
| `소아중환자병상수` | 소아 중환자 병상 수 |
| `신생아중환자병상수` | 신생아 중환자 병상 수 |
| `분만실병상수` | 분만실 병상 수 |
| `수술실병상수` | 수술실 병상 수 |
| `응급실병상수` | 응급실 병상 수 |
| `물리치료실병상수` | 물리치료실 병상 수 |
| `정신과폐쇄상급병상수` | 정신과 폐쇄 상급 병상 수 |
| `정신과폐쇄일반병상수` | 정신과 폐쇄 일반 병상 수 |
| `정신과개방상급병상수` | 정신과 개방 상급 병상 수 |
| `정신과개방일반병상수` | 정신과 개방 일반 병상 수 |
| `격리병실병상수` | 격리병실 병상 수 |
| `무균치료실병상수` | 무균치료실 병상 수 |

약국 행은 병상 컬럼이 빈 값이다. `시군구코드`는 아래 행정동 코드 파일의 `행정동코드`와 체계가 다르므로 직접 JOIN하지 않는다.

### 8.6 행정동 코드 이력 추출본

- 파일: `data/processed/daegu_administrative_codes.csv`
- 형식: UTF-8 BOM CSV, 22,366행, 9컬럼
- 특성: 현행 행정동 150건의 정적 차원이 아니라 과거 개정 이력과 계층 행이 함께 있는 데이터다.

| 컬럼 | 의미 |
|---|---|
| `행정동번호` | 원천 내부 행정동 레코드 번호 |
| `개정일자` | 해당 레코드의 개정일 |
| `연결번호` | 개정 전후 또는 관련 레코드를 연결하는 원천 번호 |
| `행정동코드` | 계층 수준별 행정동 코드 |
| `행정동명` | 시도·시군구·행정동 등 해당 계층 명칭 |
| `배경여부` | 원천의 배경·상태 구분 플래그 |
| `최상위행정동코드` | 최상위 시도 코드; 대구 추출 조건은 `22` |
| `부모행정동코드` | 상위 계층 코드 |
| `순번` | 원천 정렬·레코드 순서 값 |

단일 `행정동코드`가 파일 전체에서 유일하다고 가정하지 않는다. 최신 활성 행만 쓸 경우 `개정일자`, `배경여부`, 계층을 포함한 별도 선정 규칙이 필요하다.

### 8.7 시군구별 인구 추출본

- 파일: `data/processed/daegu_population.csv`
- 형식: UTF-8 BOM CSV, 2행 헤더, 10데이터행
- 용도: 대구 전체와 9개 구·군 요약 추출본이며, 현행 150개 행정동 정책분석 입력이 아니다.

| 논리 컬럼 | 의미 |
|---|---|
| `행정구역(시군구)별` | 대구광역시 또는 구·군 명칭 |
| `2026.07 / 총인구수 (명)` | 2026.07 총인구 |
| `2026.07 / 남자인구수 (명)` | 2026.07 남자 인구 |
| `2026.07 / 여자인구수 (명)` | 2026.07 여자 인구 |

## 9. 정책분석 정본 상세 컬럼

### 9.1 취약도 GeoJSON

- 파일: `data/processed/daegu_vulnerability.geojson`
- 분석 단위: 행정동 1건
- 키: `properties.adm_nm`, 150건 중복 0건
- 현재 필수 분석 필드의 결측은 없다. 단, 과거 추정 ETA 보존용 두 필드는 150건 모두 `null`이다.

| 최상위 경로 | 타입 | 의미 |
|---|---|---|
| `type` | String | `FeatureCollection` |
| `name` | String | 데이터셋 이름 `daegu_vulnerability` |
| `metadata` | Object | 인구 원천 추적 정보 |
| `metadata.population_base_month` | String | 인구 기준월 |
| `metadata.population_district_count` | Integer | 인구 입력 행정동 수 |
| `metadata.population_source_file` | String | 인구 원천 파일명 |
| `metadata.population_source_sha256` | String | 인구 원천 해시 |
| `crs` | Object | GeoJSON 좌표계 설명; 현재 CRS84 |
| `features` | Object[] | 150개 행정동 Feature |

| 필드 | 타입 | 단위·값 | 의미와 사용 규칙 |
|---|---|---|---|
| `adm_nm` | String | - | `대구광역시 시군구 행정동` 전체 명칭; 정본 결합 키 |
| `동이름` | String | - | `시군구 행정동` 형식의 인구 결합 키 |
| `65세이상_인구` | Integer | 명 | 고령 수요 인구 |
| `0~9세_인구` | Integer | 명 | 소아 수요 인구 |
| `취약인구` | Integer | 명 | 두 연령집단의 합 |
| `center_lat`, `center_lng` | Float | WGS84 도 | 행정동 분석 대표점; 실제 환자 위치가 아님 |
| `min_dist_to_hospital` | Float | km | 생성 당시 직선거리 기준 최근접 기관 거리; 도로 ETA 필드와 혼용하지 않음 |
| `nearest_hospital_name` | String | - | 현재 도로 ETA 기준 최근접 기관명 |
| `nearest_hospital_tier` | Integer | 1·2·3 | 현재 도로 ETA 기준 최근접 기관의 내부 분류 |
| `nearest_hospital_address` | String | - | 직선거리 단계에서 기록된 주소; 현재 도로 ETA 기준 기관명과 다를 수 있어 표시용 사용 금지 |
| `travel_time_minutes` | Float | 분 | 행정동 중심점에서 현재 도로 ETA 기준 최근접 기관까지 일반 차량 ETA |
| `road_distance_km` | Float | km | 위 경로의 도로거리 |
| `accessibility_metric` | String | `actual_road_time` | 현재 접근성 기준이 저장된 Kakao 도로시간임을 표시 |
| `vulnerability_index` | Float | 상대점수 | `ln(1 + travel_time_minutes) × 취약인구`; 공개 대표 VDI |
| `vdi_log` | Float | 상대점수 | 현재 `vulnerability_index`와 같은 호환 별칭 |
| `actual_road_vdi_log` | Float | 상대점수 | 실제 도로 ETA로 다시 계산한 VDI; 현재 대표 VDI와 같음 |
| `travel_time_vdi_log` | Float | 상대점수 | 도로시간 VDI 호환 별칭 |
| `travel_time_vulnerability_index` | Float | 상대점수 | 도로시간 VDI 호환 별칭 |
| `vdi_norm` | Float | 0~100 | 현재 150개 VDI의 Min-Max 정규화 값 |
| `travel_time_vdi_norm` | Float | 0~100 | 현재 `vdi_norm`과 같은 호환 별칭 |
| `estimated_travel_time_minutes` | null | - | 과거 추정 ETA 보존 슬롯; 현재 150/150건 `null` |
| `estimated_travel_time_vdi_log` | null | - | 과거 추정 ETA VDI 보존 슬롯; 현재 150/150건 `null` |
| `geometry` | Object | GeoJSON | 행정동 Polygon 또는 MultiPolygon |

2026-07-31 프로파일에서 `nearest_hospital_name`과 `nearest_hospital_address`가 서로 다른 기관을 가리키는 행이 45/150건 확인됐다. 도로 ETA 적용 코드가 이름·등급은 갱신하지만 주소는 갱신하지 않기 때문이다. 주소가 필요하면 `nearest_hospital_name`을 `final_hospitals.json.name`에 다시 JOIN한다.

### 9.2 기준 기관

- 파일: `data/processed/final_hospitals.json`
- 분석 단위: 기관 1곳, 총 25곳
- 키: `name`, 중복 0건

| 필드 | 타입 | 의미 | 검증·해석 |
|---|---|---|---|
| `name` | String | 정규화된 기관명 | 도로 행렬 자원 ID는 `hospital:{name}` |
| `lat` | Float | WGS84 위도 | 필수 |
| `lng` | Float | WGS84 경도 | 필수 |
| `tier` | Integer | 내부 분석 분류 | 1=권역·대형, 2=준종합·일반 응급, 3=달빛어린이병원 |
| `address` | String | 표시용 주소 | 기관별 원천 수집일은 추가 확인 필요 |

`daegu_er_hospitals.json`, `er_hospital_coord_supplement*.json`, `mock_hospitals.json`도 기본적으로 이 스키마를 사용한다. 보정 파일에만 `matchNames: String[]`가 추가되며, 원천의 여러 표기명을 하나의 `name`에 연결한다. 현재 `daegu_er_hospitals.json`은 18건이므로 25건 정본 대신 사용하지 않는다.

### 9.3 안정 정책 후보

- 파일: `frontend/public/data/stable_policy_candidates.json`
- 릴리스 내부 경로: `policy_release.json.candidates`
- 분석 단위: `pediatric` 또는 `senior` 모드의 후보 1곳, 총 9곳
- 키: `mode` + `id`

| 필드 | 타입 | 단위·값 | 의미 |
|---|---|---|---|
| `id` | Integer | 모드 내부 번호 | 같은 ID가 다른 모드에 존재할 수 있음 |
| `mode` | String | `pediatric`, `senior` | 소아·고령 수요 모드 |
| `candidate_type` | String | `stable_main`, `hold_review`, `separate_region` | 안정 후보, 보류 후보, 별도 권역 후보 |
| `candidate_group` | String | `main_daegu`, `hold`, `separate_region` | 후보 선정 그룹 |
| `lat`, `lng` | Float | WGS84 도 | 후보 중심 좌표; 확정 부지가 아님 |
| `demand` | Integer | 수요점 수 | 소아는 시설 수요점, 고령은 행정동 수요점 등 모드별 입력 개수; 환자 수가 아님 |
| `scenario_coverage_ratio` | Float | 0~1 | 전체 민감도 시나리오 중 해당 안정 그룹이 출현한 시나리오 비율 |
| `score` | Float | 0~100 | `scenario_coverage_ratio × 100` |
| `interpretation` | String | - | 화면 표시용 정책 해석 문구 |
| `accessibility_metric` | String | `actual_road_time` | 도로 ETA 기반 지표임을 표시 |
| `analysis_version` | String | - | 정책분석 릴리스 버전 |
| `baseline_resource_count` | Integer | 기관 수 | 해당 모드의 기존 기준 기관 수 |
| `before_avg_eta_minutes` | Float | 분 | 기존 기관만 있을 때 모드 수요인구 가중 평균 ETA |
| `after_avg_eta_minutes` | Float | 분 | 해당 후보 1곳을 추가한 뒤 가중 평균 최소 ETA |
| `accessibility_gain_minutes` | Float | 분 | `before_avg_eta_minutes - after_avg_eta_minutes` |
| `p_median_weighted_eta_minutes` | Float | 분 | 후보 1곳 추가 시 p-median 비교용 가중 평균 ETA; 현재 `after_avg_eta_minutes`와 같음 |
| `mclp_15min_population` | Integer | 명 | 해당 후보 자체가 15분 이내에 도달 가능한 모드 수요인구 |
| `mclp_15min_coverage_ratio` | Float | 0~1 | 위 인구 / 해당 모드 전체 수요인구 |
| `mclp_30min_population` | Integer | 명 | 해당 후보 자체가 30분 이내에 도달 가능한 모드 수요인구 |
| `mclp_30min_coverage_ratio` | Float | 0~1 | 위 인구 / 해당 모드 전체 수요인구 |
| `time_improved_population` | Integer | 명 | 후보 ETA가 기존 최근접 기관 ETA보다 짧은 행정동의 모드 수요인구 합 |
| `optimal_combinations` | Object | - | 목적함수별로 해당 후보가 포함된 `p=시설 수: 후보 ID들` 문자열 목록 |

MCLP 커버 필드는 기존 기관을 포함한 전체 체계의 순증가량이 아니라 **해당 후보의 도달권**이다.

### 9.4 후보 접근성 근거 추적

- 파일: `data/processed/accessibility_candidate_trace.json`
- 릴리스 내부 경로: `policy_release.json.candidate_trace`
- 분석 단위와 키: 안정 정책 후보와 동일
- 주의: 이 파일은 직선거리 기반 설명 자료다. 최종 도로 ETA 지표는 안정 정책 후보와 최적화 파일을 사용한다.

| 필드 | 타입 | 단위 | 의미 |
|---|---|---|---|
| `id`, `mode`, `candidate_type`, `candidate_group`, `lat`, `lng`, `demand` | 혼합 | - | 안정 후보와 같은 식별·분류·좌표 필드 |
| `covered_districts` | String[] | - | 개선량이 큰 상위 행정동 이름 목록 |
| `covered_district_count` | Integer | 행정동 | 후보 직선거리가 기존 최소 직선거리보다 짧은 전체 행정동 수 |
| `nearest_existing_hospital` | String | - | 후보 좌표에서 직선거리로 가장 가까운 기존 기관 |
| `nearest_existing_hospital_distance_km` | Float | km | 후보와 위 기관 사이 직선거리 |
| `before_avg_distance_km` | Float | km | 개선 행정동의 취약인구 가중 기존 평균 거리 |
| `after_avg_distance_km` | Float | km | 개선 행정동의 취약인구 가중 후보 거리 |
| `accessibility_gain_km` | Float | km | 위 두 평균 거리의 차이 |
| `vulnerable_population` | Integer | 명 | 개선 행정동 취약인구 합 |
| `score` | Float | 상대점수 | `accessibility_gain_km × ln(1 + vulnerable_population)` |
| `interpretation` | String | - | 직선거리 근거 설명 |
| `top_improved_districts` | Object[] | - | 상위 개선 행정동 상세 |

`top_improved_districts[]`는 `adm_nm`, `before_distance_km`, `after_distance_km`, `gain_km`, `vulnerable_population`, `weighted_gain`을 가진다. `weighted_gain`은 거리 개선량과 취약인구의 곱이다.

### 9.5 실제 도로 접근성 행렬

- 파일: `frontend/public/data/actual_road_accessibility_matrix.json`
- 공급 자원: 기준 기관 25곳 + 정책 후보 9곳
- 경로 계약: `150 × (25 + 9) = 5,100`

#### 최상위·행정동 필드

| 경로 | 타입 | 의미 |
|---|---|---|
| `metadata` | Object | 버전·제공자·건수·해시·좌표보정 감사 정보 |
| `districts` | Object[] | 행정동별 인구·최근접 기관·전체 경로 |
| `candidates` | Object[] | 9개 후보 자원 사전 |
| `districts[].id` | String | 행정동 자원 ID; 현재 전체 행정동명 |
| `districts[].name` | String | 행정동 표시명; 현재 `id`와 같음 |
| `districts[].lat`, `districts[].lng` | Float | 행정동 중심 위·경도 |
| `districts[].vulnerable_population` | Integer | 소아+고령 인구 |
| `districts[].senior_population` | Integer | 65세 이상 인구 |
| `districts[].pediatric_population` | Integer | 0~9세 인구 |
| `districts[].nearest_emergency_resource` | Object | 전체 25개 기준 기관 중 최소 ETA 기관 |
| `districts[].nearest_emergency_resource_by_mode` | Object | 소아·고령 모드별 기준 기관 중 최소 ETA 기관 |
| `districts[].emergency_resource_routes` | Object[] | 기준 기관 25곳까지의 경로 |
| `districts[].candidate_routes` | Object | 후보 자원 ID를 키로 한 후보 9곳까지의 경로 |

행정동 객체의 중첩 컬럼명은 `nearest_emergency_resource`, `nearest_emergency_resource_by_mode`, `emergency_resource_routes`, `candidate_routes`이며, 인구 컬럼명은 `senior_population`, `pediatric_population`이다. 후보 사전의 모드 내부 번호 컬럼은 `candidate_id`다.

#### 경로·후보 필드

| 경로 | 타입 | 의미 |
|---|---|---|
| `nearest_emergency_resource.resource_id` | String | `hospital:{기관명}` |
| `nearest_emergency_resource.resource_name` | String | 기관 표시명 |
| `nearest_emergency_resource.tier` | Integer | 기관 내부 분류 |
| `nearest_emergency_resource.eta_minutes` | Float | 일반 차량 ETA, 분 |
| `nearest_emergency_resource.road_distance_km` | Float | 도로거리, km |
| `emergency_resource_routes[].resource_id` | String | 기준 기관 자원 ID |
| `emergency_resource_routes[].resource_name` | String | 기준 기관명 |
| `emergency_resource_routes[].tier` | Integer | 기관 내부 분류 |
| `emergency_resource_routes[].eta_minutes` | Float | 경로 ETA, 분 |
| `emergency_resource_routes[].road_distance_km` | Float | 도로거리, km |
| `candidate_routes.{candidate_id}.eta_minutes` | Float | 후보까지 ETA, 분 |
| `candidate_routes.{candidate_id}.distance_km` | Float | 후보까지 도로거리, km |
| `candidates[].id` | String | `candidate:{mode}:{candidate_id}` |
| `candidates[].candidate_id` | Integer | 모드 내부 후보 번호 |
| `candidates[].mode` | String | 수요 모드 |
| `candidates[].name` | String | 후보 표시명 |
| `candidates[].lat`, `candidates[].lng` | Float | 후보 위·경도 |

#### 주요 메타데이터

| 필드 | 의미 |
|---|---|
| `version` | 분석 버전 |
| `method` | 경로 산출 방식; 현재 `actual_road_route_api` |
| `provider` | 경로 제공자; 현재 Kakao Mobility Directions API |
| `priority` | 경로 선택 옵션; 현재 `RECOMMEND` |
| `district_count`, `resource_count`, `candidate_count` | 행정동·기준 기관·후보 수 |
| `resource_count_by_mode` | 소아·고령 모드별 기준 기관 수 |
| `requested_route_count`, `successful_route_count` | 요청·성공 경로 수 |
| `unavailable_route_count`, `missing_route_count` | 이용 불가·누락 경로 수 |
| `source_sha256` | 좌표·자원 입력 묶음 해시 |
| `route_result_sha256` | 경로 결과 묶음 해시 |
| `generated_at` | 파일 생성시각 |
| `route_provenance.execution_mode` | 캐시 전용 또는 외부 조회 실행 방식 |
| `route_provenance.cached_route_count`, `fetched_route_count` | 캐시·신규 조회 경로 수 |
| `route_provenance.coordinate_snap_route_count` | 좌표 보정이 사용된 경로 수 |
| `route_provenance.coordinate_snap_audit` | 보정 출발지·목적지·거리·상세 내역 |

좌표 보정 상세 행은 `origin_id`, `destination_id`, `origin_snap_offset`, `destination_snap_offset`, `origin_snap_distance_km`, `destination_snap_distance_km`, `max_snap_distance_km`를 가진다.

### 9.6 후보 민감도 분석

- 파일: `data/processed/candidate_sensitivity_analysis.json`
- 분석 단위: 최상위는 모드 1건, 내부는 시나리오 1건

| 경로 | 타입 | 의미 |
|---|---|---|
| `[].mode` | String | `pediatric` 또는 `senior` |
| `[].total_scenarios` | Integer | 계획한 시나리오 수 |
| `[].completed_scenarios` | Integer | 완료 시나리오 수 |
| `[].skipped_scenarios` | Integer | 건너뛴 시나리오 수 |
| `[].base_input_count` | Integer | 기본 조건의 수요점 수 |
| `[].stable_candidate_groups` | Object[] | 공간적으로 묶인 후보 출현 그룹 |
| `[].scenarios` | Object[] | 개별 실행 결과 요약 |
| `stable_candidate_groups[].stability_group_id` | Integer | 안정 그룹 ID |
| `stable_candidate_groups[].lat`, `lng` | Float | 그룹 대표 좌표 |
| `stable_candidate_groups[].occurrence_count` | Integer | 그룹에 배정된 후보 출현 횟수 |
| `stable_candidate_groups[].scenario_count` | Integer | 그룹이 등장한 시나리오 수 |
| `stable_candidate_groups[].scenario_coverage_ratio` | Float | 등장 시나리오 수 / 전체 시나리오 수 |
| `stable_candidate_groups[].avg_demand` | Float | 그룹 후보의 평균 수요점 수 |
| `stable_candidate_groups[].dominant_candidate_group` | String | `main_daegu`, `hold`, `separate_region` 중 우세 그룹 |
| `scenarios[].scenario_key` | String | K·난수 시드·거리 상한·군위 포함 조건을 합친 키 |
| `scenarios[].status` | String | 실행 상태 |
| `scenarios[].input_count` | Integer | 해당 시나리오 수요점 수 |
| `scenarios[].candidate_count` | Integer | 해당 시나리오 후보 수 |

### 9.7 입지 최적화

- 파일: `data/processed/policy_location_optimization.json`
- 분석 단위: 모드 × 추가 시설 수(1~3)
- 최적화 범위: 9개 안정 후보 내부의 완전 열거이며 대구 전역의 연속 공간 최적해가 아니다.

| 경로 | 타입 | 의미 |
|---|---|---|
| `metadata.version` | String | 분석 버전 |
| `metadata.matrix_method` | String | 입력 행렬 산출 방식 |
| `metadata.matrix_source_sha256` | String | 행렬 입력 해시 |
| `metadata.matrix_route_result_sha256` | String | 경로 결과 해시 |
| `metadata.resource_count` | Integer | 전체 기준 기관 수 |
| `metadata.resource_count_by_mode` | Object | 모드별 기준 기관 수 |
| `metadata.optimization` | String | 현재 `exact_enumeration` |
| `metadata.max_facilities` | Integer | 비교한 최대 추가 시설 수 |
| `metadata.objective_populations` | Object | 모드별 목적 인구 합계 |
| `metadata.excluded_district_count`, `excluded_population` | Integer | 전체 제외 행정동·인구 |
| `metadata.excluded_by_mode` | Object | 모드별 제외 행정동·인구 |
| `results.pediatric`, `results.senior` | Object[] | 모드별 시설 수 1~3의 최적 결과 |
| `results.*[].facility_count` | Integer | 동시에 선택할 후보 수 |
| `results.*[].combination_count` | Integer | 비교한 후보 조합 수 |
| `results.*[].p_median_optimum` | Object | 인구 가중 평균 ETA 최소 조합 |
| `results.*[].mclp_15min_optimum` | Object | 15분 내 후보 도달권 인구 최대 조합 |
| `results.*[].mclp_30min_optimum` | Object | 30분 내 후보 도달권 인구 최대 조합 |

세 목적함수 결과 객체는 공통으로 다음 필드를 가진다.

| 필드 | 타입 | 의미 |
|---|---|---|
| `candidate_ids` | Integer[] | 선택 후보의 모드 내부 ID |
| `candidate_resource_ids` | String[] | `candidate:{mode}:{id}` 전체 ID |
| `weighted_average_eta_minutes` | Float | 기존 기관과 선택 후보를 합친 최소 ETA의 모드 인구 가중 평균 |
| `covered_15min_population` | Integer | 선택 후보 중 하나에 15분 내 도달 가능한 인구 |
| `covered_15min_ratio` | Float | 위 인구 / 모드 목적 인구 |
| `covered_30min_population` | Integer | 선택 후보 중 하나에 30분 내 도달 가능한 인구 |
| `covered_30min_ratio` | Float | 위 인구 / 모드 목적 인구 |
| `improved_population` | Integer | 후보 추가로 기존 기관 대비 ETA가 짧아지는 인구 |

### 9.8 통합 정책 릴리스

- 파일: `data/processed/policy_release.json`
- 배포 복제본: `frontend/public/data/policy_release.json`
- 최상위 `hospitals`, `vulnerability`, `candidates`, `candidate_trace`, `optimization`은 앞 절의 스키마를 그대로 포함한다.

| `metadata` 필드 | 타입 | 의미 |
|---|---|---|
| `version` | String | 정책 릴리스 ID |
| `released_at` | String | ISO 8601 릴리스 시각 |
| `population_base_month` | String | 인구 기준월 |
| `population_source_sha256` | String | 검증 인구 CSV 해시 |
| `population_manifest_sha256` | String | 인구 manifest 해시 |
| `district_count` | Integer | 행정동 수 |
| `resource_count` | Integer | 기준 기관 수 |
| `resource_count_by_mode` | Object | 소아·고령 모드별 기준 기관 수 |
| `candidate_count` | Integer | 정책 후보 수 |
| `risk_threshold` | Float | VDI 상위 25% 구분 경계값 |
| `high_risk_district_count` | Integer | 경계 이상 행정동 수 |
| `route_count` | Integer | 릴리스 경로 수 |
| `successful_route_count` | Integer | 성공 경로 수 |
| `missing_route_count` | Integer | 누락 경로 수 |
| `source_sha256` | String | 행정동·기관·후보 입력 해시 |
| `route_result_sha256` | String | 도로경로 결과 해시 |
| `sensitivity_sha256` | String | 민감도 결과 해시 |
| `sensitivity_scenario_count_per_mode` | Object | 모드별 계획 시나리오 수 |
| `sensitivity_completed_count_per_mode` | Object | 모드별 완료 시나리오 수 |
| `coordinate_snap_route_count` | Integer | 좌표 보정 경로 수 |
| `coordinate_snap_average_distance_km` | Float | 보정 경로별 최대 보정거리 평균 |
| `coordinate_snap_max_distance_km` | Float | 최대 보정거리 |
| `content_sha256` | Object | 릴리스 구성요소별 정규화 JSON 해시 |

### 9.9 정책 모니터링 CSV

- 파일: `data/analysis/policy_monitoring_report.csv`
- 배포 복제본: `frontend/public/data/policy_monitoring_report.csv`
- 분석 단위: 행정동 1건, 150행

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `행정동` | String | 행정동 이름 |
| `VDI` | Float | 현재 도로 ETA 기반 VDI |
| `65세이상` | Integer | 65세 이상 인구, 명 |
| `0-9세` | Integer | 0~9세 인구, 명 |
| `취약인구합계` | Integer | 두 연령집단 합계, 명 |
| `최근접병원` | String | 도로 ETA 기준 최근접 기관명 |
| `최근접거리km` | Float | `min_dist_to_hospital`에서 가져온 직선거리 값 |

CSV의 `최근접병원`은 도로 ETA 기준이고 `최근접거리km`는 직선거리 기준이므로 두 값을 같은 경로의 이름·거리 쌍으로 해석하지 않는다.

## 10. 운영 SQLite 데이터 사전

- 파일: `data/hospitals.db`
- 성격: 백엔드 수집·상태·화면 제공을 위한 변동 저장소
- 2026-07-31 관측 행 수: `admin_dong` 300, `dashboard_snapshot` 15, `data_source_status` 9, `hospitals` 25, `job_lock` 1, `medical_facility` 63, `population_snapshot` 150
- 운영 DB의 레코드 수와 시각은 갱신 작업에 따라 변할 수 있다. 정책 릴리스의 150행정동·25기관 고정 계약과 직접 비교하지 않는다.

### 10.1 `hospitals`

| 컬럼 | SQLite 타입 | 의미 |
|---|---|---|
| `id` | INTEGER | 자동 증가 내부 PK |
| `name` | VARCHAR | 기관명 |
| `lat`, `lng` | FLOAT | WGS84 위·경도 |
| `tier` | INTEGER | 내부 기관 분류 1·2·3 |
| `address` | VARCHAR | 주소 |
| `tel` | VARCHAR | 전화번호 |

### 10.2 `admin_dong`

| 컬럼 | SQLite 타입 | 의미 |
|---|---|---|
| `admin_dong_code` | VARCHAR | 행정동 코드 PK |
| `sido_code` | VARCHAR | 시도 코드 |
| `sigungu_code` | VARCHAR | 시군구 코드 |
| `sido_name` | VARCHAR | 시도명 |
| `sigungu_name` | VARCHAR | 시군구명 |
| `admin_dong_name` | VARCHAR | 행정동명 |
| `full_address` | VARCHAR | 전체 행정구역명 |
| `center_latitude`, `center_longitude` | FLOAT | 중심 위·경도; 원천 좌표계 확인 후 저장 |
| `geometry` | VARCHAR | WKT 또는 GeoJSON 문자열 |
| `is_active` | BOOLEAN | 활성 행정동 여부 |
| `source_updated_at` | DATETIME | 원천 자료 갱신시각 |
| `collected_at` | DATETIME | 프로젝트 수집시각 |

### 10.3 `medical_facility`

| 컬럼 | SQLite 타입 | 의미 |
|---|---|---|
| `facility_id` | VARCHAR | 외부 기관 식별자 PK |
| `facility_name` | VARCHAR | 기관명 |
| `official_type_code`, `official_type_name` | VARCHAR | 공식 기관 유형 코드·명칭 |
| `dashboard_category` | VARCHAR | 화면 분류; 예: `large`, `secondary`, `moonlightPediatric` |
| `address` | VARCHAR | 주소 |
| `sido_name`, `sigungu_name` | VARCHAR | 시도·시군구명 |
| `latitude`, `longitude` | FLOAT | WGS84 위·경도 |
| `phone` | VARCHAR | 대표 전화 |
| `emergency_phone` | VARCHAR | 응급실 전화 |
| `is_moonlight` | BOOLEAN | 달빛어린이병원 여부 |
| `is_pediatric_center` | BOOLEAN | 소아 대응 기관 여부 |
| `is_active` | BOOLEAN | 활성 기관 여부 |
| `source_updated_at` | DATETIME | 원천 자료 갱신시각 |
| `collected_at` | DATETIME | 프로젝트 수집시각 |

### 10.4 `population_snapshot`

복합 PK는 `base_month` + `admin_dong_code`다.

| 컬럼 | SQLite 타입 | 의미 |
|---|---|---|
| `base_month` | VARCHAR | 기준월 `YYYY.MM` |
| `admin_dong_code` | VARCHAR | 행정동 코드 |
| `admin_dong_name` | VARCHAR | 행정동명 |
| `total_population` | INTEGER | 총인구, 명 |
| `male_population` | INTEGER | 남자 인구, 명 |
| `female_population` | INTEGER | 여자 인구, 명 |
| `household_count` | INTEGER | 세대 수 |
| `collected_at` | DATETIME | 프로젝트 수집시각 |

### 10.5 `data_source_status`

| 컬럼 | SQLite 타입 | 의미 |
|---|---|---|
| `source_name` | VARCHAR | 원천 이름 PK |
| `source_version` | VARCHAR | 원천 버전·기준시점 문자열 |
| `data_hash` | VARCHAR | 현재 원천 내용 해시 |
| `record_count` | INTEGER | 마지막 처리 레코드 수 |
| `last_checked_at` | DATETIME | 마지막 확인시각 |
| `last_updated_at` | DATETIME | 내용이 마지막으로 변경된 시각 |
| `last_success_at` | DATETIME | 마지막 성공시각 |
| `status` | VARCHAR | 현재 관측값은 `updated`, `unchanged`, `degraded`, `static` |
| `error_message` | VARCHAR | 마지막 오류 설명 |

확인시각·갱신시각·성공시각은 의미가 다르므로 서로 대체하지 않는다.

### 10.6 `dashboard_snapshot`

| 컬럼 | SQLite 타입 | 의미 |
|---|---|---|
| `snapshot_id` | INTEGER | 자동 증가 PK |
| `generated_at` | DATETIME | 스냅샷 생성시각 |
| `admin_dong_count` | INTEGER | 행정동 수 |
| `emergency_total` | INTEGER | 응급 관련 기관 합계 |
| `large_emergency_count` | INTEGER | 대형·권역 분류 기관 수 |
| `secondary_emergency_count` | INTEGER | 준종합·일반 응급 분류 기관 수 |
| `moonlight_pediatric_count` | INTEGER | 달빛어린이병원 분류 기관 수 |
| `high_risk_admin_dong_count` | INTEGER | 고위험 행정동 수 |
| `risk_threshold` | FLOAT | 스냅샷 시점 VDI 경계값 |
| `population_base_month` | VARCHAR | 인구 기준월 |
| `source_versions` | VARCHAR | 원천별 버전 JSON 문자열 |
| `analysis_version` | VARCHAR | 정책분석 버전 |

### 10.7 `job_lock`

| 컬럼 | SQLite 타입 | 의미 |
|---|---|---|
| `lock_name` | VARCHAR | 작업 잠금 이름 PK |
| `locked_at` | DATETIME | 잠금 획득시각 |
| `locked_by` | VARCHAR | 잠금 소유 프로세스·인스턴스 식별값 |

## 11. 시민용 병원 응답 계약

이 절은 저장 파일 자체가 아니라 `hospitals` 정적 정보와 실시간 캐시가 결합된 API 레코드의 컬럼 계약이다.

| 필드 | 타입 | 의미·주의사항 |
|---|---|---|
| `name`, `lat`, `lng`, `tier`, `address`, `tel` | 혼합 | 정적 기관 기본정보 |
| `hvec` | Integer 또는 null | 일반 응급실 가용 병상 원천값 |
| `hvoc` | Integer 또는 null | 별도 응급 병상 원천값; 화면 수용 판단 합계로 자동 더하지 않음 |
| `available_beds` | Integer 또는 null | 현재 백엔드 계약상 `hvec`와 같은 일반 응급실 가용 병상 |
| `total_hvec` | Integer 또는 null | 일반 응급실 기준 총 병상 |
| `total_hvoc` | Integer 또는 null | 별도 응급 병상 기준 총 병상 |
| `total_beds` | Integer 또는 null | 현재 백엔드 계약상 `total_hvec`와 같은 값 |
| `realtime_source` | String | `nemc-mediboard`, `api`, `mock`, `unavailable` 등 데이터 경로 |
| `realtime_messages` | String[] 또는 null | 진료 제한·특이사항 메시지 |
| `severe_conditions` | Object 또는 null | 질환 코드별 `status`와 `message` |
| `operating_hours` | String 또는 null | 확인된 운영시간 설명 |
| `emergency_equipment_status` | Object 또는 null | CT·MRI 등 응급 핵심장비의 현재 가용 여부 |
| `special_beds` | Object 또는 null | 병상 종류별 `available`, `total`, `is_available` |
| `is_moonlight` | Boolean | 달빛어린이병원 여부 |
| `is_pediatric_center` | Boolean | 소아 대응 기관 플래그 |

`null`은 미확인이다. 0, 불가, 미보유와 같은 뜻이 아니다. 병상 원천에 음수나 총병상보다 큰 가용병상처럼 논리적으로 불가능한 값이 들어올 수 있으므로 화면은 그대로 수용 가능 판정에 사용하지 않는다.

## 12. 실험·목업·구형 호환 데이터

### 12.1 공통 후보 경량 JSON

대상: `optimal_locations*.json`, `*_BASELINE.json`.

| 필드 | 타입 | 의미 |
|---|---|---|
| `id` | Integer | 파일 내부 후보 번호 |
| `lat`, `lng` | Float | 후보 위·경도 |
| `demand` | Integer | 후보에 배정된 수요점 수 |

이 파일들은 과거 K-Means 결과 또는 비교 기준이다. 현재 화면·설명의 정본은 `policy_release.json.candidates`다.

### 12.2 구형 우선순위 JSON

대상: `data/priority_targets.json`, `frontend/public/data/priority_targets.json`.

| 필드 | 타입 | 의미 |
|---|---|---|
| `highRiskTop10` | String[] | VDI 상위 행정동 10곳 |
| `pediatricPriority` | String | 소아 우선 검토 행정동 |
| `generalPriority` | String | 일반 우선 검토 행정동 |

두 파일의 `highRiskTop10` 내용이 현재 서로 다르므로 정본으로 사용할 수 없다.

### 12.3 목업 행정 지표

- 파일: `data/processed/region_indicators.csv`
- 150행, 난수 시드 42로 생성된 합성 자료

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `시도`, `시군구`, `행정동` | String | 합성 지표의 지역 식별값 |
| `청년_인구수` | Integer | 합성 청년 인구 |
| `평균_월세_만원` | Integer | 합성 평균 월세, 만 원 |
| `버스정류장_수` | Integer | 합성 버스정류장 수 |
| `병원_약국_수` | Integer | 합성 병원·약국 수 |
| `행정복지센터_접근성_점수` | Float | 합성 접근성 점수 |
| `소외_지수` | Float | 앞의 합성 지표를 정규화·가중해 만든 1~100 점수 |

### 12.4 목업 의료 접근성

- 파일: `data/processed/mock_medical_data.json`
- `meta`와 150개 `records`로 구성된 난수 시드 42 합성 자료

| `records[]` 필드 | 타입 | 의미 |
|---|---|---|
| `adm_nm` | String | 시군구+행정동명 |
| `center_lat`, `center_lng` | Float | 행정동 중심 위·경도 |
| `nearest_tier1_er` | String | 합성 최근접 Tier 1 기관명 |
| `tier1_er_lat`, `tier1_er_lng` | Float | 해당 기관 좌표 |
| `distance_tier1` | Float | 합성 직선거리, km |
| `nearest_tier2_er` | String | 합성 최근접 Tier 2 기관명 |
| `tier2_er_lat`, `tier2_er_lng` | Float | 해당 기관 좌표 |
| `distance_tier2` | Float | 합성 직선거리, km |
| `nearest_pediatric_er` | String | 합성 최근접 달빛어린이병원명 |
| `pediatric_er_lat`, `pediatric_er_lng` | Float | 해당 기관 좌표 |
| `pediatric_er_distance_km` | Float | 합성 직선거리, km |
| `is_golden_time_missed` | Boolean | 합성 규칙상 Tier 1까지 15분 초과 여부 |
| `bed_shortage_index` | Float | 합성 병상 부족 지수, 0~100 |

### 12.5 투영 K-Means 비교

- 파일: `data/processed/projected_kmeans_candidate_comparison.json`
- 용도: 위경도 직접 K-Means, WGS84 재계산, 투영좌표 K-Means 후보의 좌표 차이 진단

| 필드 | 타입 | 의미 |
|---|---|---|
| `mode` | String | 소아·고령 모드 |
| `k` | Integer | 후보 군집 수 |
| `blind_spot_count` | Integer | 입력 사각지대 수요점 수 |
| `current_candidates` | Object[] | 기존 후보 `id`, `lat`, `lng`, `demand` |
| `wgs84_recomputed_candidates` | Object[] | 위경도 기준 재계산 후보 |
| `projected_candidates` | Object[] | 투영좌표계 기준 후보 |
| `comparisons` | Object[] | 투영 후보별 기존·재계산 후보와의 최근접 거리 비교 |

`comparisons[]`는 `projected_id`, `nearest_current_id`, `distance_to_current_km`, `nearest_wgs84_id`, `distance_to_wgs84_km`를 가진다.

### 12.6 도로 ETA 캐시

- 파일: `data/cache/kakao_road_eta_cache.json`
- 성격: 분석 재현과 외부 API 호출 절감을 위한 기술 캐시이며 Git 추적 대상이 아니다.

| 필드 | 타입 | 의미 |
|---|---|---|
| `version` | Integer | 캐시 스키마 버전 |
| `updated_at_epoch` | Integer | 캐시 마지막 갱신 Unix epoch 초 |
| `routes` | Object | SHA-256 캐시 키별 경로 결과 |
| `routes.*.status` | String | 경로 상태, 예: `ok` |
| `routes.*.eta_seconds` | Integer | ETA, 초 |
| `routes.*.distance_meters` | Integer | 도로거리, m |
| `routes.*.fetched_at_epoch` | Integer | 외부 조회시각 Unix epoch 초 |
| `routes.*.provider` | String | 경로 제공자 식별값 |
| `routes.*.origin_id` | String | 출발 행정동 ID |
| `routes.*.destination_id` | String | `hospital:*` 또는 `candidate:*` 목적지 ID |

### 12.7 구형 5행 정책 보고서

- 파일: `data/policy_monitoring_report.csv`
- 성격: 5개 예시 지역만 있는 구형 산출물이다. 150행 현행 모니터링 CSV와 혼용하지 않는다.

| 컬럼 | 타입 | 의미 |
|---|---|---|
| `행정동명` | String | 예시 행정동명 |
| `우선순위_그룹` | String | 구형 우선순위 분류 |
| `VDI_취약도지수` | Float | 구형 VDI 값 |
| `사각지대_보육시설수` | Integer | 구형 소아 사각지대 시설 수 |
| `소아인구수` | Integer | 구형 소아 인구 값 |
| `가장_가까운_달빛병원` | String | 구형 최근접 달빛어린이병원명 |
| `평균이동거리(km)` | Float | 구형 평균 이동거리, km |

## 13. 결합 키·단위·결측 규칙

### 13.1 권장 JOIN

| 결합 | 권장 키 | 금지·주의 |
|---|---|---|
| 인구 ↔ 취약도 | `시군구 행정동` 형식으로 정규화한 `동이름` | 공백·`대구광역시` 접두어를 정규화 |
| 취약도 ↔ 도로 행렬 | 전체 명칭 `adm_nm == districts[].name` | 행정동명만으로 JOIN하지 않음 |
| 기관 ↔ 도로 행렬 | `hospital:{final_hospitals.name}` | 유사 기관명을 임의 병합하지 않음 |
| 후보 ↔ 도로 행렬 | `candidate:{mode}:{id}` | `id`만으로 두 모드를 합치지 않음 |
| 의료기관 기본 ↔ 시설정보 | `암호화요양기호` | 의료기관명 JOIN보다 우선 |
| 행정동 코드 이력 | 코드·개정일·활성 규칙 | HIRA 시군구코드와 직접 JOIN하지 않음 |

### 13.2 단위

- 위·경도: WGS84, 위도 `lat/latitude/Y`, 경도 `lng/longitude/X`
- 직선·도로 거리: 파일명이 달리 명시하지 않으면 km
- 캐시 거리: `distance_meters`만 m
- ETA: 분석 파일은 분, 캐시는 초
- 인구·기관·시설·병상: 개수 또는 명
- 비율: `*_ratio`, `scenario_coverage_ratio`는 0~1
- 정규화 점수: `vdi_norm`, `score`는 0~100

### 13.3 결측·이상치

- JSON의 `null`은 미확인 또는 적용 불가다. 임의로 0으로 치환하지 않는다.
- 외부 CSV 추출본의 빈 문자열은 원천 결측이다.
- `estimated_travel_time_*`는 현재 전 행이 `null`이므로 분석 컬럼으로 사용하지 않는다.
- `available_beds=0`은 확인된 0이고 `available_beds=null`은 미확인이다.
- 음수 가용 병상, 가용 병상 > 총 병상은 운영 원천 이상치로 보고 화면 판정에서 제외한다.
- 최근 파티션·운영 DB 수치는 외부 수집 지연과 Render 비영속성 영향을 받을 수 있다.

## 14. 출처·라이선스 상태

저장소에 데이터 출처의 단서는 있으나, 개별 원천의 이용허락 유형·버전·재배포 허용범위를 한곳에 증빙한 파일은 없다. 외부 배포 전 원천 페이지의 현재 약관과 표시 의무를 별도로 확인해야 한다.

| 데이터 | 저장소에서 확인되는 출처 | 기준시점 | 라이선스·재배포 상태 |
|---|---|---|---|
| 행정동 경계 | `vuski/admdongkor` 파일, SGIS 계보 | 파일 버전 2023-07-01 | 저장소 내 명시적 증빙 없음; 확인 필요 |
| 행정동 연령별 인구 | 통계청 KOSIS 5세별 주민등록인구 | 2026.07 | 저장소 내 명시적 증빙 없음; 확인 필요 |
| 응급기관 기본정보 | 국립중앙의료원·공공데이터포털 API | 현재 릴리스 입력 수집일은 개별 확정 불가 | 공공데이터포털 이용조건 확인 필요 |
| 달빛어린이병원 6곳 | 대구광역시 보건 지정 목록 | 코드 주석상 2026.07 | 페이지 이용조건과 최신 지정현황 확인 필요 |
| 병·의원·약국 추출본 | `전국 병의원 및 약국 현황 2026.3` | 2026.03 | 원본 ZIP의 이용조건·재배포 범위 확인 필요 |
| 행정동 코드 이력 | `국가데이터처_행정동 정보_20250704.csv` | 파일명상 2025-07-04 | 원본 이용조건 확인 필요 |
| 어린이집 | 현행 저장소에서 제공기관 미확정 | 확인 필요 | 출처·라이선스 모두 확인 필요 |
| 어린이집 좌표 | OpenStreetMap Nominatim 지오코딩 | 개별 수집일 미확정 | 표시·캐시·재배포 조건 확인 필요 |
| 도로 ETA | Kakao Mobility Directions API 캐시 | 릴리스 경로 수집 스냅샷 | API 약관상 저장·재배포 허용범위 확인 필요 |
| 목업 데이터 | 프로젝트 스크립트, 난수 시드 42 | 생성 버전별 | 합성 자료임을 표시; 프로젝트 자체 라이선스 파일 없음 |

## 15. 2026-07-31 문서화 점검 결과

| 검사 | 결과 | 판정·조치 |
|---|---:|---|
| 행정동 취약도 키 중복 | 0/150 | 통과 |
| 기준 기관명 중복 | 0/25 | 통과 |
| 후보 `mode + id` 중복 | 0/9 | 통과 |
| 요청·성공·누락 도로경로 | 5,100·5,100·0 | 통과 |
| `estimated_travel_time_minutes` 결측 | 150/150 | 사용하지 않는 보존 필드로 문서화 |
| `estimated_travel_time_vdi_log` 결측 | 150/150 | 사용하지 않는 보존 필드로 문서화 |
| 최근접 기관명·주소 불일치 | 45/150 | 주소는 기관 정본에 이름 JOIN하여 조회 필요 |
| 루트·배포 `priority_targets.json` 불일치 | 있음 | 둘 다 현행 정본에서 제외 |
| `data/processed/daegu_er_hospitals.json` 규모 | 18기관 | 최종 25기관 정본 대신 사용 금지 |
| `data/reports/golden-governance-portfolio.pdf` | 3,202,534바이트·20쪽 | 2026-08-02 검증본과 SHA-256 일치 확인; 데이터셋이 아닌 정책분석 산출물로 관리 |

현재 발견된 이름·주소 불일치는 VDI와 도로 ETA 계산값 자체를 바꾸지는 않지만, 상세 화면에서 주소를 함께 표시하면 잘못된 기관 주소가 연결될 수 있다. 생성 단계에서 `nearest_hospital_address`도 도로 ETA 최근접 기관 기준으로 갱신하고 회귀 검사를 추가하는 것이 필요하다.
