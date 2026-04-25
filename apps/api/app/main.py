from enum import Enum
from uuid import uuid4
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel, Field

app = FastAPI(title="LatticeForge 3D API", version="0.1.0")

class Quality(str, Enum):
    draft = "draft"
    standard = "standard"
    high = "high"
    hero = "hero"

class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=3)
    style: str = "hard-surface sci-fi"
    quality: Quality = Quality.standard
    texture_resolution: str = "2048"
    target_polycount: int = 30000
    export_format: str = "glb"

class AssetPlan(BaseModel):
    asset_type: str
    components: list[str]
    materials: list[str]
    target_polycount: int
    texture_resolution: str
    export_format: str

class GenerationJob(BaseModel):
    id: str
    status: str
    plan: AssetPlan
    message: str

@app.get("/health")
def health():
    return {"ok": True, "service": "latticeforge-api"}

@app.post("/v1/prompt/enhance")
def enhance_prompt(payload: GenerateRequest):
    enhanced = (
        f"{payload.prompt}. Production-ready {payload.style} asset, clean silhouette, "
        f"PBR materials, UV-ready surfaces, target {payload.target_polycount} triangles, "
        f"{payload.texture_resolution}px textures, export as {payload.export_format.upper()}."
    )
    return {"original": payload.prompt, "enhanced": enhanced}

@app.post("/v1/generate/text-to-3d", response_model=GenerationJob)
def text_to_3d(payload: GenerateRequest):
    plan = AssetPlan(
        asset_type="generated 3D asset",
        components=["primary body", "detail panels", "supporting mechanical elements", "material layers"],
        materials=["painted metal", "rubber", "emissive accents"],
        target_polycount=payload.target_polycount,
        texture_resolution=payload.texture_resolution,
        export_format=payload.export_format,
    )
    return GenerationJob(
        id=str(uuid4()),
        status="queued",
        plan=plan,
        message="Generation job accepted. Connect this endpoint to Celery, Redis, or Temporal next.",
    )

@app.post("/v1/generate/image-to-3d")
async def image_to_3d(file: UploadFile = File(...)):
    return {"id": str(uuid4()), "filename": file.filename, "status": "queued", "message": "Image-to-3D job accepted."}
