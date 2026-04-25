from app.schemas.assets import AssetRecord
from app.schemas.generation import GenerationJob

class MemoryStore:
    def __init__(self) -> None:
        self.jobs: dict[str, GenerationJob] = {}
        self.assets: dict[str, AssetRecord] = {}

store = MemoryStore()
