from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import List


def _parse_origins(value: str) -> List[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "Gen3D API"
    app_version: str = "0.2.0"
    api_prefix: str = "/v1"
    required_bearer_token: str = os.getenv("MESHFORGE_API_TOKEN", "").strip()
    default_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:4173"
    backend_root: Path = Path(__file__).resolve().parents[1]
    storage_root: Path = Path(os.getenv("MESHFORGE_STORAGE_ROOT", Path(__file__).resolve().parents[1] / "data"))
    database_path: Path = Path(os.getenv("MESHFORGE_DATABASE_PATH", Path(__file__).resolve().parents[1] / "data" / "gen3d.db"))
    public_asset_base: str = os.getenv("MESHFORGE_PUBLIC_ASSET_BASE", "http://localhost:8000/assets").rstrip("/")
    generation_delay_seconds: float = float(os.getenv("MESHFORGE_GENERATION_DELAY_SECONDS", "0.9"))

    @property
    def uploads_dir(self) -> Path:
        return self.storage_root / "uploads"

    @property
    def jobs_dir(self) -> Path:
        return self.storage_root / "jobs"

    @property
    def allowed_origins(self) -> List[str]:
        raw = os.getenv("MESHFORGE_ALLOWED_ORIGINS", self.default_origins)
        return _parse_origins(raw)


settings = Settings()
