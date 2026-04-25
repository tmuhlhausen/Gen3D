from fastapi import APIRouter
from app.schemas.generation import PromptEnhanceRequest, PromptEnhanceResponse, ExportFormat
from app.services.planner import build_plan, enhance_prompt

router = APIRouter()

@router.post("/prompts/enhance", response_model=PromptEnhanceResponse)
def enhance(payload: PromptEnhanceRequest):
    enhanced = enhance_prompt(payload.prompt, payload.target, payload.style)
    plan = build_plan(payload.prompt, 30000, 2048, ExportFormat.glb)
    return PromptEnhanceResponse(original=payload.prompt, enhanced=enhanced, plan=plan)
