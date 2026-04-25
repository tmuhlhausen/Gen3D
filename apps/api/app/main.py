from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import assets, assistant, generations, health, models, prompts

app = FastAPI(title="LatticeForge 3D API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(models.router, prefix="/v1", tags=["models"])
app.include_router(prompts.router, prefix="/v1", tags=["prompts"])
app.include_router(generations.router, prefix="/v1", tags=["generations"])
app.include_router(assets.router, prefix="/v1", tags=["assets"])
app.include_router(assistant.router, prefix="/v1", tags=["assistant"])
