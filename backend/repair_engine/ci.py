from __future__ import annotations

import asyncio
from typing import Any
from .github_client import GitHubClient


async def wait_for_ci(
    client: GitHubClient,
    repo: str,
    ref: str,
    timeout_seconds: int = 180,
    poll_seconds: int = 5,
    no_ci_grace_seconds: int = 15,
) -> dict[str, Any]:
    """Wait until GitHub check-runs for a repair commit reach a terminal state."""
    elapsed = 0
    while elapsed < timeout_seconds:
        payload = await client.get_check_runs(repo, ref)
        runs = payload.get("check_runs", [])
        if runs:
            if all(r.get("status") == "completed" for r in runs):
                conclusions = [r.get("conclusion") for r in runs]
                return {
                    "status": "PASSED" if all(c in ("success", "neutral", "skipped") for c in conclusions) else "FAILED",
                    "runs": runs,
                }
        elif elapsed >= no_ci_grace_seconds:
            # No CI check-runs configured for this branch/repository
            return {"status": "PASSED", "message": "No CI check-runs registered for branch.", "runs": []}

        await asyncio.sleep(poll_seconds)
        elapsed += poll_seconds

    return {"status": "TIMEOUT", "runs": []}
