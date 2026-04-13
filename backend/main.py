from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_NAME = "Gen3D API"
APP_VERSION = "0.1.0"
API_PREFIX = "/v1"

REQUIRED_BEARER_TOKEN = os.getenv("MESHFORGE_API_TOKEN", "").strip()
PUBLIC_ASSET_BASE = os.getenv("MESHFORGE_PUBLIC_ASSET_BASE", "http://localhost:8000/assets").rstrip("/")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "MESHFORGE_ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:4173",
    ).split(",")
    if origin.strip()
]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = APP_NAME
    version: str = APP_VERSION
    message: str = "Backend connected"


class UploadResponse(BaseModel):
    upload_id: str
    filename: str
    content_type: Optional[str] = None
    size_bytes: int
    url: str
    created_at: datetime


class GenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=2000)
    negative_prompt: str = Field(default="", max_length=2000)
    mode: Literal["text_to_3d", "image_to_3d", "mesh_to_mesh"] = "text_to_3d"
    quality: int = Field(default=70, ge=1, le=100)
    texture_strength: int = Field(default=60, ge=0, le=100)
    symmetry: bool = True
    output_format: Literal["glb", "obj", "fbx", "usdz"] = "glb"
    seed: Optional[int] = None
    reference_upload_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class JobRecord(BaseModel):
    id: str
    status: Literal["queued", "processing", "completed", "failed"]
    progress: int = Field(ge=0, le=100)
    prompt: str
    negative_prompt: str = ""
    mode: Literal["text_to_3d", "image_to_3d", "mesh_to_mesh"]
    quality: int
    texture_strength: int
    symmetry: bool
    output_format: Literal["glb", "obj", "fbx", "usdz"]
    seed: Optional[int] = None
    reference_upload_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    output_url: str = ""
    asset_url: str = ""
    error: Optional[str] = None


class CreateJobResponse(BaseModel):
    job: JobRecord


class ListJobsResponse(BaseModel):
    jobs: List[JobRecord]
    total: int


app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOB_STORE: Dict[str, JobRecord] = {}
UPLOAD_STORE: Dict[str, UploadResponse] = {}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def verify_bearer_token(authorization: Optional[str] = Header(default=None)) -> None:
    if not REQUIRED_BEARER_TOKEN:
        return

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    provided = authorization.removeprefix("Bearer ").strip()
    if provided != REQUIRED_BEARER_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid bearer token")


def get_job_or_404(job_id: str) -> JobRecord:
    job = JOB_STORE.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


async def mock_generate_pipeline(job_id: str) -> None:
    job = get_job_or_404(job_id)

    try:
        for progress in (10, 28, 52, 74, 91, 100):
            await asyncio.sleep(1.2)
            job.status = "processing" if progress < 100 else "completed"
            job.progress = progress
            job.updated_at = utc_now()

            if progress == 100:
                output_name = f"{job.id}.{job.output_format}"
                output_url = f"{PUBLIC_ASSET_BASE}/{output_name}"
                job.output_url = output_url
                job.asset_url = output_url

        JOB_STORE[job_id] = job
    except Exception as exc:
        job.status = "failed"
        job.error = str(exc)
        job.updated_at = utc_now()
        JOB_STORE[job_id] = job


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "service": APP_NAME,
        "version": APP_VERSION,
        "docs": "/docs",
        "health": ["/health", f"{API_PREFIX}/health"],
        "generate": ["/generate-3d", f"{API_PREFIX}/generate-3d"],
        "jobs": ["/jobs", f"{API_PREFIX}/jobs"],
        "uploads": ["/uploads/reference", f"{API_PREFIX}/uploads/reference"],
    }


@app.get("/health", response_model=HealthResponse)
@app.get(f"{API_PREFIX}/health", response_model=HealthResponse)
async def health_check(_: None = Depends(verify_bearer_token)) -> HealthResponse:
    return HealthResponse()


@app.post("/uploads/reference", response_model=UploadResponse)
@app.post(f"{API_PREFIX}/uploads/reference", response_model=UploadResponse)
async def upload_reference_asset(
    file: UploadFile = File(...),
    _: None = Depends(verify_bearer_token),
) -> UploadResponse:
    content = await file.read()
    upload_id = str(uuid.uuid4())
    created_at = utc_now()
    url = f"{PUBLIC_ASSET_BASE}/uploads/{upload_id}/{file.filename}"

    record = UploadResponse(
        upload_id=upload_id,
        filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(content),
        url=url,
        created_at=created_at,
    )
    UPLOAD_STORE[upload_id] = record
    return record


@app.post("/generate-3d", response_model=CreateJobResponse)
@app.post(f"{API_PREFIX}/generate-3d", response_model=CreateJobResponse)
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

    missing_uploads = [upload_id for upload_id in payload.reference_upload_ids if upload_id not in UPLOAD_STORE]
    if missing_uploads:
        raise HTTPException(status_code=400, detail={"missing_upload_ids": missing_uploads})

    now = utc_now()
    job = JobRecord(
        id=str(uuid.uuid4()),
        status="queued",
        progress=0,
        prompt=payload.prompt,
        negative_prompt=payload.negative_prompt,
        mode=payload.mode,
        quality=payload.quality,
        texture_strength=payload.texture_strength,
        symmetry=payload.symmetry,
        output_format=payload.output_format,
        seed=payload.seed,
        reference_upload_ids=payload.reference_upload_ids,
        metadata=payload.metadata,
        created_at=now,
        updated_at=now,
    )
    JOB_STORE[job.id] = job
    background_tasks.add_task(mock_generate_pipeline, job.id)
    return CreateJobResponse(job=job)


@app.get("/jobs", response_model=ListJobsResponse)
@app.get(f"{API_PREFIX}/jobs", response_model=ListJobsResponse)
async def list_jobs(_: None = Depends(verify_bearer_token)) -> ListJobsResponse:
    jobs = sorted(JOB_STORE.values(), key=lambda item: item.created_at, reverse=True)
    return ListJobsResponse(jobs=jobs, total=len(jobs))


@app.get("/jobs/{job_id}", response_model=JobRecord)
@app.get(f"{API_PREFIX}/jobs/{{job_id}}", response_model=JobRecord)
async def get_job(job_id: str, _: None = Depends(verify_bearer_token)) -> JobRecord:
    return get_job_or_404(job_id)


@app.delete("/jobs/{job_id}")
@app.delete(f"{API_PREFIX}/jobs/{{job_id}}")
async def delete_job(job_id: str, _: None = Depends(verify_bearer_token)) -> Dict[str, Any]:
    if job_id not in JOB_STORE:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    deleted = JOB_STORE.pop(job_id)
    return {"deleted": True, "job_id": deleted.id}
