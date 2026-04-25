from pydantic import BaseModel

class AssetRecord(BaseModel):
    id: str
    name: str
    kind: str
    status: str
    format: str
    polycount: int
    texture_resolution: int
    preview_url: str | None = None
    file_url: str | None = None
    created_at: str

class UploadResponse(BaseModel):
    id: str
    filename: str
    content_type: str | None
    size_bytes: int
    status: str
