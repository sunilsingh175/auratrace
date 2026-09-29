"""
AuraTrace L3 Automated Repair Engine
Autonomous patch inspection, sandbox verification, GitHub PR automation, CI gating, and rollback guard.
"""

from backend.repair_engine.ci import wait_for_ci
from backend.repair_engine.crypto import (
    decrypt_secret,
    encrypt_secret,
    generate_encryption_key,
    mask_token,
)
from backend.repair_engine.github_client import GitHubClient
from backend.repair_engine.orchestrator import RepairOrchestrator
from backend.repair_engine.rollback import regression_detected, validate_rollback_reason
from backend.repair_engine.safety import PatchSafetyResult, inspect_patch
from backend.repair_engine.sandbox import async_run_sandbox_test, run_sandbox_test

__all__ = [
    "inspect_patch",
    "PatchSafetyResult",
    "run_sandbox_test",
    "async_run_sandbox_test",
    "GitHubClient",
    "RepairOrchestrator",
    "wait_for_ci",
    "regression_detected",
    "validate_rollback_reason",
    "encrypt_secret",
    "decrypt_secret",
    "generate_encryption_key",
    "mask_token",
]
