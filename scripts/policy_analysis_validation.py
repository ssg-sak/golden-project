from __future__ import annotations

import math
from collections import Counter
from collections.abc import Iterator
from typing import Any


DAEGU_SOUTH = 35.60
DAEGU_NORTH = 36.34
DAEGU_WEST = 128.34
DAEGU_EAST = 128.91

EXPECTED_DISTRICT_COUNT = 150
EXPECTED_HOSPITAL_COUNT = 25
EXPECTED_CANDIDATE_COUNT = 9
EXPECTED_ROUTE_COUNT = 5_100
EXPECTED_COORDINATE_SNAP_ROUTE_COUNT = 460
EXPECTED_UNIQUE_SNAPPED_ORIGIN_COUNT = 5
EXPECTED_UNIQUE_SNAPPED_DESTINATION_COUNT = 33
MAX_ALLOWED_SNAP_DISTANCE_KM = 0.75
EXPECTED_CONCENTRATED_DESTINATIONS = {
    "candidate:pediatric:6": 150,
    "candidate:senior:2": 150,
}

MODE_HOSPITAL_TIERS = {
    "pediatric": {3},
    "senior": {1, 2},
}

REQUIRED_FEATURE_NUMBERS = (
    "65세이상_인구",
    "0~9세_인구",
    "취약인구",
    "min_dist_to_hospital",
    "travel_time_minutes",
    "vulnerability_index",
    "vdi_norm",
    "center_lat",
    "center_lng",
)


def _require_number(values: dict[str, Any], key: str, context: str) -> float:
    if key not in values:
        raise ValueError(f"{context}에 필수 필드 `{key}`가 없습니다.")
    value = values[key]
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{context}의 `{key}`는 숫자여야 합니다.")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{context}의 `{key}`는 유한한 숫자여야 합니다.")
    return number


def _require_string(values: dict[str, Any], key: str, context: str) -> str:
    if key not in values:
        raise ValueError(f"{context}에 필수 필드 `{key}`가 없습니다.")
    value = values[key]
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{context}의 `{key}`는 비어 있지 않은 문자열이어야 합니다.")
    return value


def _assert_coordinate(lat: float, lng: float, context: str) -> None:
    if not (
        DAEGU_SOUTH <= lat <= DAEGU_NORTH
        and DAEGU_WEST <= lng <= DAEGU_EAST
    ):
        raise ValueError(
            f"{context} 좌표({lat}, {lng})가 대구 안전 경계 밖에 있습니다."
        )


def _iter_positions(coordinates: Any) -> Iterator[tuple[float, float]]:
    if not isinstance(coordinates, list) or not coordinates:
        raise ValueError("GeoJSON 좌표 배열이 비어 있거나 잘못됐습니다.")
    if (
        len(coordinates) >= 2
        and isinstance(coordinates[0], (int, float))
        and not isinstance(coordinates[0], bool)
        and isinstance(coordinates[1], (int, float))
        and not isinstance(coordinates[1], bool)
    ):
        yield float(coordinates[0]), float(coordinates[1])
        return
    for child in coordinates:
        yield from _iter_positions(child)


def _assert_exact_keys(
    actual: set[str],
    expected: set[str],
    context: str,
) -> None:
    missing = expected - actual
    unexpected = actual - expected
    if missing or unexpected:
        raise ValueError(
            f"{context} 키 계약이 일치하지 않습니다. "
            f"누락 {sorted(missing)}, 예상 외 {sorted(unexpected)}"
        )


def _validate_nearest(
    nearest: dict[str, Any] | None,
    routes: list[dict[str, Any]],
    context: str,
) -> bool:
    if nearest is None or not routes:
        raise ValueError(f"{context}의 최근접 기관 정보가 없습니다.")
    expected_nearest = min(
        routes,
        key=lambda route: (
            float(route["eta_minutes"]),
            str(route["resource_id"]),
        ),
    )
    minimum_eta = float(expected_nearest["eta_minutes"])
    tied_ids = {
        str(route["resource_id"])
        for route in routes
        if math.isclose(
            float(route["eta_minutes"]),
            minimum_eta,
            abs_tol=1e-9,
        )
    }
    if nearest["resource_id"] != expected_nearest["resource_id"]:
        raise ValueError(
            f"{context}의 최근접 기관이 (ETA, 자원 ID) 정렬 결과와 일치하지 않습니다."
        )
    return len(tied_ids) > 1


