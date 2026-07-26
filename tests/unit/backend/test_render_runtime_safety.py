import asyncio

import pytest

from app.core import env as env_module
from app.db import database as database_module
from app.services import bed_poller as bed_poller_module


@pytest.mark.parametrize(
    ("raw_value", "expected"),
    [
        (None, 600),
        ("invalid", 600),
        ("60", 300),
        ("900", 900),
        ("7200", 3600),
    ],
)
def test_bed_cache_poll_interval_has_safe_bounds(
    monkeypatch,
    raw_value: str | None,
    expected: int,
) -> None:
    monkeypatch.setattr(
        env_module,
        "env_str",
        lambda _name: raw_value,
    )

    assert env_module.bed_cache_poll_interval_sec() == expected


def test_bed_poller_status_separates_configuration_and_runtime(
    monkeypatch,
) -> None:
    class FakeTask:
        def done(self) -> bool:
            return False

    monkeypatch.setattr(bed_poller_module, "should_use_mock_realtime", lambda: False)
    monkeypatch.setattr(bed_poller_module, "bed_cache_poll_interval_sec", lambda: 600)
    monkeypatch.setattr(bed_poller_module, "_poller_task", FakeTask())

    assert bed_poller_module.get_bed_poller_status() == {
        "configured": True,
        "running": True,
        "intervalSec": 600,
    }


def test_start_bed_poller_does_not_duplicate_running_task(monkeypatch) -> None:
    class FakeTask:
        def done(self) -> bool:
            return False

    monkeypatch.setattr(bed_poller_module, "should_use_mock_realtime", lambda: False)
    monkeypatch.setattr(bed_poller_module, "_poller_task", FakeTask())

    asyncio.run(bed_poller_module.start_bed_poller())


@pytest.mark.parametrize(
    ("render_value", "is_mount", "expected"),
    [
        ("", False, "local"),
        ("true", False, "ephemeral"),
        ("true", True, "persistent-disk"),
    ],
)
def test_database_storage_mode_reports_render_persistence(
    monkeypatch,
    render_value: str,
    is_mount: bool,
    expected: str,
) -> None:
    monkeypatch.setenv("RENDER", render_value)
    monkeypatch.setattr(database_module.os.path, "ismount", lambda _path: is_mount)

    assert database_module.database_storage_mode() == expected
