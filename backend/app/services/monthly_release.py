# -*- coding: utf-8 -*-
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

import httpx
from dateutil.relativedelta import relativedelta

from app.core.env import get_kakao_rest_api_key
from app.services.fetchers.age_population import (
    AgePopulationClient,
    AgePopulationDataset,
    AgePopulationNotPublished,
    AgePopulationValidationError,
    canonical_age_population_sha256,
    write_age_population_dataset,
)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
CURRENT_RELEASE_PATH = PROJECT_ROOT / "data" / "processed" / "policy_release.json"
RUNS_ROOT = PROJECT_ROOT / "tmp" / "policy-release"
ReleaseMode = Literal["check", "test", "publish"]
ReleaseState = Literal[
    "waiting_source",
    "no_change",
    "ready_to_publish",
    "published",
    "blocked",
]

BASE_PROMOTION_PATHS = (
    "data/raw/population/daegu_population_real.csv",
    "data/raw/population/daegu_population_real.manifest.json",
    "data/cache/kakao_road_eta_cache.json",
    "data/processed/final_hospitals.json",
    "data/analysis/final_hospitals.json",
    "frontend/src/data/final_hospitals.json",
    "frontend/src/assets/final_hospitals.json",
    "data/processed/candidate_sensitivity_analysis.json",
    "docs/reports/candidate_sensitivity_analysis_report_20260715.md",
    "data/processed/accessibility_candidate_trace.json",
    "frontend/public/data/accessibility_candidate_trace.json",
    "docs/reports/accessibility_candidate_trace_report_20260715.md",
    "frontend/public/data/stable_policy_candidates.json",
    "data/processed/actual_road_accessibility_matrix.json",
    "frontend/public/data/actual_road_accessibility_matrix.json",
    "data/processed/policy_location_optimization.json",
    "frontend/public/data/policy_location_optimization.json",
    "data/processed/daegu_vulnerability.geojson",
    "data/analysis/daegu_vulnerability.geojson",
    "frontend/src/data/daegu_vulnerability.geojson",
    "frontend/src/assets/daegu_vulnerability.geojson",
    "data/processed/stable_policy_candidates_overview_20260715.png",
    "data/processed/policy_release.json",
    "data/processed/policy_release_manifest.json",
    "frontend/public/data/policy_release.json",
    "frontend/public/data/policy_release.latest.json",
)


@dataclass(frozen=True)
class MonthlyReleaseResult:
    state: ReleaseState
    status_label: str
    run_id: str
    source_month: str | None
    previous_source_month: str | None
    version: str | None
    changed_file_count: int = 0
    run_directory: str | None = None
    message: str | None = None
    change_summary_path: str | None = None
    review_required: bool = False
    review_reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class MonthlyChangeSummary:
    previous_version: str | None
    candidate_version: str | None
    previous_source_month: str | None
    candidate_source_month: str | None
    population_totals_before: dict[str, int]
    population_totals_after: dict[str, int]
    population_change_percent: dict[str, float | None]
    changed_district_count: int
    maximum_vdi_change_district: str | None
    maximum_vdi_change: float
    risk_threshold_before: float | None
    risk_threshold_after: float | None
    high_risk_district_count_before: int | None
    high_risk_district_count_after: int | None
    changed_candidate_coordinate_count: int
    changed_optimal_combination_count: int
    review_required: bool
    review_reasons: tuple[str, ...]


def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _current_release_metadata(project_root: Path = PROJECT_ROOT) -> dict:
    release_path = project_root / "data" / "processed" / "policy_release.json"
    return _read_json(release_path).get("metadata", {})


def _month_to_yyyymm(value: str | None) -> str | None:
    if not value:
        return None
    normalized = re.sub(r"\D", "", value)
    return normalized if re.fullmatch(r"\d{6}", normalized) else None


def _latest_completed_month(now: datetime) -> str:
    return (now - relativedelta(months=1)).strftime("%Y%m")


def _months_after(current_month: str | None, latest_month: str) -> list[str]:
    if current_month is None:
        return [latest_month]
    current_date = datetime.strptime(current_month, "%Y%m")
    latest_date = datetime.strptime(latest_month, "%Y%m")
    months: list[str] = []
    cursor = current_date + relativedelta(months=1)
    while cursor <= latest_date:
        months.append(cursor.strftime("%Y%m"))
        cursor += relativedelta(months=1)
    return list(reversed(months))


