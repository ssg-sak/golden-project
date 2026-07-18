from __future__ import annotations

import argparse
import asyncio
import hashlib
import itertools
import json
import math
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"
GEOJSON_PATH = PROJECT_ROOT / "data" / "processed" / "daegu_vulnerability.geojson"
HOSPITALS_PATH = PROJECT_ROOT / "data" / "processed" / "final_hospitals.json"
CANDIDATES_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "stable_policy_candidates.json"
CACHE_PATH = PROJECT_ROOT / "data" / "cache" / "kakao_road_eta_cache.json"
MATRIX_PATH = PROJECT_ROOT / "data" / "processed" / "actual_road_accessibility_matrix.json"
PUBLIC_MATRIX_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "actual_road_accessibility_matrix.json"
OPTIMIZATION_PATH = PROJECT_ROOT / "data" / "processed" / "policy_location_optimization.json"
PUBLIC_OPTIMIZATION_PATH = PROJECT_ROOT / "frontend" / "public" / "data" / "policy_location_optimization.json"
PROCESSED_GEOJSON_PATH = PROJECT_ROOT / "data" / "processed" / "daegu_vulnerability.geojson"
FRONTEND_GEOJSON_PATH = PROJECT_ROOT / "frontend" / "src" / "data" / "daegu_vulnerability.geojson"
ANALYSIS_GEOJSON_PATH = PROJECT_ROOT / "data" / "analysis" / "daegu_vulnerability.geojson"
FRONTEND_ASSET_GEOJSON_PATH = PROJECT_ROOT / "frontend" / "src" / "assets" / "daegu_vulnerability.geojson"

