from fastapi import APIRouter
from app.repositories.memory import store

router = APIRouter()

@router.get("/assets")
def list_assets():
    return {"assets": list(store.assets.values())}
