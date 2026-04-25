from pydantic import BaseModel, Field

class AssistantActionRequest(BaseModel):
    command: str = Field(min_length=3)
    selected_object_id: str | None = None
    scene_id: str | None = None

class AssistantAction(BaseModel):
    action: str
    target: str
    parameters: dict

class AssistantActionResponse(BaseModel):
    summary: str
    actions: list[AssistantAction]
