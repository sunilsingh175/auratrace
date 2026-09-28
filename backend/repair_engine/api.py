"""
FastAPI Router for AuraTrace L3 Automated Repair Engine.
Provides endpoints for project repair configuration, Safety Gate checks,
Sandbox verification testing, automated repair triggering, and run audit logs.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.repair_engine.crypto import decrypt_secret, encrypt_secret, mask_token
from backend.repair_engine.github_client import GitHubClient
from backend.repair_engine.orchestrator import RepairOrchestrator
from backend.repair_engine.rollback import validate_rollback_reason
from backend.repair_engine.safety import inspect_patch
from backend.repair_engine.sandbox import async_run_sandbox_test
from backend.shared.database import (
    AsyncSessionLocal,
    Incident,
    Project,
    RepairRun,
    RepairSettings,
    get_db,
)

logger = logging.getLogger("auratrace.repair.api")

router = APIRouter(prefix="/repair", tags=["L3 Automated Repair"])

REDIS_HOST = os.getenv("REDIS_HOST", "redis-broker")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_ANOMALY_CHANNEL = os.getenv("REDIS_ANOMALY_CHANNEL", "anomaly_events")

# Redis async client
_redis = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
_orchestrator = RepairOrchestrator(
    session_maker=AsyncSessionLocal,
    redis_client=_redis,
    anomaly_channel=REDIS_ANOMALY_CHANNEL,
)


# ============================================================
# Request & Response Schemas
# ============================================================

class RepairSettingsUpdatePayload(BaseModel):
    github_repo: Optional[str] = Field(None, description="GitHub repository slug (e.g. 'owner/repo')")
    base_branch: Optional[str] = Field("main", description="Target base branch (e.g. 'main', 'develop')")
    github_token: Optional[str] = Field(None, description="GitHub Personal Access Token (will be encrypted at rest)")
    test_command: Optional[str] = Field("pytest", description="Test suite execution command (e.g. 'pytest', 'npm test')")
    auto_repair_enabled: Optional[bool] = Field(False, description="Enable automated repair upon incident diagnosis")
    auto_merge_enabled: Optional[bool] = Field(False, description="Automatically merge Pull Requests when CI checks pass")
    regression_error_rate_threshold: Optional[float] = Field(0.05, description="Allowed delta in error rate before triggering rollback")


class RepairSettingsResponse(BaseModel):
    project_id: str
    github_repo: Optional[str]
    base_branch: str
    has_token: bool
    masked_token: str
    test_command: str
    auto_repair_enabled: bool
    auto_merge_enabled: bool
    regression_error_rate_threshold: float
    updated_at: str


class TriggerRepairPayload(BaseModel):
    sandbox_repo_dir: Optional[str] = Field(None, description="Optional local repository path for sandbox verification")


class SafetyCheckPayload(BaseModel):
    patch: str = Field(..., description="Unified diff patch content")
    target_files: Optional[list[str]] = Field(None, description="Optional explicit target file paths")


class SandboxTestPayload(BaseModel):
    repo_dir: str = Field(..., description="Absolute path to local git repository")
    patch: str = Field(..., description="Unified diff patch content")
    test_command: Optional[str] = Field("pytest", description="Test command to run")
    timeout_seconds: Optional[int] = Field(60, ge=5, le=300, description="Execution timeout limit")


class RollbackPayload(BaseModel):
    reason: Optional[str] = Field("Post-deployment regression detected", description="Reason for triggering rollback")


# ============================================================
# API Endpoints
# ============================================================

@router.get("/health")
async def repair_health_check() -> dict[str, str]:
    """Health check for L3 Automated Repair Engine."""
    return {
        "status": "HEALTHY",
        "service": "AuraTrace L3 Automated Repair Engine",
        "version": "1.0.0",
    }


@router.get("/projects/{project_id}/settings")
async def get_project_repair_settings(
    project_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve repair and deployment automation settings for a project."""
    try:
        p_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project UUID format.")

    res = await db.execute(select(RepairSettings).where(RepairSettings.project_id == p_uuid))
    settings = res.scalar_one_or_none()

    if not settings:
        return {
            "project_id": str(p_uuid),
            "github_repo": "",
            "base_branch": "main",
            "has_token": False,
            "masked_token": "",
            "test_command": "pytest",
            "auto_repair_enabled": False,
            "auto_merge_enabled": False,
            "regression_error_rate_threshold": 0.05,
            "updated_at": "",
        }

    raw_token = ""
    if settings.encrypted_github_token:
        try:
            raw_token = decrypt_secret(settings.encrypted_github_token)
        except Exception:
            raw_token = ""

    return {
        "project_id": str(p_uuid),
        "github_repo": settings.github_repo or "",
        "base_branch": settings.base_branch or "main",
        "has_token": bool(settings.encrypted_github_token),
        "masked_token": mask_token(raw_token),
        "test_command": settings.test_command or "pytest",
        "auto_repair_enabled": settings.auto_repair_enabled,
        "auto_merge_enabled": settings.auto_merge_enabled,
        "regression_error_rate_threshold": settings.regression_error_rate_threshold,
        "updated_at": settings.updated_at.isoformat() if settings.updated_at else "",
    }