def _validate_coordinate_snap_audit(
    release_metadata: dict[str, Any],
    matrix_metadata: dict[str, Any],
    district_ids: set[str],
    resource_ids: set[str],
) -> dict[str, int | float]:
    route_provenance = matrix_metadata.get("route_provenance")
    if not isinstance(route_provenance, dict):
        raise ValueError("도로 행렬의 경로 계보 정보가 없습니다.")
    audit = route_provenance.get("coordinate_snap_audit")
    if not isinstance(audit, dict):
        raise ValueError("좌표 보정 감사 정보가 없습니다.")
    details = audit.get("route_details")
    if not isinstance(details, list):
        raise ValueError("좌표 보정 경로 상세가 없습니다.")

    origin_counts: Counter[str] = Counter()
    destination_counts: Counter[str] = Counter()
    route_distances: list[float] = []
    for index, detail in enumerate(details):
        if not isinstance(detail, dict):
            raise ValueError(f"좌표 보정 상세 {index}가 객체가 아닙니다.")
        origin_id = _require_string(detail, "origin_id", f"좌표 보정 상세 {index}")
        destination_id = _require_string(
            detail,
            "destination_id",
            f"좌표 보정 상세 {index}",
        )
        if origin_id not in district_ids:
            raise ValueError(f"좌표 보정 출발지 키가 행정동 계약에 없습니다: {origin_id}")
        if destination_id not in resource_ids:
            raise ValueError(
                f"좌표 보정 목적지 키가 기관·후보 계약에 없습니다: {destination_id}"
            )
        origin_distance = _require_number(
            detail,
            "origin_snap_distance_km",
            f"좌표 보정 상세 {index}",
        )
        destination_distance = _require_number(
            detail,
            "destination_snap_distance_km",
            f"좌표 보정 상세 {index}",
        )
        maximum_distance = _require_number(
            detail,
            "max_snap_distance_km",
            f"좌표 보정 상세 {index}",
        )
        if min(origin_distance, destination_distance) < 0:
            raise ValueError("좌표 보정 거리는 음수일 수 없습니다.")
        if not math.isclose(
            maximum_distance,
            max(origin_distance, destination_distance),
            abs_tol=1e-6,
        ):
            raise ValueError("좌표 보정 상세의 최대 거리가 재계산 결과와 다릅니다.")
        if maximum_distance > MAX_ALLOWED_SNAP_DISTANCE_KM:
            raise ValueError("좌표 보정 거리가 0.75km 허용 한도를 초과했습니다.")
        if origin_distance > 0:
            origin_counts[origin_id] += 1
        if destination_distance > 0:
            destination_counts[destination_id] += 1
        if maximum_distance <= 0:
            raise ValueError("보정 거리가 0인 경로가 좌표 보정 상세에 포함됐습니다.")
        route_distances.append(maximum_distance)

    route_count = len(details)
    origin_route_count = sum(origin_counts.values())
    destination_route_count = sum(destination_counts.values())
    maximum_distance = max(route_distances, default=0.0)
    average_distance = (
        sum(route_distances) / route_count if route_count else 0.0
    )
    if not (
        route_count
        == int(audit.get("route_count", -1))
        == int(route_provenance.get("coordinate_snap_route_count", -1))
        == int(release_metadata.get("coordinate_snap_route_count", -1))
        == EXPECTED_COORDINATE_SNAP_ROUTE_COUNT
        and origin_route_count == int(audit.get("origin_snap_route_count", -1))
        and destination_route_count
        == int(audit.get("destination_snap_route_count", -1))
        and len(origin_counts)
        == int(audit.get("unique_snapped_origin_count", -1))
        == EXPECTED_UNIQUE_SNAPPED_ORIGIN_COUNT
        and len(destination_counts)
        == int(audit.get("unique_snapped_destination_count", -1))
        == EXPECTED_UNIQUE_SNAPPED_DESTINATION_COUNT
    ):
        raise ValueError("좌표 보정 건수·집중도 계약이 일치하지 않습니다.")
    if set(audit.get("snapped_origin_ids", [])) != set(origin_counts):
        raise ValueError("좌표 보정 출발지 키 목록이 상세 경로와 일치하지 않습니다.")
    if set(audit.get("snapped_destination_ids", [])) != set(destination_counts):
        raise ValueError("좌표 보정 목적지 키 목록이 상세 경로와 일치하지 않습니다.")
    if set(origin_counts.values()) != {34}:
        raise ValueError("좌표 보정 출발지 5곳의 경로 집중도가 각각 34건이 아닙니다.")
    for resource_id, expected_count in EXPECTED_CONCENTRATED_DESTINATIONS.items():
        if destination_counts[resource_id] != expected_count:
            raise ValueError(
                f"{resource_id}의 좌표 보정 집중도가 {expected_count}건이 아닙니다."
            )
    if not (
        math.isclose(
            average_distance,
            float(audit.get("average_snap_distance_km", -1)),
            abs_tol=1e-6,
        )
        and math.isclose(
            maximum_distance,
            float(audit.get("max_snap_distance_km", -1)),
            abs_tol=1e-6,
        )
        and math.isclose(
            maximum_distance,
            float(release_metadata.get("coordinate_snap_max_distance_km", -1)),
            abs_tol=1e-6,
        )
        and math.isclose(
            average_distance,
            float(release_metadata.get("coordinate_snap_average_distance_km", -1)),
            abs_tol=1e-6,
        )
        and math.isclose(
            float(audit.get("allowed_max_snap_distance_km", -1)),
            MAX_ALLOWED_SNAP_DISTANCE_KM,
            abs_tol=1e-9,
        )
    ):
        raise ValueError("좌표 보정 거리 요약이 상세 경로 재계산 결과와 다릅니다.")

    return {
        "coordinate_snap_route_count": route_count,
        "coordinate_snap_route_percent": round(
            route_count / EXPECTED_ROUTE_COUNT * 100,
            2,
        ),
        "unique_snapped_origin_count": len(origin_counts),
        "unique_snapped_destination_count": len(destination_counts),
        "coordinate_snap_max_distance_km": maximum_distance,
    }


