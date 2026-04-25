from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/latticeforge"
    redis_url: str = "redis://localhost:6379/0"
    public_asset_base: str = "http://localhost:8000/assets"
    asset_storage_driver: str = "local"
    asset_storage_path: str = "/tmp/latticeforge-assets"
    open_model_router_url: str = ""
    open_model_router_api_key: str = ""
    llm_default_model: str = "public/planner"
    generation_worker_mode: str = "mock"
    cors_origins_raw: str = "http://localhost:3000,http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

settings = Settings()
