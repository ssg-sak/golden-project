# -*- coding: utf-8 -*-
"""스테이징 데이터 품질 검증."""

from __future__ import annotations

from typing import Any


class DataValidationError(Exception):
    pass


def validate_admin_dongs(records: list[dict[str, Any]], previous_count: int | None = None) -> None:
    if not records:
        raise DataValidationError("행정동 데이터가 비어 있습니다.")

    codes: set[str] = set()
    for row in records:
        if row.get("sido_name") != "대구광역시":
            raise DataValidationError(f"대구 외 지역 혼입: {row}")
        code = row.get("admin_dong_code")
        name = row.get("admin_dong_name")
        if not code or not name:
            raise DataValidationError(f"행정동 필수 필드 누락: {row}")
        if code in codes:
            raise DataValidationError(f"행정동 코드 중복: {code}")
        codes.add(code)

    if previous_count and previous_count > 0:
        ratio = len(records) / previous_count
        if ratio < 0.5 or ratio > 1.5:
            raise DataValidationError(
                f"행정동 수 급변: {previous_count} -> {len(records)}"
            )


def validate_medical_facilities(
    records: list[dict[str, Any]],
    previous_count: int | None = None,
) -> None:
    if not records:
        raise DataValidationError("의료기관 데이터가 비어 있습니다.")

    ids: set[str] = set()
    unmapped = 0
    for row in records:
        facility_id = row.get("facility_id")
        name = row.get("facility_name")
        if not facility_id or not name:
            raise DataValidationError(f"의료기관 필수 필드 누락: {row}")
        if facility_id in ids:
            raise DataValidationError(f"기관 ID 중복: {facility_id}")
        ids.add(facility_id)

        if row.get("sido_name") != "대구광역시":
            raise DataValidationError(f"대구 외 지역 혼입: {row}")

        lat = row.get("latitude")
        lng = row.get("longitude")
        if lat is None or lng is None:
            raise DataValidationError(f"좌표 누락: {name}")
        if not (33.0 <= float(lat) <= 39.0 and 124.0 <= float(lng) <= 132.0):
            raise DataValidationError(f"좌표 범위 오류: {name}")

        if not row.get("dashboard_category"):
            unmapped += 1

    if unmapped:
        raise DataValidationError(f"dashboard_category 미매핑 {unmapped}건")

    if previous_count and previous_count > 0:
        ratio = len(records) / previous_count
        if ratio < 0.5 or ratio > 1.5:
            raise DataValidationError(
                f"의료기관 수 급변: {previous_count} -> {len(records)}"
            )


def validate_population(
    records: list[dict[str, Any]],
    previous_total: int | None = None,
) -> None:
    if not records:
        raise DataValidationError("인구 데이터가 비어 있습니다.")

    keys: set[tuple[str, str]] = set()
    total_sum = 0
    for row in records:
        base_month = row.get("base_month")
        code = row.get("admin_dong_code")
        if not base_month or not code:
            raise DataValidationError(f"인구 필수 필드 누락: {row}")
        key = (base_month, code)
        if key in keys:
            raise DataValidationError(f"인구 행정동 코드 중복: {key}")
        keys.add(key)

        total_pop = int(row.get("total_population") or 0)
        if total_pop < 0:
            raise DataValidationError(f"음수 인구: {row}")
        total_sum += total_pop

    if total_sum == 0:
        raise DataValidationError("전체 인구 합계가 0입니다.")

    if previous_total and previous_total > 0:
        ratio = total_sum / previous_total
        if ratio < 0.7 or ratio > 1.3:
            raise DataValidationError(
                f"인구 합계 급변: {previous_total} -> {total_sum}"
            )