def validate_policy_analysis(
    release: dict[str, Any],
    matrix: dict[str, Any],
) -> dict[str, int | float]:
    metadata = release["metadata"]
    features = release["vulnerability"]["features"]
    hospitals = release["hospitals"]
    candidates = release["candidates"]
    districts = matrix["districts"]

    expected_routes = EXPECTED_DISTRICT_COUNT * (
        EXPECTED_HOSPITAL_COUNT + EXPECTED_CANDIDATE_COUNT
    )
    if not (
        metadata["district_count"] == len(features) == EXPECTED_DISTRICT_COUNT
        and metadata["resource_count"] == len(hospitals) == EXPECTED_HOSPITAL_COUNT
        and metadata["candidate_count"] == len(candidates) == EXPECTED_CANDIDATE_COUNT
        and metadata["route_count"]
        == metadata["successful_route_count"]
        == expected_routes
        == EXPECTED_ROUTE_COUNT
        and metadata["missing_route_count"] == 0
        and len(districts) == EXPECTED_DISTRICT_COUNT
    ):
        raise ValueError("정책 분석본의 개수·경로 계약이 일치하지 않습니다.")

    hospital_ids = {f"hospital:{hospital['name']}" for hospital in hospitals}
    if len(hospital_ids) != EXPECTED_HOSPITAL_COUNT:
        raise ValueError("기관 이름으로 만든 키가 고유하지 않습니다.")
    for hospital in hospitals:
        _assert_coordinate(
            _require_number(hospital, "lat", f"기관 {hospital['name']}"),
            _require_number(hospital, "lng", f"기관 {hospital['name']}"),
            f"기관 {hospital['name']}",
        )

    candidate_ids = {
        f"candidate:{candidate['mode']}:{candidate['id']}"
        for candidate in candidates
    }
    if len(candidate_ids) != EXPECTED_CANDIDATE_COUNT:
        raise ValueError("후보의 모드·번호 복합키가 고유하지 않습니다.")
    for candidate in candidates:
        if candidate["mode"] not in MODE_HOSPITAL_TIERS:
            raise ValueError(f"후보 {candidate['id']}의 모드가 유효하지 않습니다.")
        _assert_coordinate(
            _require_number(candidate, "lat", f"후보 {candidate['mode']}:{candidate['id']}"),
            _require_number(candidate, "lng", f"후보 {candidate['mode']}:{candidate['id']}"),
            f"후보 {candidate['mode']}:{candidate['id']}",
        )

    matrix_candidates = matrix["candidates"]
    matrix_candidates_by_id = {
        str(candidate["id"]): candidate for candidate in matrix_candidates
    }
    if len(matrix_candidates_by_id) != EXPECTED_CANDIDATE_COUNT:
        raise ValueError("도로 행렬 후보 키가 고유하지 않습니다.")
    _assert_exact_keys(
        set(matrix_candidates_by_id),
        candidate_ids,
        "도로 행렬 후보",
    )
    for candidate in candidates:
        resource_id = f"candidate:{candidate['mode']}:{candidate['id']}"
        matrix_candidate = matrix_candidates_by_id[resource_id]
        if (
            matrix_candidate["mode"] != candidate["mode"]
            or int(matrix_candidate["candidate_id"]) != int(candidate["id"])
            or not math.isclose(
                float(matrix_candidate["lat"]),
                float(candidate["lat"]),
                abs_tol=1e-9,
            )
            or not math.isclose(
                float(matrix_candidate["lng"]),
                float(candidate["lng"]),
                abs_tol=1e-9,
            )
        ):
            raise ValueError(
                f"{resource_id}의 릴리스·도로 행렬 후보 정보가 일치하지 않습니다."
            )

    matrix_metadata = matrix["metadata"]
    if not (
        matrix_metadata["district_count"] == EXPECTED_DISTRICT_COUNT
        and matrix_metadata["resource_count"] == EXPECTED_HOSPITAL_COUNT
        and matrix_metadata["candidate_count"] == EXPECTED_CANDIDATE_COUNT
        and matrix_metadata["requested_route_count"]
        == matrix_metadata["successful_route_count"]
        == EXPECTED_ROUTE_COUNT
        and matrix_metadata["missing_route_count"] == 0
    ):
        raise ValueError("도로 행렬 메타데이터 계약이 일치하지 않습니다.")

    districts_by_name: dict[str, dict[str, Any]] = {}
    nearest_tie_count = 0
    for district in districts:
        name = _require_string(district, "name", "도로 행렬 행정동")
        district_id = _require_string(district, "id", f"도로 행렬 {name}")
        if name != district_id:
            raise ValueError(f"{name}의 행정동 이름과 키가 일치하지 않습니다.")
        if name in districts_by_name:
            raise ValueError(f"도로 행렬 행정동 키가 중복됐습니다: {name}")
        districts_by_name[name] = district

        _assert_coordinate(
            _require_number(district, "lat", f"도로 행렬 {name}"),
            _require_number(district, "lng", f"도로 행렬 {name}"),
            f"도로 행렬 {name}",
        )
        senior_population = int(
            _require_number(district, "senior_population", f"도로 행렬 {name}")
        )
        pediatric_population = int(
            _require_number(district, "pediatric_population", f"도로 행렬 {name}")
        )
        vulnerable_population = int(
            _require_number(district, "vulnerable_population", f"도로 행렬 {name}")
        )
        if min(senior_population, pediatric_population) < 0:
            raise ValueError(f"{name}의 대상 인구가 음수입니다.")
        if vulnerable_population != senior_population + pediatric_population:
            raise ValueError(f"{name}의 취약인구 합계가 일치하지 않습니다.")

        hospital_routes = district["emergency_resource_routes"]
        if len(hospital_routes) != EXPECTED_HOSPITAL_COUNT:
            raise ValueError(f"{name}의 기관 경로 수가 25개가 아닙니다.")
        route_ids = {str(route["resource_id"]) for route in hospital_routes}
        _assert_exact_keys(route_ids, hospital_ids, f"{name} 기관 경로")
        for route in hospital_routes:
            if _require_number(route, "eta_minutes", f"{name} 기관 경로") <= 0:
                raise ValueError(f"{name}에 0 이하 기관 ETA가 있습니다.")

        candidate_routes = district["candidate_routes"]
        _assert_exact_keys(set(candidate_routes), candidate_ids, f"{name} 후보 경로")
        for resource_id, route in candidate_routes.items():
            if route is None:
                raise ValueError(f"{name}의 {resource_id} 경로가 누락됐습니다.")
            if _require_number(route, "eta_minutes", f"{name} 후보 경로") <= 0:
                raise ValueError(f"{name}에 0 이하 후보 ETA가 있습니다.")

        if _validate_nearest(
            district["nearest_emergency_resource"],
            hospital_routes,
            f"{name} 전체 기관",
        ):
            nearest_tie_count += 1
        for mode, tiers in MODE_HOSPITAL_TIERS.items():
            mode_routes = [
                route for route in hospital_routes if int(route["tier"]) in tiers
            ]
            _validate_nearest(
                district["nearest_emergency_resource_by_mode"][mode],
                mode_routes,
                f"{name} {mode} 기관",
            )

    feature_names: set[str] = set()
    vertex_count = 0
    for feature in features:
        properties = feature["properties"]
        name = _require_string(properties, "adm_nm", "취약도 GeoJSON 행정동")
        if name in feature_names:
            raise ValueError(f"취약도 GeoJSON 행정동 키가 중복됐습니다: {name}")
        feature_names.add(name)
        for key in REQUIRED_FEATURE_NUMBERS:
            _require_number(properties, key, f"취약도 GeoJSON {name}")

        senior_population = int(properties["65세이상_인구"])
        pediatric_population = int(properties["0~9세_인구"])
        vulnerable_population = int(properties["취약인구"])
        if vulnerable_population != senior_population + pediatric_population:
            raise ValueError(f"{name}의 GeoJSON 취약인구 합계가 일치하지 않습니다.")

        road_eta = float(properties["travel_time_minutes"])
        expected_vdi = round(math.log1p(road_eta) * vulnerable_population, 2)
        if not math.isclose(
            float(properties["vulnerability_index"]),
            expected_vdi,
            abs_tol=0.01,
        ):
            raise ValueError(f"{name}의 VDI 재계산 결과가 일치하지 않습니다.")
        if not 0 <= float(properties["vdi_norm"]) <= 100:
            raise ValueError(f"{name}의 정규화 VDI가 0~100 범위를 벗어났습니다.")

        district = districts_by_name.get(name)
        if district is None:
            raise ValueError(f"{name}이 도로 행렬에 없습니다.")
        if (
            senior_population != int(district["senior_population"])
            or pediatric_population != int(district["pediatric_population"])
        ):
            raise ValueError(f"{name}의 GeoJSON·도로 행렬 인구가 일치하지 않습니다.")
        if not (
            math.isclose(
                float(properties["center_lat"]),
                float(district["lat"]),
                abs_tol=1e-9,
            )
            and math.isclose(
                float(properties["center_lng"]),
                float(district["lng"]),
                abs_tol=1e-9,
            )
        ):
            raise ValueError(f"{name}의 GeoJSON·도로 행렬 중심점이 일치하지 않습니다.")
        _assert_coordinate(
            float(properties["center_lat"]),
            float(properties["center_lng"]),
            f"취약도 GeoJSON {name} 중심점",
        )

        nearest = district["nearest_emergency_resource"]
        if (
            _require_string(properties, "nearest_hospital_name", f"취약도 GeoJSON {name}")
            != nearest["resource_name"]
            or int(properties["nearest_hospital_tier"]) != int(nearest["tier"])
        ):
            raise ValueError(f"{name}의 최근접 기관 표시가 도로 행렬과 일치하지 않습니다.")

        geometry = feature.get("geometry")
        if not isinstance(geometry, dict) or "coordinates" not in geometry:
            raise ValueError(f"{name}의 GeoJSON 지오메트리가 없습니다.")
        for lng, lat in _iter_positions(geometry["coordinates"]):
            vertex_count += 1
            _assert_coordinate(lat, lng, f"취약도 GeoJSON {name} 경계")

    _assert_exact_keys(feature_names, set(districts_by_name), "행정동")
    snap_summary = _validate_coordinate_snap_audit(
        metadata,
        matrix_metadata,
        set(districts_by_name),
        hospital_ids | candidate_ids,
    )

    return {
        "district_count": len(districts),
        "hospital_count": len(hospitals),
        "candidate_count": len(candidates),
        "route_count": EXPECTED_ROUTE_COUNT,
        "vdi_formula_match_count": len(features),
        "geojson_vertex_count": vertex_count,
        "nearest_eta_tie_district_count": nearest_tie_count,
        **snap_summary,
    }
