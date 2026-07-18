from app.services import scheduler as scheduler_module


class FakeScheduler:
    def __init__(self) -> None:
        self.jobs: list[tuple[object, object, dict]] = []
        self.running = False

    def add_job(self, function, trigger, **kwargs) -> None:
        self.jobs.append((function, trigger, kwargs))

    def start(self) -> None:
        self.running = True


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
    assert all(job[2]["max_instances"] == 1 for job in fake_scheduler.jobs)