@router.post("/projects/{project_id}/settings")
async def update_project_repair_settings(
    project_id: str,
    payload: RepairSettingsUpdatePayload,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Configure repository, token, test command, and automation policies for a project."""
    try:
        p_uuid = uuid.UUID(project_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid project UUID format.")

    res = await db.execute(select(RepairSettings).where(RepairSettings.project_id == p_uuid))
    settings = res.scalar_one_or_none()

    if not settings:
        settings = RepairSettings(project_id=p_uuid)
        db.add(settings)

    if payload.github_repo is not None:
        settings.github_repo = payload.github_repo.strip()
    if payload.base_branch is not None:
        settings.base_branch = payload.base_branch.strip() or "main"
    if payload.test_command is not None:
        settings.test_command = payload.test_command.strip() or "pytest"
    if payload.auto_repair_enabled is not None:
        settings.auto_repair_enabled = payload.auto_repair_enabled
    if payload.auto_merge_enabled is not None:
        settings.auto_merge_enabled = payload.auto_merge_enabled
    if payload.regression_error_rate_threshold is not None:
        settings.regression_error_rate_threshold = max(payload.regression_error_rate_threshold, 0.0)

    # Encrypt token if provided
    if payload.github_token:
        settings.encrypted_github_token = encrypt_secret(payload.github_token.strip())

    await db.commit()
    await db.refresh(settings)

    return {
        "status": "SUCCESS",
        "message": "Project repair settings updated successfully.",
        "project_id": str(p_uuid),
        "github_repo": settings.github_repo,
        "auto_repair_enabled": settings.auto_repair_enabled,
        "auto_merge_enabled": settings.auto_merge_enabled,
    }


@router.post("/safety-check")
async def check_patch_safety(payload: SafetyCheckPayload) -> dict[str, Any]:
    """Test unified diff against AuraTrace Safety Gate rules."""
    result = inspect_patch(payload.patch, payload.target_files)
    return {
        "allowed": result.allowed,
        "reasons": list(result.reasons),
        "target_files": list(result.target_files),
        "flagged_patterns": list(result.flagged_patterns),
    }


@router.post("/sandbox-test")
async def check_sandbox_execution(payload: SandboxTestPayload) -> dict[str, Any]:
    """Execute unified diff in isolated local sandbox repository."""
    result = await async_run_sandbox_test(
        repo_dir=payload.repo_dir,
        patch=payload.patch,
        test_command=payload.test_command or "pytest",
        timeout_seconds=payload.timeout_seconds or 60,
        isolated=True,
    )
    return result


@router.post("/trigger/{incident_id}")
async def trigger_automated_repair(
    incident_id: str,
    payload: Optional[TriggerRepairPayload] = None,
    background_tasks: BackgroundTasks = None,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Trigger the L3 Automated Repair pipeline for a diagnosed incident.
    Executes asynchronously in the background.
    """
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident UUID format.")

    res = await db.execute(select(Incident).where(Incident.id == inc_uuid))
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    if not incident.suggested_patch:
        raise HTTPException(
            status_code=400,
            detail="Incident does not have a diagnosed code patch yet. Run RAG diagnostic first.",
        )

    sandbox_dir = payload.sandbox_repo_dir if payload else None

    # Launch orchestrator in background task
    async def _run():
        await _orchestrator.execute_repair(inc_uuid, sandbox_repo_dir=sandbox_dir)

    asyncio.create_task(_run())

    return {
        "status": "ACCEPTED",
        "message": "L3 Automated Repair pipeline initiated in background.",
        "incident_id": str(inc_uuid),
    }


@router.get("/runs/{run_id}")
async def get_repair_run_status(
    run_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve current status, logs, and outputs of a specific repair run."""
    try:
        r_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run UUID format.")

    res = await db.execute(select(RepairRun).where(RepairRun.id == r_uuid))
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Repair run not found.")

    return {
        "id": str(run.id),
        "incident_id": str(run.incident_id),
        "project_id": str(run.project_id),
        "status": run.status,
        "branch_name": run.branch_name,
        "pr_number": run.pr_number,
        "pr_url": run.pr_url,
        "rollback_status": run.rollback_status,
        "safety_result": run.safety_result or {},
        "sandbox_result": run.sandbox_result or {},
        "ci_result": run.ci_result or {},
        "logs": run.logs or [],
        "error_message": run.error_message,
        "created_at": run.created_at.isoformat() if run.created_at else "",
        "updated_at": run.updated_at.isoformat() if run.updated_at else "",
    }


@router.get("/runs/incident/{incident_id}")
async def get_repair_runs_for_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """List all repair runs associated with a specific incident."""
    try:
        inc_uuid = uuid.UUID(incident_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid incident UUID format.")

    res = await db.execute(
        select(RepairRun)
        .where(RepairRun.incident_id == inc_uuid)
        .order_by(desc(RepairRun.created_at))
    )
    runs = res.scalars().all()

    return [
        {
            "id": str(r.id),
            "incident_id": str(r.incident_id),
            "status": r.status,
            "branch_name": r.branch_name,
            "pr_number": r.pr_number,
            "pr_url": r.pr_url,
            "rollback_status": r.rollback_status,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in runs
    ]


@router.post("/rollback/{run_id}")
async def trigger_manual_rollback(
    run_id: str,
    payload: RollbackPayload,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Trigger an automated rollback / revert PR for a previously merged repair run."""
    try:
        r_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run UUID format.")

    res = await db.execute(select(RepairRun).where(RepairRun.id == r_uuid))
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Repair run not found.")

    # Fetch settings
    set_res = await db.execute(select(RepairSettings).where(RepairSettings.project_id == run.project_id))
    settings = set_res.scalar_one_or_none()
    if not settings or not settings.encrypted_github_token or not settings.github_repo:
        raise HTTPException(status_code=400, detail="GitHub configuration missing for project.")

    token = decrypt_secret(settings.encrypted_github_token)
    gh = GitHubClient(token=token)
    reason = validate_rollback_reason(payload.reason or "Manual rollback requested")

    try:
        revert_pr = await gh.create_revert_pr(
            repo=settings.github_repo,
            base_branch=settings.base_branch or "main",
            commit_sha=run.branch_name or "main",
            reason=reason,
        )
        run.status = "ROLLED_BACK"
        run.rollback_status = "ROLLED_BACK"
        await db.commit()
        return {
            "status": "SUCCESS",
            "message": "Rollback PR created successfully.",
            "revert_pr_url": revert_pr.get("html_url"),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Rollback PR creation failed: {exc}")
