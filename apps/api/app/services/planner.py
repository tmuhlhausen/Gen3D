from app.schemas.generation import AssetPlan, ExportFormat

KEYWORD_COMPONENTS = {
    "drone": ["central fuselage", "rotor housings", "camera gimbal", "landing struts", "panel seams"],
    "helmet": ["shell", "visor", "chin guard", "rear vents", "inner padding"],
    "sword": ["blade", "guard", "grip", "pommel", "edge bevels"],
    "chair": ["seat", "backrest", "legs", "support braces", "material seams"],
}

def infer_asset_type(prompt: str) -> str:
    lowered = prompt.lower()
    for keyword in KEYWORD_COMPONENTS:
        if keyword in lowered:
            return keyword
    return "3D asset"

def build_plan(prompt: str, target_polycount: int, texture_resolution: int, export_format: ExportFormat) -> AssetPlan:
    asset_type = infer_asset_type(prompt)
    components = KEYWORD_COMPONENTS.get(asset_type, ["primary form", "secondary details", "surface panels", "material zones"])
    materials = ["PBR base material", "edge wear layer", "roughness map", "normal detail map"]
    constraints = ["clean silhouette", "UV-ready topology", "export-safe transforms", "game-ready scale"]
    return AssetPlan(
        asset_type=asset_type,
        components=components,
        materials=materials,
        constraints=constraints,
        target_polycount=target_polycount,
        texture_resolution=texture_resolution,
        export_format=export_format,
    )

def enhance_prompt(prompt: str, target: str, style: str) -> str:
    return (
        f"{prompt}. Create a {target} in {style}. Use clean topology, readable silhouette, "
        "organized material zones, UV-ready surfaces, physically based materials, and export-safe scale."
    )
