from __future__ import annotations

import asyncio
from pathlib import Path
from typing import List

from .config import settings
from .inference import FormulaInferenceAdapter, InferenceError
from .storage import Store


class JobRunner:
    def __init__(self, store: Store) -> None:
        self.store = store
        self.adapter = FormulaInferenceAdapter()

    async def run_job(self, job_id: str) -> None:
        try:
            self.store.update_job_progress(job_id, status="processing", progress=4)
            job = self.store.require_job(job_id)
            upload_paths = self._resolve_upload_paths(job.reference_upload_ids)
            output_dir = settings.jobs_dir / job.id
            output_dir.mkdir(parents=True, exist_ok=True)

            def update_progress(progress: int, message: str) -> None:
                current = self.store.require_job(job_id)
                metadata = {**current.metadata, "worker_status": message}
                self.store.update_job_state(
                    job_id,
                    status="processing",
                    progress=max(1, min(progress, 99)),
                    metadata=metadata,
                )

            artifact = await asyncio.to_thread(self.adapter.run, job, upload_paths, output_dir, update_progress)
            self.store.complete_job_with_artifact(job_id, artifact.artifact_path, artifact.manifest)
        except InferenceError as exc:
            self.store.fail_job(job_id, str(exc))
        except Exception as exc:  # pragma: no cover - defensive fallback for runtime tasks
            self.store.fail_job(job_id, f"Worker crashed: {exc}")

    def _resolve_upload_paths(self, upload_ids: List[str]) -> List[Path]:
        paths: List[Path] = []
        for upload_id in upload_ids:
            path = self.store.get_upload_path(upload_id)
            if path is not None and path.exists():
                paths.append(path)
        return paths
