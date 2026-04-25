from fastapi import APIRouter
from app.services.models import available_models

router = APIRouter()

@router.get("/models")
def list_models():
    return {"models": available_models()}
