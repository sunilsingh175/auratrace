from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
from shared.database import get_db_pool

router = APIRouter(prefix="/v1/projects", tags=["Project Auto-Repair Settings"])


class ProjectSettings(BaseModel):
    auto_repair_enabled: Optional[bool] = None
    auto_merge_enabled: Optional[bool] = None
    github_repo: Optional[str] = None
    github_base_branch: Optional[str] = None
    deploy_provider: Optional[str] = None
    deploy_webhook: Optional[str] = None
    deploy_webhook_secret: Optional[str] = None
    deploy_config: Optional[Dict[str, Any]] = None
    min_fix_confidence: Optional[float] = None
    max_files_per_fix: Optional[int] = None
    max_merges_per_day: Optional[int] = None
    baseline_error_rate: Optional[float] = None
    slack_webhook_url: Optional[str] = None
    discord_webhook_url: Optional[str] = None
    notify_webhook_url: Optional[str] = None


class GitHubTokenPayload(BaseModel):
    token: str


@router.get("/{project_id}/settings")
async def get_settings(project_id: str):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, name, auto_repair_enabled, auto_merge_enabled,
                   github_repo, github_base_branch, deploy_provider, deploy_webhook,
                   min_fix_confidence, max_files_per_fix, max_merges_per_day,
                   baseline_error_rate, slack_webhook_url, discord_webhook_url, notify_webhook_url
            FROM projects WHERE id = $1::uuid
            """,
            project_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Project not found")
    # Never return the encrypted token
    return dict(row)


@router.put("/{project_id}/settings")
async def update_settings(project_id: str, settings: ProjectSettings):
    pool = await get_db_pool()
    updates = {k: v for k, v in settings.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return {"status": "no_changes"}

    set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
    values = list(updates.values())

    async with pool.acquire() as conn:
        await conn.execute(
            f"UPDATE projects SET {set_clauses}, updated_at = NOW() WHERE id = $1::uuid",
            project_id, *values,
        )
    return {"status": "updated", "fields": list(updates.keys())}


@router.post("/{project_id}/github-token")
async def set_github_token(project_id: str, payload: GitHubTokenPayload):
    """Store encrypted GitHub token."""
    from shared.security import encrypt_token
    encrypted = encrypt_token(payload.token)
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE projects SET github_token_encrypted = $1, updated_at = NOW() WHERE id = $2::uuid",
            encrypted, project_id,
        )
    return {"status": "stored"}
