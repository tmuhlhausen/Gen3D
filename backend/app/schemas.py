from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


GenerationMode = Literal["text_to_3d", "image_to_3d", "mesh_to_mesh"]
OutputFormat = Literal["glb", "obj", "fbx", "usdz"]
JobStatus = Literal["queued", "processing", "completed", "failed"]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
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
    mode: GenerationMode = "text_to_3d"
    quality: int = Field(default=70, ge=1, le=100)
    texture_strength: int = Field(default=60, ge=0, le=100)
    symmetry: bool = True
    output_format: OutputFormat = "glb"
    seed: Optional[int] = None
    reference_upload_ids: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class JobRecord(BaseModel):
    id: str
    status: JobStatus
    progress: int = Field(ge=0, le=100)
    prompt: str
    negative_prompt: str = ""
    mode: GenerationMode
    quality: int
    texture_strength: int
    symmetry: bool
    output_format: OutputFormat
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
