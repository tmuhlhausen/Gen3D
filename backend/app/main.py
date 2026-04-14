from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .schemas import CreateJobResponse, GenerationRequest, HealthResponse, JobRecord, ListJobsResponse, UploadResponse
from .service import JobRunner
from .storage import Store


store = Store(
    database_path=settings.database_path,
    storage_root=settings.storage_root,
    public_asset_base=settings.public_asset_base,
)
runner = JobRunner(store)

app = FastAPI(title=settings.app_name, version=settings.app_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/assets", StaticFiles(directory=settings.storage_root), name="assets")


@app.on_event("startup")
async def startup_event() -> None:
    store.initialize()


async def verify_bearer_token(authorization: Optional[str] = Header(default=None)) -> None:
    token = settings.required_bearer_token
    if not token:
        return

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    provided = authorization.removeprefix("Bearer ").strip()
    if provided != token:
        raise HTTPException(status_code=403, detail="Invalid bearer token")


def get_job_or_404(job_id: str) -> JobRecord:
    job = store.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": ["/health", f"{settings.api_prefix}/health"],
        "generate": ["/generate-3d", f"{settings.api_prefix}/generate-3d"],
        "jobs": ["/jobs", f"{settings.api_prefix}/jobs"],
        "uploads": ["/uploads/reference", f"{settings.api_prefix}/uploads/reference"],
        "assets_base": "/assets",
    }


@app.get("/health", response_model=HealthResponse)
@app.get(f"{settings.api_prefix}/health", response_model=HealthResponse)
async def health_check(_: None = Depends(verify_bearer_token)) -> HealthResponse:
    return HealthResponse(service=settings.app_name, version=settings.app_version)


@app.post("/uploads/reference", response_model=UploadResponse)
@app.post(f"{settings.api_prefix}/uploads/reference", response_model=UploadResponse)
async def upload_reference_asset(
    file: UploadFile = File(...),
    _: None = Depends(verify_bearer_token),
) -> UploadResponse:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file was empty")
    return store.create_upload(file.filename, file.content_type, content)


@app.post("/generate-3d", response_model=CreateJobResponse)
@app.post(f"{settings.api_prefix}/generate-3d", response_model=CreateJobResponse)
async def create_generation_job(
    payload: GenerationRequest,
    background_tasks: BackgroundTasks,
    _: None = Depends(verify_bearer_token),
) -> CreateJobResponse:
    if payload.mode != "text_to_3d" and not payload.reference_upload_ids:
        raise HTTPException(
            status_code=400,
            detail="reference_upload_ids are required for image_to_3d and mesh_to_mesh",
        )

    try:
        store.require_uploads(payload.reference_upload_ids)
    except KeyError as exc:
        missing = [item for item in str(exc).strip("'").split(", ") if item]
        raise HTTPException(status_code=400, detail={"missing_upload_ids": missing}) from exc

    job = store.create_job(payload)
    background_tasks.add_task(runner.run_job, job.id)
    return CreateJobResponse(job=job)


@app.get("/jobs", response_model=ListJobsResponse)
@app.get(f"{settings.api_prefix}/jobs", response_model=ListJobsResponse)
async def list_jobs(_: None = Depends(verify_bearer_token)) -> ListJobsResponse:
    jobs = store.list_jobs()
    return ListJobsResponse(jobs=jobs, total=len(jobs))


@app.get("/jobs/{job_id}", response_model=JobRecord)
@app.get(f"{settings.api_prefix}/jobs/{{job_id}}", response_model=JobRecord)
async def get_job(job_id: str, _: None = Depends(verify_bearer_token)) -> JobRecord:
    return get_job_or_404(job_id)


@app.delete("/jobs/{job_id}")
@app.delete(f"{settings.api_prefix}/jobs/{{job_id}}")
async def delete_job(job_id: str, _: None = Depends(verify_bearer_token)) -> Dict[str, Any]:
    deleted = store.delete_job(job_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return {"deleted": True, "job_id": deleted.id}
