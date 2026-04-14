from __future__ import annotations

import asyncio

from .config import settings
from .storage import Store


class JobRunner:
    def __init__(self, store: Store) -> None:
        self.store = store

    async def run_job(self, job_id: str) -> None:
        try:
            for progress in (8, 22, 44, 67, 86):
                await asyncio.sleep(settings.generation_delay_seconds)
                self.store.update_job_progress(job_id, status="processing", progress=progress)

            await asyncio.sleep(settings.generation_delay_seconds)
            self.store.complete_job(job_id)
        except Exception as exc:  # pragma: no cover - defensive fallback for runtime tasks
            self.store.fail_job(job_id, str(exc))
