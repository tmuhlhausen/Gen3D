from app.schemas.assistant import AssistantAction, AssistantActionResponse


def plan_actions(command: str, selected_object_id: str | None = None) -> AssistantActionResponse:
    lowered = command.lower()
    target = selected_object_id or "current_selection"
    actions: list[AssistantAction] = []

    if "poly" in lowered or "optimize" in lowered or "reduce" in lowered:
        actions.append(AssistantAction(action="optimize_mesh", target=target, parameters={"target_reduction": 0.45, "preserve_uvs": True}))
    if "metal" in lowered or "texture" in lowered or "material" in lowered:
        actions.append(AssistantAction(action="generate_material_variant", target=target, parameters={"material_family": "worn metal", "pbr": True}))
    if "bevel" in lowered or "edge" in lowered:
        actions.append(AssistantAction(action="bevel_edges", target=target, parameters={"amount": 0.025, "segments": 2}))
    if not actions:
        actions.append(AssistantAction(action="scene_note", target=target, parameters={"instruction": command}))

    return AssistantActionResponse(summary=f"Planned {len(actions)} action(s) for: {command}", actions=actions)
