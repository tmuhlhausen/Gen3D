from datetime import datetime, UTC
from uuid import uuid4

from app.core.config import settings
from app.repositories.memory import store
from app.schemas.assets import AssetRecord
from app.schemas.generation import GenerationJob, GenerationRequest
from app.services.planner import build_plan


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def create_generation_job(request: GenerationRequest) -> GenerationJob:
    plan = build_plan(request.prompt, request.target_polycount, request.texture_resolution, request.export_format)
    timestamp = now_iso()
    job_id = str(uuid4())
    output_url = f"{settings.public_asset_base}/{job_id}.{request.export_format.value}"
    preview_url = f"{settings.public_asset_base}/{job_id}.png"
    job = GenerationJob(
        id=job_id,
        status="queued",
        progress=8,
        request=request,
        plan=plan,
        preview_url=preview_url,
        output_url=output_url,
        created_at=timestamp,
        updated_at=timestamp,
    )
    store.jobs[job.id] = job
    asset = AssetRecord(
        id=job_id,
        name=request.prompt[:64],
        kind=request.mode.value,
        status="generating",
        format=request.export_format.value,
        polycount=request.target_polycount,
        texture_resolution=request.texture_resolution,
        preview_url=preview_url,
        file_url=output_url,
        created_at=timestamp,
    )
    store.assets[asset.id] = asset
    return job


def advance_job(job: GenerationJob) -> GenerationJob:
    if job.status in {"completed", "failed"}:
        return job
    next_progress = min(100, job.progress + 23)
    job.progress = next_progress
    job.status = "completed" if next_progress >= 100 else "processing"
    job.updated_at = now_iso()
    store.jobs[job.id] = job
    asset = store.assets.get(job.id)
    if asset:
        asset.status = "ready" if job.status == "completed" else "generating"
        store.assets[asset.id] = asset
    return job
