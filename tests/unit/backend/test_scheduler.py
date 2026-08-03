import asyncio

import pytest

from app.services.fetchers.hospitals_api import (
    MAX_REQUESTS_PER_RUN as HOSPITAL_REQUEST_BUDGET,
    HospitalsAPIClient,
)
from app.services.fetchers.population_api import (
    MAX_REQUESTS_PER_RUN as POPULATION_REQUEST_BUDGET,
    PopulationAPIClient,
)
from app.services.fetchers.sgis import (
    MAX_REQUESTS_PER_RUN as SGIS_REQUEST_BUDGET,
    SGISClient,
)
from app.services import scheduler as scheduler_module


class FakeScheduler:
    def __init__(self) -> None:
        self.jobs: list[tuple[object, object, dict]] = []
        self.running = False

    def add_job(self, function, trigger, **kwargs) -> None:
        self.jobs.append((function, trigger, kwargs))

    def start(self) -> None:
        self.running = True

    def get_jobs(self) -> list[tuple[object, object, dict]]:
        return self.jobs


def test_scheduler_tracks_full_coroutine_instead_of_detached_task(monkeypatch):
    fake_scheduler = FakeScheduler()
    monkeypatch.setattr(scheduler_module, "scheduler", fake_scheduler)
    monkeypatch.setattr(
        scheduler_module,
        "CronTrigger",
        lambda **kwargs: kwargs,
    )
    monkeypatch.setattr(
        scheduler_module,
        "get_env",
        lambda key, default=None: "true"
        if key == "ENABLE_PUBLIC_DATA_SCHEDULER"
        else "Asia/Seoul",
    )

    scheduler_module.start_public_data_scheduler()

    assert fake_scheduler.running is True
    assert len(fake_scheduler.jobs) == 4
    assert all(job[0] is scheduler_module._run_target for job in fake_scheduler.jobs)
    assert [job[2]["args"] for job in fake_scheduler.jobs] == [
        ["emergency"],
        ["moonlight"],
        ["population"],
        ["admin-boundary"],
    ]
    assert fake_scheduler.jobs[2][1] == {
        "day": "1-7,10,15,20,25",
        "hour": 18,
        "minute": 0,
        "timezone": "Asia/Seoul",
    }
    assert all(job[2]["max_instances"] == 1 for job in fake_scheduler.jobs)
    assert scheduler_module.get_public_data_scheduler_status() == {
        "configured": True,
        "running": True,
        "jobCount": 4,
    }


@pytest.mark.parametrize(
    ("client", "budget"),
    [
        (HospitalsAPIClient(), HOSPITAL_REQUEST_BUDGET),
        (PopulationAPIClient(), POPULATION_REQUEST_BUDGET),
        (SGISClient(), SGIS_REQUEST_BUDGET),
    ],
)
def test_external_api_clients_stop_at_per_run_request_budget(client, budget):
    client.request_count = budget

    with pytest.raises(RuntimeError, match="request budget exceeded"):
        client._reserve_request()


def test_scheduled_job_times_out_and_closes_database(monkeypatch):
    class FakeDb:
        closed = False

        def close(self) -> None:
            self.closed = True

    fake_db = FakeDb()

    async def slow_pipeline(*_args, **_kwargs):
        await asyncio.sleep(1)

    monkeypatch.setattr(scheduler_module, "SessionLocal", lambda: fake_db)
    monkeypatch.setattr(scheduler_module, "run_data_pipeline", slow_pipeline)
    monkeypatch.setattr(scheduler_module, "SCHEDULED_JOB_TIMEOUT_SECONDS", 0.001)

    asyncio.run(scheduler_module._run_target("population"))

    assert fake_db.closed is True