def _next_version(source_month: str, current_metadata: dict) -> str:
    version_prefix = f"{source_month[:4]}-{source_month[4:]}"
    current_version = str(current_metadata.get("version") or "")
    match = re.fullmatch(rf"{re.escape(version_prefix)}-r(\d+)", current_version)
    revision = int(match.group(1)) + 1 if match else 1
    return f"{version_prefix}-r{revision}"


def _copy_ignore(_directory: str, names: list[str]) -> set[str]:
    ignored = {".git", ".venv", "venv", "node_modules", "dist", "tmp", "__pycache__"}
    return {name for name in names if name in ignored or name == ".env"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_result(run_directory: Path, result: MonthlyReleaseResult) -> None:
    run_directory.mkdir(parents=True, exist_ok=True)
    (run_directory / "run_result.json").write_text(
        json.dumps(asdict(result), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _percent_change(before: float | int | None, after: float | int | None) -> float | None:
    if before is None or after is None or float(before) == 0:
        return None
    return round((float(after) - float(before)) / float(before) * 100, 3)


def _population_totals(release: dict) -> dict[str, int]:
    values = release.get("optimization", {}).get("metadata", {}).get("objective_populations", {})
    return {
        str(mode): int(population)
        for mode, population in values.items()
        if isinstance(population, (int, float))
    }


def _vdi_by_district(release: dict) -> dict[str, float]:
    values: dict[str, float] = {}
    features = release.get("vulnerability", {}).get("features", [])
    for feature in features:
        properties = feature.get("properties", {})
        name = str(properties.get("동이름") or properties.get("adm_nm") or "").strip()
        score = properties.get("vulnerability_index")
        if name and isinstance(score, (int, float)):
            values[name] = float(score)
    return values


def _candidate_coordinates(release: dict) -> dict[tuple[str, int], tuple[float, float]]:
    values: dict[tuple[str, int], tuple[float, float]] = {}
    for candidate in release.get("candidates", []):
        mode = str(candidate.get("mode") or "")
        candidate_id = candidate.get("id")
        latitude = candidate.get("lat")
        longitude = candidate.get("lng")
        if (
            mode
            and isinstance(candidate_id, int)
            and isinstance(latitude, (int, float))
            and isinstance(longitude, (int, float))
        ):
            values[(mode, candidate_id)] = (round(float(latitude), 7), round(float(longitude), 7))
    return values


def _optimal_combinations(release: dict) -> dict[str, tuple[int, ...]]:
    values: dict[str, tuple[int, ...]] = {}
    results = release.get("optimization", {}).get("results", {})
    if not isinstance(results, dict):
        return values
    for mode, rows in results.items():
        if not isinstance(rows, list):
            continue
        for row in rows:
            facility_count = row.get("facility_count")
            for objective in ("p_median_optimum", "mclp_15min_optimum", "mclp_30min_optimum"):
                optimum = row.get(objective, {})
                candidate_ids = optimum.get("candidate_ids", [])
                if isinstance(candidate_ids, list):
                    values[f"{mode}:{facility_count}:{objective}"] = tuple(
                        int(candidate_id) for candidate_id in candidate_ids
                    )
    return values


def _changed_value_count(before: dict, after: dict) -> int:
    keys = set(before) | set(after)
    return sum(before.get(key) != after.get(key) for key in keys)


def _build_change_summary(
    current_release: dict,
    candidate_release: dict,
) -> MonthlyChangeSummary:
    current_metadata = current_release.get("metadata", {})
    candidate_metadata = candidate_release.get("metadata", {})
    previous_month = _month_to_yyyymm(current_metadata.get("population_base_month"))
    candidate_month = _month_to_yyyymm(candidate_metadata.get("population_base_month"))
    before_population = _population_totals(current_release)
    after_population = _population_totals(candidate_release)
    population_change_percent = {
        mode: _percent_change(before_population.get(mode), after_population.get(mode))
        for mode in sorted(set(before_population) | set(after_population))
    }

    before_vdi = _vdi_by_district(current_release)
    after_vdi = _vdi_by_district(candidate_release)
    common_districts = set(before_vdi) & set(after_vdi)
    vdi_changes = {
        district: round(after_vdi[district] - before_vdi[district], 3)
        for district in common_districts
    }
    changed_district_count = sum(change != 0 for change in vdi_changes.values())
    maximum_vdi_change_district = (
        max(vdi_changes, key=lambda district: abs(vdi_changes[district]))
        if vdi_changes
        else None
    )
    maximum_vdi_change = (
        vdi_changes[maximum_vdi_change_district]
        if maximum_vdi_change_district is not None
        else 0.0
    )

    risk_before = current_metadata.get("risk_threshold")
    risk_after = candidate_metadata.get("risk_threshold")
    review_reasons: list[str] = []
    if previous_month is not None and previous_month == candidate_month:
        review_reasons.append("같은 기준월의 공식 값이 보정되었습니다.")
    for mode, change_percent in population_change_percent.items():
        if change_percent is not None and abs(change_percent) > 10:
            review_reasons.append(
                f"{mode} 대상 인구 합계가 이전 공개본보다 {abs(change_percent):.1f}% 변했습니다."
            )
    risk_change_percent = _percent_change(
        risk_before if isinstance(risk_before, (int, float)) else None,
        risk_after if isinstance(risk_after, (int, float)) else None,
    )
    if risk_change_percent is not None and abs(risk_change_percent) > 20:
        review_reasons.append(
            f"고위험 판단 경계가 이전 공개본보다 {abs(risk_change_percent):.1f}% 변했습니다."
        )
    if maximum_vdi_change_district is not None:
        previous_score = before_vdi[maximum_vdi_change_district]
        score_change_percent = _percent_change(
            previous_score,
            after_vdi[maximum_vdi_change_district],
        )
        if (
            score_change_percent is not None
            and abs(score_change_percent) > 30
            and abs(maximum_vdi_change) > 5_000
        ):
            review_reasons.append(
                f"{maximum_vdi_change_district}의 VDI가 크게 변했습니다."
            )

    return MonthlyChangeSummary(
        previous_version=str(current_metadata.get("version") or "") or None,
        candidate_version=str(candidate_metadata.get("version") or "") or None,
        previous_source_month=previous_month,
        candidate_source_month=candidate_month,
        population_totals_before=before_population,
        population_totals_after=after_population,
        population_change_percent=population_change_percent,
        changed_district_count=changed_district_count,
        maximum_vdi_change_district=maximum_vdi_change_district,
        maximum_vdi_change=maximum_vdi_change,
        risk_threshold_before=(
            float(risk_before) if isinstance(risk_before, (int, float)) else None
        ),
        risk_threshold_after=(
            float(risk_after) if isinstance(risk_after, (int, float)) else None
        ),
        high_risk_district_count_before=(
            int(current_metadata["high_risk_district_count"])
            if isinstance(current_metadata.get("high_risk_district_count"), (int, float))
            else None
        ),
        high_risk_district_count_after=(
            int(candidate_metadata["high_risk_district_count"])
            if isinstance(candidate_metadata.get("high_risk_district_count"), (int, float))
            else None
        ),
        changed_candidate_coordinate_count=_changed_value_count(
            _candidate_coordinates(current_release),
            _candidate_coordinates(candidate_release),
        ),
        changed_optimal_combination_count=_changed_value_count(
            _optimal_combinations(current_release),
            _optimal_combinations(candidate_release),
        ),
        review_required=bool(review_reasons),
        review_reasons=tuple(review_reasons),
    )


def _write_change_summary(
    run_directory: Path,
    current_release: dict,
    candidate_release: dict,
) -> tuple[MonthlyChangeSummary, Path]:
    summary = _build_change_summary(current_release, candidate_release)
    summary_path = run_directory / "change_summary.json"
    summary_path.write_text(
        json.dumps(asdict(summary), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return summary, summary_path


def _create_staging_workspace(run_directory: Path) -> Path:
    workspace = run_directory / "workspace"
    if workspace.exists():
        raise FileExistsError(f"이미 존재하는 실행 작업공간입니다: {workspace}")
    shutil.copytree(PROJECT_ROOT, workspace, ignore=_copy_ignore)
    return workspace


def _analysis_environment(version: str, released_at: str) -> dict[str, str]:
    environment = {
        **os.environ,
        "PYTHONUTF8": "1",
        "PYTHONIOENCODING": "utf-8",
        "POLICY_ANALYSIS_VERSION": version,
        "POLICY_RELEASED_AT": released_at,
    }
    kakao_key = get_kakao_rest_api_key()
    if kakao_key:
        environment["KAKAO_REST_API_KEY"] = kakao_key
    return environment


def _run_staged_analysis(
    workspace: Path,
    *,
    version: str,
    released_at: str,
    offline: bool,
) -> None:
    command = [sys.executable, str(workspace / "ai-model" / "run_integrated_policy_pipeline.py")]
    if offline:
        command.append("--offline")
    subprocess.run(
        command,
        cwd=workspace,
        check=True,
        env=_analysis_environment(version, released_at),
    )


def _write_release_manifest(
    workspace: Path,
    *,
    version: str,
    released_at: str,
    source_month: str,
) -> None:
    manifest_path = workspace / "data" / "processed" / "policy_release_manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(
            {
                "version": version,
                "released_at": released_at,
                "population_base_month": f"{source_month[:4]}.{source_month[4:]}",
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


def _promotion_paths(version: str, official_source_name: str) -> tuple[str, ...]:
    return (
        *BASE_PROMOTION_PATHS,
        f"data/raw/population/{official_source_name}",
        f"frontend/public/data/releases/{version}/policy_release.json",
    )


def _publish_workspace(
    workspace: Path,
    *,
    version: str,
    official_source_name: str,
) -> int:
    changed_count = 0
    for relative_path in _promotion_paths(version, official_source_name):
        source = workspace / relative_path
        if not source.exists():
            if relative_path == "data/cache/kakao_road_eta_cache.json":
                continue
            raise FileNotFoundError(f"정식 반영 대상 파일이 없습니다: {relative_path}")
        target = PROJECT_ROOT / relative_path
        if target.exists() and _sha256(source) == _sha256(target):
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary_target = target.with_suffix(target.suffix + ".monthly.tmp")
        shutil.copy2(source, temporary_target)
        temporary_target.replace(target)
        if _sha256(source) != _sha256(target):
            raise RuntimeError(f"정식 반영 후 파일 해시가 다릅니다: {relative_path}")
        changed_count += 1
    return changed_count


async def _fetch_newest_dataset(
    client: AgePopulationClient,
    months: list[str],
) -> AgePopulationDataset | None:
    for month in months:
        try:
            return await client.fetch_month(month)
        except AgePopulationNotPublished:
            continue
    return None


async def run_monthly_release(
    *,
    mode: ReleaseMode,
    run_id: str,
    source_month: str | None = None,
    offline: bool = False,
    now: datetime | None = None,
    client: AgePopulationClient | None = None,
    confirm_reviewed_change: bool = False,
) -> MonthlyReleaseResult:
    execution_time = now or datetime.now(timezone.utc)
    current_metadata = _current_release_metadata()
    current_month = _month_to_yyyymm(current_metadata.get("population_base_month"))
    latest_month = source_month or _latest_completed_month(execution_time)
    candidate_months = [latest_month] if source_month else _months_after(current_month, latest_month)
    if not candidate_months and current_month == latest_month:
        # 같은 기준월의 공식 정정도 놓치지 않도록 최신 파일의 내용 해시를 다시 확인한다.
        candidate_months = [latest_month]
    run_directory = RUNS_ROOT / run_id
    run_directory.mkdir(parents=True, exist_ok=False)

    if not candidate_months:
        result = MonthlyReleaseResult(
            state="no_change",
            status_label="새로 반영할 자료 없음",
            run_id=run_id,
            source_month=current_month,
            previous_source_month=current_month,
            version=str(current_metadata.get("version") or "") or None,
            run_directory=str(run_directory),
            message="현재 분석 결과가 최신 공표 대상월을 사용하고 있습니다.",
        )
        _write_result(run_directory, result)
        return result

    try:
        dataset = await _fetch_newest_dataset(client or AgePopulationClient(), candidate_months)
    except (AgePopulationValidationError, httpx.HTTPError) as exc:
        result = MonthlyReleaseResult(
            state="blocked",
            status_label="공식 자료 확인 실패",
            run_id=run_id,
            source_month=latest_month,
            previous_source_month=current_month,
            version=str(current_metadata.get("version") or "") or None,
            run_directory=str(run_directory),
            message=type(exc).__name__,
        )
        _write_result(run_directory, result)
        return result
    if dataset is None:
        result = MonthlyReleaseResult(
            state="waiting_source",
            status_label="공식 자료 공개 대기",
            run_id=run_id,
            source_month=latest_month,
            previous_source_month=current_month,
            version=str(current_metadata.get("version") or "") or None,
            run_directory=str(run_directory),
            message="새 공식 연령별 인구가 확인되지 않아 기존 분석 결과를 유지합니다.",
        )
        _write_result(run_directory, result)
        return result

    dataset_hash = canonical_age_population_sha256(dataset.records)
    current_population_hash = str(current_metadata.get("population_source_sha256") or "")
    if dataset.source_month == current_month and dataset_hash == current_population_hash:
        result = MonthlyReleaseResult(
            state="no_change",
            status_label="공식 자료 변경 없음",
            run_id=run_id,
            source_month=dataset.source_month,
            previous_source_month=current_month,
            version=str(current_metadata.get("version") or "") or None,
            run_directory=str(run_directory),
            message="최신 공식 자료의 내용이 현재 분석 입력과 같습니다.",
        )
        _write_result(run_directory, result)
        return result

    version = _next_version(dataset.source_month, current_metadata)
    if mode == "check":
        result = MonthlyReleaseResult(
            state="ready_to_publish",
            status_label="새 공식 자료 확인",
            run_id=run_id,
            source_month=dataset.source_month,
            previous_source_month=current_month,
            version=version,
            run_directory=str(run_directory),
            message="150개 행정동의 공식 연령별 인구 구조를 확인했습니다.",
        )
        _write_result(run_directory, result)
        return result

    workspace = _create_staging_workspace(run_directory)
    released_at = execution_time.astimezone(ZoneInfo("Asia/Seoul")).replace(microsecond=0).isoformat()
    official_path, _, _ = write_age_population_dataset(
        dataset,
        workspace,
        verified_at=execution_time.astimezone(timezone.utc).replace(microsecond=0),
    )
    _write_release_manifest(
        workspace,
        version=version,
        released_at=released_at,
        source_month=dataset.source_month,
    )
    try:
        _run_staged_analysis(
            workspace,
            version=version,
            released_at=released_at,
            offline=offline,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        result = MonthlyReleaseResult(
            state="blocked",
            status_label="검증 실패로 반영 중단",
            run_id=run_id,
            source_month=dataset.source_month,
            previous_source_month=current_month,
            version=version,
            run_directory=str(run_directory),
            message=type(exc).__name__,
        )
        _write_result(run_directory, result)
        return result

    candidate_release = _read_json(workspace / "data" / "processed" / "policy_release.json")
    if not candidate_release:
        result = MonthlyReleaseResult(
            state="blocked",
            status_label="검증 실패로 반영 중단",
            run_id=run_id,
            source_month=dataset.source_month,
            previous_source_month=current_month,
            version=version,
            run_directory=str(run_directory),
            message="시험 분석 결과 파일을 읽을 수 없습니다.",
        )
        _write_result(run_directory, result)
        return result
    change_summary, change_summary_path = _write_change_summary(
        run_directory,
        _read_json(CURRENT_RELEASE_PATH),
        candidate_release,
    )

    if mode == "test":
        result = MonthlyReleaseResult(
            state="ready_to_publish",
            status_label=(
                "시험 실행 완료 · 변화 검토 필요"
                if change_summary.review_required
                else "시험 실행 완료"
            ),
            run_id=run_id,
            source_month=dataset.source_month,
            previous_source_month=current_month,
            version=version,
            run_directory=str(run_directory),
            message=(
                "현재 공개 파일을 바꾸지 않았습니다. 변화 요약을 사람이 확인해야 합니다."
                if change_summary.review_required
                else "현재 공개 파일을 바꾸지 않고 새 분석 결과를 검증했습니다."
            ),
            change_summary_path=str(change_summary_path),
            review_required=change_summary.review_required,
            review_reasons=change_summary.review_reasons,
        )
        _write_result(run_directory, result)
        return result

    if change_summary.review_required and not confirm_reviewed_change:
        result = MonthlyReleaseResult(
            state="blocked",
            status_label="큰 변화 검토 필요",
            run_id=run_id,
            source_month=dataset.source_month,
            previous_source_month=current_month,
            version=version,
            run_directory=str(run_directory),
            message="변화 요약을 확인한 뒤 검토 완료 옵션으로 다시 실행해 주세요.",
            change_summary_path=str(change_summary_path),
            review_required=True,
            review_reasons=change_summary.review_reasons,
        )
        _write_result(run_directory, result)
        return result

    changed_count = _publish_workspace(
        workspace,
        version=version,
        official_source_name=official_path.name,
    )
    result = MonthlyReleaseResult(
        state="published",
        status_label="정식 반영 완료",
        run_id=run_id,
        source_month=dataset.source_month,
        previous_source_month=current_month,
        version=version,
        changed_file_count=changed_count,
        run_directory=str(run_directory),
        message="검증된 분석 결과를 정본과 프론트 공개 파일에 함께 반영했습니다.",
        change_summary_path=str(change_summary_path),
        review_required=change_summary.review_required,
        review_reasons=change_summary.review_reasons,
    )
    _write_result(run_directory, result)
    return result
