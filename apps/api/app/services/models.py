def available_models() -> list[dict]:
    return [
        {"id": "public/planner", "name": "Public LLM Planner", "tasks": ["prompt_enhancement", "asset_planning"], "status": "available"},
        {"id": "open/text-to-3d-fast", "name": "Open Text-to-3D Fast", "tasks": ["text_to_3d"], "status": "stub"},
        {"id": "open/image-to-3d-recon", "name": "Open Image Reconstruction", "tasks": ["image_to_3d"], "status": "stub"},
        {"id": "mesh/optimizer", "name": "Mesh Optimization Worker", "tasks": ["retopology", "decimation", "uv_unwrap"], "status": "stub"},
        {"id": "texture/pbr", "name": "PBR Texture Worker", "tasks": ["texture_generation"], "status": "stub"},
    ]
