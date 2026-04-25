from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health")
def health():
    return {"ok": True, "service": "latticeforge-api", "version": "0.2.0", "worker_mode": settings.generation_worker_mode}
