from typing import TypedDict, Annotated
import operator

# --- Custom Reducer for Dictionaries ---
def dict_merger(existing_dict: dict | None, new_dict: dict | None) -> dict:
    """Merges the new dictionary into the existing one, overwriting duplicates."""
    if existing_dict is None:
        return new_dict or {}
    if new_dict is None:
        return existing_dict
    return existing_dict | new_dict


class GraphState(TypedDict, total=False):
    """
    Represents the state of our graph, shared among all nodes.
    """

    # Input
    repo_url: str

    # Simple overwrite (for strings, IDs, paths)
    repo_path: Annotated[str, operator.add]
    repo_id: Annotated[str, operator.add]

    # Dictionary fields – merged across agents
    metadata: Annotated[dict, dict_merger]
    techstack: Annotated[dict, dict_merger]
    fintech: Annotated[dict, dict_merger]

    # --- NEW: Stage 2 Agent Outputs ---
    code_understanding: Annotated[dict, dict_merger]
    compliance: Annotated[dict, dict_merger]
    security: Annotated[dict, dict_merger]
    architecture: Annotated[dict, dict_merger]
    risk: Annotated[dict, dict_merger]
    recommendations: Annotated[dict, dict_merger]

    # Final Builder Output
    ir_build_result: Annotated[dict, dict_merger]