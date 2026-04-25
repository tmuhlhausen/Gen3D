from enum import Enum
from pydantic import BaseModel, Field

class GenerationMode(str, Enum):
    text_to_3d = "text_to_3d"
    image_to_3d = "image_to_3d"
    mesh_to_mesh = "mesh_to_mesh"

class GenerationQuality(str, Enum):
    draft = "draft"
    standard = "standard"
    high = "high"
    hero = "hero"

class ExportFormat(str, Enum):
    glb = "glb"
    fbx = "fbx"
    obj = "obj"
    usdz = "usdz"

class GenerationRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2400)
    negative_prompt: str = "low quality, broken topology, noisy texture"
    mode: GenerationMode = GenerationMode.text_to_3d
    style: str = "hard-surface sci-fi"
    quality: GenerationQuality = GenerationQuality.standard
    texture_resolution: int = Field(default=2048, ge=512, le=8192)
    target_polycount: int = Field(default=30000, ge=500, le=5000000)
    export_format: ExportFormat = ExportFormat.glb
    seed: int | None = None
    reference_asset_ids: list[str] = []

class AssetPlan(BaseModel):
    asset_type: str
    components: list[str]
    materials: list[str]
    constraints: list[str]
    target_polycount: int
    texture_resolution: int
    export_format: ExportFormat

class GenerationJob(BaseModel):
    id: str
    status: str
    progress: int
    request: GenerationRequest
    plan: AssetPlan
    preview_url: str | None = None
    output_url: str | None = None
    created_at: str
    updated_at: str

class PromptEnhanceRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    target: str = "game-ready asset"
    style: str = "production quality"

class PromptEnhanceResponse(BaseModel):
    original: str
    enhanced: str
    plan: AssetPlan
