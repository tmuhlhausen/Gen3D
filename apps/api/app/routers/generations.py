from fastapi import APIRouter, HTTPException, UploadFile, File
from app.repositories.memory import store
from app.schemas.generation import GenerationJob, GenerationMode, GenerationRequest
from app.services.generation import advance_job, create_generation_job

router = APIRouter()

@router.post("/generations/text-to-3d", response_model=GenerationJob)
def text_to_3d(payload: GenerationRequest):
    payload.mode = GenerationMode.text_to_3d
    return create_generation_job(payload)

@router.post("/generations/image-to-3d", response_model=GenerationJob)
async def image_to_3d(file: UploadFile = File(...), prompt: str = "image reference asset"):
    payload = GenerationRequest(prompt=prompt, mode=GenerationMode.image_to_3d, reference_asset_ids=[file.filename])
    return create_generation_job(payload)

@router.get("/generations")
def list_generations():
    return {"jobs": list(store.jobs.values())}

@router.get("/generations/{job_id}", response_model=GenerationJob)
def get_generation(job_id: str):
    job = store.jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Generation not found")
    return advance_job(job)