KAKAO_DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions"
CACHE_VERSION = 1
ANALYSIS_VERSION = "2026-07-18-r2"
EXPECTED_DISTRICT_COUNT = 150
EXPECTED_HOSPITAL_COUNT = 25
EXPECTED_CANDIDATE_COUNT = 9
REQUIRED_HOSPITAL_NAMES = {"계명대학교대구동산병원"}
MODE_HOSPITAL_TIERS = {
    "pediatric": {3},
    "senior": {1, 2},
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    serialized = (
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        if compact
        else json.dumps(payload, ensure_ascii=False, indent=2)
    )
    temporary_path.write_text(serialized, encoding="utf-8")
    json.loads(temporary_path.read_text(encoding="utf-8"))
    try:
        temporary_path.replace(path)
    except PermissionError:
        shutil.copyfile(temporary_path, path)
        temporary_path.unlink()


def read_api_key() -> str:
    value = os.getenv("KAKAO_REST_API_KEY", "").strip()
    if value:
        return value
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if stripped.startswith("KAKAO_REST_API_KEY="):
                return stripped.split("=", 1)[1].strip().strip('"').strip("'")
    raise RuntimeError("KAKAO_REST_API_KEY가 설정되지 않았습니다.")


def property_number(properties: dict[str, Any], keys: tuple[str, ...], fallback_index: int) -> int:
    for key in keys:
        if key in properties:
            return int(float(properties.get(key) or 0))
    values = list(properties.values())
    return int(float(values[fallback_index] or 0)) if fallback_index < len(values) else 0


def load_inputs() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    geojson = read_json(GEOJSON_PATH)
    districts = []
    for index, feature in enumerate(geojson["features"]):
        properties = feature["properties"]
        districts.append(
            {
                "id": str(properties.get("adm_cd") or properties.get("adm_nm") or index),
                "name": str(properties.get("adm_nm") or index),
                "lat": float(properties.get("center_lat") or 0),
                "lng": float(properties.get("center_lng") or 0),
                "vulnerable_population": property_number(
                    properties,
                    ("취약인구", "vulnerable_population"),
                    4,
                ),
                "senior_population": property_number(
                    properties,
                    ("65세이상_인구", "senior_population"),
                    2,
                ),
                "pediatric_population": property_number(
                    properties,
                    ("0~9세_인구", "pediatric_population"),
                    3,
                ),
            }
        )

    hospitals = [
        {
            "id": f"hospital:{row.get('id') or row.get('name')}",
            "name": str(row.get("name") or row.get("id")),
            "lat": float(row["lat"]),
            "lng": float(row["lng"]),
            "tier": int(row.get("tier") or 0),
        }
        for row in read_json(HOSPITALS_PATH)
        if int(row.get("tier") or 0) in {1, 2, 3}
    ]
    candidates = [
        {
            "id": f"candidate:{row.get('mode')}:{row.get('id')}",
            "candidate_id": row.get("id"),
            "mode": row.get("mode"),
            "name": f"{row.get('mode')} candidate {row.get('id')}",
            "lat": float(row["lat"]),
            "lng": float(row["lng"]),
        }
        for row in read_json(CANDIDATES_PATH)
    ]
    return districts, hospitals, candidates


def normalize_resource_name(value: str) -> str:
    return "".join(value.split())


def validate_release_inputs(
    districts: list[dict[str, Any]],
    hospitals: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> None:
    errors = []
    if len(districts) != EXPECTED_DISTRICT_COUNT:
        errors.append(f"행정동 {len(districts)}개 (예상 {EXPECTED_DISTRICT_COUNT}개)")
    if len(hospitals) != EXPECTED_HOSPITAL_COUNT:
        errors.append(f"응급 관련 기관 {len(hospitals)}개 (예상 {EXPECTED_HOSPITAL_COUNT}개)")
    if len(candidates) != EXPECTED_CANDIDATE_COUNT:
        errors.append(f"정책 후보 {len(candidates)}개 (예상 {EXPECTED_CANDIDATE_COUNT}개)")

    normalized_names = {normalize_resource_name(str(row["name"])) for row in hospitals}
    missing_required = REQUIRED_HOSPITAL_NAMES - normalized_names
    if missing_required:
        errors.append(f"필수 기관 누락: {', '.join(sorted(missing_required))}")

    if len({row["id"] for row in hospitals}) != len(hospitals):
        errors.append("응급 관련 기관 ID 중복")
    if len({row["id"] for row in candidates}) != len(candidates):
        errors.append("정책 후보 ID 중복")

    if errors:
        raise RuntimeError("정책 분석 입력 검증 실패: " + "; ".join(errors))


def coordinate_key(origin: dict[str, Any], destination: dict[str, Any]) -> str:
    raw = (
        f"v{CACHE_VERSION}|{origin['lat']:.7f},{origin['lng']:.7f}|"
        f"{destination['lat']:.7f},{destination['lng']:.7f}|RECOMMEND"
    )
    return hashlib.sha256(raw.encode("ascii")).hexdigest()


def coordinate_retry_pairs(
    snap_origin: bool,
    snap_destination: bool,
) -> list[tuple[tuple[float, float], tuple[float, float]]]:
    offsets = []
    for delta in (0.0005, 0.001, 0.002, 0.004, 0.008, 0.015):
        offsets.extend(
            [
                (delta, 0.0),
                (-delta, 0.0),
                (0.0, delta),
                (0.0, -delta),
                (delta, delta),
                (delta, -delta),
                (-delta, delta),
                (-delta, -delta),
            ]
        )

    exact = [((0.0, 0.0), (0.0, 0.0))]
    origin_pairs = [(offset, (0.0, 0.0)) for offset in offsets]
    destination_pairs = [((0.0, 0.0), offset) for offset in offsets]
    if snap_destination and not snap_origin:
        return exact + destination_pairs + origin_pairs
    return exact + origin_pairs + destination_pairs


def load_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {"version": CACHE_VERSION, "routes": {}}
    cache = read_json(CACHE_PATH)
    if cache.get("version") != CACHE_VERSION or not isinstance(cache.get("routes"), dict):
        raise RuntimeError("지원하지 않는 도로 ETA 캐시 형식입니다.")
    return cache


def input_source_hash(
    districts: list[dict[str, Any]],
    hospitals: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> str:
    return hashlib.sha256(
        json.dumps(
            {"districts": districts, "hospitals": hospitals, "candidates": candidates},
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()


def payload_sha256(payload: Any) -> str:
    return hashlib.sha256(
        json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode(
            "utf-8"
        )
    ).hexdigest()


def validate_matrix_route_coverage(matrix: dict[str, Any]) -> None:
    missing_route_count = int(matrix.get("metadata", {}).get("missing_route_count", 0))
    if missing_route_count:
        raise RuntimeError(
            f"현재 입력에 대한 도로 경로 {missing_route_count}개가 캐시에 없습니다. "
            "온라인 수집을 먼저 실행하세요."
        )


def validate_matrix_source(
    matrix: dict[str, Any],
    districts: list[dict[str, Any]],
    hospitals: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> None:
    expected_hash = input_source_hash(districts, hospitals, candidates)
    actual_hash = str(matrix.get("metadata", {}).get("source_sha256") or "")
    if actual_hash != expected_hash:
        raise RuntimeError("도로 경로 행렬의 입력 해시가 현재 병원·행정동·후보 명단과 다릅니다.")
    validate_matrix_route_coverage(matrix)


async def fetch_route(
    client: httpx.AsyncClient,
    semaphore: asyncio.Semaphore,
    api_key: str,
    origin: dict[str, Any],
    destination: dict[str, Any],
    snap_origin: bool = False,
    snap_destination: bool = False,
) -> dict[str, Any]:
    headers = {"Authorization": f"KakaoAK {api_key}"}
    retryable_statuses = {429, 500, 502, 503, 504}
    last_error = "unknown"

    for origin_offset, destination_offset in coordinate_retry_pairs(
        snap_origin,
        snap_destination,
    ):
        params = {
            "origin": f"{origin['lng'] + origin_offset[1]},{origin['lat'] + origin_offset[0]}",
            "destination": (
                f"{destination['lng'] + destination_offset[1]},"
                f"{destination['lat'] + destination_offset[0]}"
            ),
            "priority": "RECOMMEND",
        }
        for attempt in range(5):
            try:
                async with semaphore:
                    response = await client.get(KAKAO_DIRECTIONS_URL, params=params, headers=headers)
                if response.status_code in retryable_statuses:
                    last_error = f"HTTP {response.status_code}"
                    await asyncio.sleep(min(2**attempt, 12))
                    continue
                response.raise_for_status()
                routes = response.json().get("routes") or []
                summary = routes[0].get("summary") if routes else None
                if not summary or summary.get("duration") is None or summary.get("distance") is None:
                    last_error = "No routable coordinate"
                    break
                return {
                    "status": "ok",
                    "eta_seconds": int(summary["duration"]),
                    "distance_meters": int(summary["distance"]),
                    "fetched_at_epoch": int(time.time()),
                    "provider": "kakao_mobility_directions",
                    "origin_snap_offset": list(origin_offset),
                    "destination_snap_offset": list(destination_offset),
                }
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                last_error = type(exc).__name__
                await asyncio.sleep(min(2**attempt, 12))
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code == 400:
                    last_error = "HTTP 400: unroutable coordinate"
                    break
                return {"status": "error", "error": f"HTTP {exc.response.status_code}"}
            except (KeyError, TypeError, ValueError) as exc:
                last_error = type(exc).__name__
                break
    return {"status": "error", "error": last_error}


async def collect_routes(concurrency: int, checkpoint_size: int) -> dict[str, Any]:
    api_key = read_api_key()
    districts, hospitals, candidates = load_inputs()
    validate_release_inputs(districts, hospitals, candidates)
    destinations = hospitals + candidates
    cache = load_cache()
    routes: dict[str, Any] = cache["routes"]
    failed_routes = [route for route in routes.values() if route.get("status") != "ok"]
    failed_origins: dict[str, int] = {}
    failed_destinations: dict[str, int] = {}
    for route in failed_routes:
        origin_id = str(route.get("origin_id"))
        destination_id = str(route.get("destination_id"))
        failed_origins[origin_id] = failed_origins.get(origin_id, 0) + 1
        failed_destinations[destination_id] = failed_destinations.get(destination_id, 0) + 1
    pending = [
        (origin, destination, coordinate_key(origin, destination))
        for origin in districts
        for destination in destinations
        if routes.get(coordinate_key(origin, destination), {}).get("status") != "ok"
    ]
    cached_success_count = len(districts) * len(destinations) - len(pending)
    print(f"전체 경로 {len(districts) * len(destinations):,}건, 캐시 {len(routes):,}건, 요청 {len(pending):,}건")

    semaphore = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_connections=concurrency, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0), limits=limits) as client:
        for start in range(0, len(pending), checkpoint_size):
            batch = pending[start : start + checkpoint_size]
            results = await asyncio.gather(
                *(
                    fetch_route(
                        client,
                        semaphore,
                        api_key,
                        origin,
                        destination,
                        snap_origin=failed_origins.get(str(origin["id"]), 0) >= 5,
                        snap_destination=failed_destinations.get(str(destination["id"]), 0) >= 5,
                    )
                    for origin, destination, _ in batch
                )
            )
            for (origin, destination, key), result in zip(batch, results):
                routes[key] = {
                    **result,
                    "origin_id": origin["id"],
                    "destination_id": destination["id"],
                }
            cache["updated_at_epoch"] = int(time.time())
            write_json(CACHE_PATH, cache)
            completed = min(start + len(batch), len(pending))
            failures = sum(1 for result in results if result.get("status") != "ok")
            print(f"요청 진행 {completed:,}/{len(pending):,}, 이번 구간 실패 {failures}건")
    matrix = build_matrix(
        districts,
        hospitals,
        candidates,
        cache,
        provenance={
            "execution_mode": "api_and_cache",
            "cached_route_count": cached_success_count,
            "fetched_route_count": len(pending),
        },
    )
    validate_matrix_route_coverage(matrix)
    return matrix


def build_matrix(
    districts: list[dict[str, Any]],
    hospitals: list[dict[str, Any]],
    candidates: list[dict[str, Any]],
    cache: dict[str, Any],
    provenance: dict[str, Any] | None = None,
) -> dict[str, Any]:
    routes = cache["routes"]
    destinations = hospitals + candidates
    requested_routes = [
        routes.get(coordinate_key(origin, destination))
        for origin in districts
        for destination in destinations
    ]
    snap_route_count = sum(
        bool(route)
        and (
            any(float(value) != 0 for value in route.get("origin_snap_offset", []))
            or any(float(value) != 0 for value in route.get("destination_snap_offset", []))
        )
        for route in requested_routes
    )

    def route_for(origin: dict[str, Any], destination: dict[str, Any]) -> dict[str, Any] | None:
        route = routes.get(coordinate_key(origin, destination)) or {}
        if route.get("status") != "ok":
            return None
        return {
            "eta_minutes": round(float(route["eta_seconds"]) / 60, 2),
            "distance_km": round(float(route["distance_meters"]) / 1000, 3),
        }

    district_rows = []
    for district in districts:
        hospital_routes = []
        for hospital in hospitals:
            route = route_for(district, hospital)
            if route is not None:
                hospital_routes.append({**hospital, **route})
        nearest = min(hospital_routes, key=lambda row: row["eta_minutes"]) if hospital_routes else None
        nearest_by_mode = {}
        for mode, tiers in MODE_HOSPITAL_TIERS.items():
            relevant_routes = [route for route in hospital_routes if route["tier"] in tiers]
            mode_nearest = (
                min(relevant_routes, key=lambda row: row["eta_minutes"])
                if relevant_routes
                else None
            )
            nearest_by_mode[mode] = (
                {
                    "resource_id": mode_nearest["id"],
                    "resource_name": mode_nearest["name"],
                    "tier": mode_nearest["tier"],
                    "eta_minutes": mode_nearest["eta_minutes"],
                    "road_distance_km": mode_nearest["distance_km"],
                }
                if mode_nearest is not None
                else None
            )
        candidate_routes = {
            candidate["id"]: route_for(district, candidate) for candidate in candidates
        }
        district_rows.append(
            {
                **district,
                "nearest_emergency_resource": (
                    {
                        "resource_id": nearest["id"],
                        "resource_name": nearest["name"],
                        "tier": nearest["tier"],
                        "eta_minutes": nearest["eta_minutes"],
                        "road_distance_km": nearest["distance_km"],
                    }
                    if nearest is not None
                    else None
                ),
                "nearest_emergency_resource_by_mode": nearest_by_mode,
                "emergency_resource_routes": [
                    {
                        "resource_id": route["id"],
                        "resource_name": route["name"],
                        "tier": route["tier"],
                        "eta_minutes": route["eta_minutes"],
                        "road_distance_km": route["distance_km"],
                    }
                    for route in hospital_routes
                ],
                "candidate_routes": candidate_routes,
            }
        )

    source_hash = input_source_hash(districts, hospitals, candidates)
    return {
        "metadata": {
            "version": ANALYSIS_VERSION,
            "method": "actual_road_route_api",
            "provider": "Kakao Mobility Directions API",
            "priority": "RECOMMEND",
            "district_count": len(districts),
            "resource_count": len(hospitals),
            "resource_count_by_mode": {
                mode: sum(row["tier"] in tiers for row in hospitals)
                for mode, tiers in MODE_HOSPITAL_TIERS.items()
            },
            "candidate_count": len(candidates),
            "requested_route_count": len(requested_routes),
            "successful_route_count": sum(
                bool(route) and route.get("status") == "ok" for route in requested_routes
            ),
            "unavailable_route_count": sum(
                bool(route) and route.get("status") != "ok" for route in requested_routes
            ),
            "missing_route_count": sum(not route for route in requested_routes),
            "source_sha256": source_hash,
            "route_result_sha256": payload_sha256(district_rows),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "route_provenance": {
                "execution_mode": "cache_only",
                "cached_route_count": len(requested_routes),
                "fetched_route_count": 0,
                "coordinate_snap_route_count": snap_route_count,
                "cache_updated_at_epoch": cache.get("updated_at_epoch"),
                **(provenance or {}),
            },
        },
        "districts": district_rows,
        "candidates": candidates,
    }


def evaluate_combinations(matrix: dict[str, Any]) -> dict[str, Any]:
    districts = matrix["districts"]
    candidates = matrix["candidates"]
    excluded_districts = [row for row in districts if row["nearest_emergency_resource"] is None]
    results: dict[str, Any] = {}
    objective_populations: dict[str, int] = {}
    excluded_by_mode: dict[str, dict[str, int]] = {}

    for mode in sorted({str(candidate["mode"]) for candidate in candidates}):
        mode_candidates = [candidate for candidate in candidates if candidate["mode"] == mode]
        population_key = "pediatric_population" if mode == "pediatric" else "senior_population"
        eligible_districts = [
            row
            for row in districts
            if row.get("nearest_emergency_resource_by_mode", {}).get(mode) is not None
        ]
        mode_excluded = [row for row in districts if row not in eligible_districts]
        excluded_by_mode[mode] = {
            "district_count": len(mode_excluded),
            "population": sum(max(0, int(row[population_key])) for row in mode_excluded),
        }
        total_population = sum(max(0, int(row[population_key])) for row in eligible_districts)
        if total_population <= 0:
            raise RuntimeError(f"{mode} 모드의 분석 가능 인구가 없습니다.")
        objective_populations[mode] = total_population
        mode_results = []
        for facility_count in range(1, min(3, len(mode_candidates)) + 1):
            evaluations = []
            for combination in itertools.combinations(mode_candidates, facility_count):
                ids = [candidate["id"] for candidate in combination]
                weighted_eta = 0.0
                covered_15 = 0
                covered_30 = 0
                improved_population = 0
                for district in eligible_districts:
                    baseline = float(
                        district["nearest_emergency_resource_by_mode"][mode]["eta_minutes"]
                    )
                    available_candidate_etas = [
                        float(district["candidate_routes"][candidate_id]["eta_minutes"])
                        for candidate_id in ids
                        if district["candidate_routes"][candidate_id] is not None
                    ]
                    candidate_eta = min(available_candidate_etas) if available_candidate_etas else None
                    resulting_eta = min(baseline, candidate_eta) if candidate_eta is not None else baseline
                    population = max(0, int(district[population_key]))
                    weighted_eta += resulting_eta * population
                    if candidate_eta is not None and candidate_eta < baseline:
                        improved_population += population
                    if candidate_eta is not None and candidate_eta <= 15:
                        covered_15 += population
                    if candidate_eta is not None and candidate_eta <= 30:
                        covered_30 += population
                evaluations.append(
                    {
                        "candidate_ids": [candidate["candidate_id"] for candidate in combination],
                        "candidate_resource_ids": ids,
                        "weighted_average_eta_minutes": round(weighted_eta / total_population, 3),
                        "covered_15min_population": covered_15,
                        "covered_15min_ratio": round(covered_15 / total_population, 5),
                        "covered_30min_population": covered_30,
                        "covered_30min_ratio": round(covered_30 / total_population, 5),
                        "improved_population": improved_population,
                    }
                )
            p_median = min(evaluations, key=lambda row: row["weighted_average_eta_minutes"])
            mclp_15 = max(
                evaluations,
                key=lambda row: (row["covered_15min_population"], -row["weighted_average_eta_minutes"]),
            )
            mclp_30 = max(
                evaluations,
                key=lambda row: (row["covered_30min_population"], -row["weighted_average_eta_minutes"]),
            )
            mode_results.append(
                {
                    "facility_count": facility_count,
                    "combination_count": math.comb(len(mode_candidates), facility_count),
                    "p_median_optimum": p_median,
                    "mclp_15min_optimum": mclp_15,
                    "mclp_30min_optimum": mclp_30,
                }
            )
        results[mode] = mode_results
    return {
        "metadata": {
            "version": ANALYSIS_VERSION,
            "matrix_method": matrix["metadata"]["method"],
            "matrix_source_sha256": matrix["metadata"]["source_sha256"],
            "matrix_route_result_sha256": matrix["metadata"]["route_result_sha256"],
            "resource_count": matrix["metadata"]["resource_count"],
            "resource_count_by_mode": matrix["metadata"]["resource_count_by_mode"],
            "optimization": "exact_enumeration",
            "max_facilities": 3,
            "objective_populations": objective_populations,
            "excluded_district_count": len(excluded_districts),
            "excluded_population": sum(max(0, row["vulnerable_population"]) for row in excluded_districts),
            "excluded_by_mode": excluded_by_mode,
        },
        "results": results,
    }


def normalize(values: list[float], value: float) -> float:
    minimum = min(values)
    maximum = max(values)
    if math.isclose(minimum, maximum):
        return 0.0
    return (value - minimum) / (maximum - minimum) * 100


def apply_actual_road_results(matrix: dict[str, Any], optimization: dict[str, Any]) -> None:
    districts_by_name = {row["name"]: row for row in matrix["districts"]}
    geojson = read_json(FRONTEND_GEOJSON_PATH)
    raw_scores = []
    for feature in geojson["features"]:
        properties = feature["properties"]
        district = districts_by_name.get(str(properties.get("adm_nm") or ""))
        nearest = district.get("nearest_emergency_resource") if district else None
        population = district["vulnerable_population"] if district else 0
        eta = float(nearest["eta_minutes"]) if nearest else 0.0
        raw_scores.append(math.log1p(eta) * population)

    for feature, score in zip(geojson["features"], raw_scores):
        properties = feature["properties"]
        district = districts_by_name.get(str(properties.get("adm_nm") or ""))
        nearest = district.get("nearest_emergency_resource") if district else None
        properties.setdefault("estimated_travel_time_minutes", properties.get("travel_time_minutes"))
        properties.setdefault("estimated_travel_time_vdi_log", properties.get("travel_time_vdi_log"))
        properties["accessibility_metric"] = "actual_road_time"
        properties["actual_road_vdi_log"] = round(score, 2)
        properties["travel_time_vdi_log"] = round(score, 2)
        properties["travel_time_vulnerability_index"] = round(score, 2)
        properties["vulnerability_index"] = round(score, 2)
        properties["vdi_log"] = round(score, 2)
        properties["vdi_norm"] = round(normalize(raw_scores, score), 2)
        properties["travel_time_vdi_norm"] = properties["vdi_norm"]
        if nearest:
            properties["travel_time_minutes"] = nearest["eta_minutes"]
            properties["road_distance_km"] = nearest["road_distance_km"]
            properties["nearest_hospital_name"] = nearest["resource_name"]
            properties["nearest_hospital_tier"] = nearest["tier"]
    write_json(PROCESSED_GEOJSON_PATH, geojson)
    write_json(FRONTEND_GEOJSON_PATH, geojson)
    write_json(ANALYSIS_GEOJSON_PATH, geojson, compact=True)
    write_json(FRONTEND_ASSET_GEOJSON_PATH, geojson, compact=True)

    stable_candidates = read_json(CANDIDATES_PATH)
    memberships: dict[str, dict[str, list[str]]] = {}
    for mode, rows in optimization["results"].items():
        for row in rows:
            facility_count = row["facility_count"]
            for objective_key, label in (
                ("p_median_optimum", "p_median"),
                ("mclp_15min_optimum", "mclp_15min"),
                ("mclp_30min_optimum", "mclp_30min"),
            ):
                optimum = row[objective_key]
                combination_label = f"p={facility_count}: " + ", ".join(
                    str(candidate_id) for candidate_id in optimum["candidate_ids"]
                )
                for resource_id in optimum["candidate_resource_ids"]:
                    memberships.setdefault(resource_id, {}).setdefault(label, []).append(combination_label)

    for candidate in stable_candidates:
        resource_id = f"candidate:{candidate.get('mode')}:{candidate.get('id')}"
        mode = str(candidate.get("mode"))
        population_key = (
            "pediatric_population" if candidate.get("mode") == "pediatric" else "senior_population"
        )
        weighted_before = 0.0
        weighted_after = 0.0
        covered_15 = 0
        covered_30 = 0
        improved_population = 0
        eligible_population = 0
        for district in matrix["districts"]:
            nearest = district.get("nearest_emergency_resource_by_mode", {}).get(mode)
            if nearest is None:
                continue
            population = max(0, int(district[population_key]))
            baseline = float(nearest["eta_minutes"])
            route = district["candidate_routes"].get(resource_id)
            candidate_eta = float(route["eta_minutes"]) if route else None
            resulting_eta = min(baseline, candidate_eta) if candidate_eta is not None else baseline
            eligible_population += population
            weighted_before += baseline * population
            weighted_after += resulting_eta * population
            if candidate_eta is not None and candidate_eta < baseline:
                improved_population += population
            if candidate_eta is not None and candidate_eta <= 15:
                covered_15 += population
            if candidate_eta is not None and candidate_eta <= 30:
                covered_30 += population
        candidate["accessibility_metric"] = "actual_road_time"
        candidate["analysis_version"] = ANALYSIS_VERSION
        candidate["baseline_resource_count"] = matrix["metadata"]["resource_count_by_mode"].get(mode, 0)
        candidate["before_avg_eta_minutes"] = round(weighted_before / eligible_population, 2)
        candidate["after_avg_eta_minutes"] = round(weighted_after / eligible_population, 2)
        candidate["accessibility_gain_minutes"] = round(
            (weighted_before - weighted_after) / eligible_population,
            2,
        )
        candidate["p_median_weighted_eta_minutes"] = candidate["after_avg_eta_minutes"]
        candidate["mclp_15min_population"] = covered_15
        candidate["mclp_15min_coverage_ratio"] = round(covered_15 / eligible_population, 5)
        candidate["mclp_30min_population"] = covered_30
        candidate["mclp_30min_coverage_ratio"] = round(covered_30 / eligible_population, 5)
        candidate["time_improved_population"] = improved_population
        candidate["optimal_combinations"] = memberships.get(resource_id, {})
        if candidate.get("candidate_group") == "separate_region":
            candidate["interpretation"] = "도시권 후보와 분리해 검토해야 하는 원거리 권역 후보입니다."
        elif candidate.get("candidate_group") == "hold":
            candidate["interpretation"] = "민감도 분석에서는 반복됐지만 수요 규모를 추가 확인해야 하는 보류 후보입니다."
        elif candidate.get("mode") == "pediatric":
            candidate["interpretation"] = "야간·휴일 소아 응급 접근성 개선을 검토하는 안정 후보입니다."
        else:
            candidate["interpretation"] = "고령층 중증 응급 접근성 개선을 검토하는 안정 후보입니다."
    write_json(CANDIDATES_PATH, stable_candidates)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--checkpoint-size", type=int, default=50)
    parser.add_argument("--optimize-only", action="store_true")
    parser.add_argument("--cache-only", action="store_true")
    return parser.parse_args()


async def async_main() -> None:
    args = parse_args()
    if args.optimize_only:
        districts, hospitals, candidates = load_inputs()
        validate_release_inputs(districts, hospitals, candidates)
        matrix = read_json(MATRIX_PATH)
        validate_matrix_source(matrix, districts, hospitals, candidates)
    elif args.cache_only:
        districts, hospitals, candidates = load_inputs()
        validate_release_inputs(districts, hospitals, candidates)
        matrix = build_matrix(districts, hospitals, candidates, load_cache())
        validate_matrix_source(matrix, districts, hospitals, candidates)
        write_json(MATRIX_PATH, matrix)
        write_json(PUBLIC_MATRIX_PATH, matrix)
    else:
        matrix = await collect_routes(max(1, args.concurrency), max(1, args.checkpoint_size))
        write_json(MATRIX_PATH, matrix)
        write_json(PUBLIC_MATRIX_PATH, matrix)
    optimization = evaluate_combinations(matrix)
    write_json(OPTIMIZATION_PATH, optimization)
    write_json(PUBLIC_OPTIMIZATION_PATH, optimization)
    apply_actual_road_results(matrix, optimization)
    print(f"도로망 행렬 저장: {MATRIX_PATH}")
    print(f"최적조합 저장: {OPTIMIZATION_PATH}")


if __name__ == "__main__":
    asyncio.run(async_main())
