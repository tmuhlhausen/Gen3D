from fastapi import APIRouter
from app.schemas.assistant import AssistantActionRequest, AssistantActionResponse
from app.services.assistant import plan_actions

router = APIRouter()

@router.post("/assistant/actions", response_model=AssistantActionResponse)
def assistant_actions(payload: AssistantActionRequest):
    return plan_actions(payload.command, payload.selected_object_id)
