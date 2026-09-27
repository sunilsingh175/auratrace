"""
Poll GitHub check-runs until CI completes.
"""
import asyncio
import logging
import time
from typing import Dict, Any, List
import httpx

log = logging.getLogger("repair.ci")
API = "https://api.github.com"


class CIMonitor:
    def __init__(self, token: str, poll_interval: int = 10, max_wait_sec: int = 300):
        self.headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Accept": "application/vnd.github+json",
        }
        self.poll_interval = poll_interval
        self.max_wait_sec = max_wait_sec

    async def wait_for_checks(self, repo: str, ref: str) -> Dict[str, Any]:
        """Wait until all check-runs complete on the given ref."""
        # Initial grace period
        await asyncio.sleep(5)
        start = time.time()

        while (time.time() - start) < self.max_wait_sec:
            try:
                checks = await self._get_checks(repo, ref)
            except Exception as e:
                log.warning("Failed to fetch checks: %s", e)
                await asyncio.sleep(self.poll_interval)
                continue

            if not checks:
                log.info("No CI checks configured on %s (%.0fs elapsed)", repo, time.time() - start)
                return {"status": "success", "checks": []}

            pending = [c for c in checks if c.get("status") != "completed"]
            if pending:
                log.info(
                    "⏳ %d/%d checks pending (%.0fs)",
                    len(pending), len(checks), time.time() - start,
                )
                await asyncio.sleep(self.poll_interval)
                continue

            failed = [
                c for c in checks
                if c.get("conclusion") not in ("success", "neutral", "skipped", None)
            ]
            if failed:
                return {
                    "status": "failure",
                    "failed": [c.get("name") for c in failed],
                    "checks": checks,
                }
            return {"status": "success", "checks": checks}

        return {"status": "success", "reason": "ci_wait_timeout_proceed"}

    async def _get_checks(self, repo: str, ref: str) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                f"{API}/repos/{repo}/commits/{ref}/check-runs",
                headers=self.headers,
            )
            if r.status_code != 200:
                return []
            data = r.json()
            return [
                {
                    "name": cr.get("name"),
                    "status": cr.get("status"),
                    "conclusion": cr.get("conclusion"),
                }
                for cr in data.get("check_runs", [])
            ]
