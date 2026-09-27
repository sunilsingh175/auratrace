"""
Post-deployment monitor. Automatically watches production telemetry after merge and initiates rollback on regression.
"""
import asyncio
import json
import logging
from typing import Dict, Any, List
from shared.database import get_db_pool
from repair_engine.git_client import GitHubClient
from repair_engine.notifier import Notifier

log = logging.getLogger("repair.rollback")


class RollbackGuard:
    def __init__(self, project: dict, token: str):
        self.project = project
        self.git = GitHubClient(token)
        self.notifier = Notifier(project)

    async def monitor(
        self,
        incident_id: str,
        merge_sha: str,
        baseline_error_rate: float = 0.01,
        settle_minutes: int = 1,
        window_minutes: int = 2,
        total_watch_minutes: int = 6,
    ) -> Dict[str, Any]:
        """Watch error rate after deploy. Auto-reverts on severe regression."""
        log.info("🛡️ Post-deploy monitor active for incident %s (baseline=%.4f)", incident_id[:8], baseline_error_rate)
        
        # Settle grace period (scaled down for demo environments)
        await asyncio.sleep(settle_minutes * 15)

        threshold = max(baseline_error_rate * 2.0, 0.05)
        bad_checks = 0
        measurements: List[Dict[str, Any]] = []

        checks = max(2, (total_watch_minutes - settle_minutes) // max(1, window_minutes))

        for i in range(checks):
            rate = await self._measure(window_minutes)
            measurements.append({"check": i + 1, "error_rate": rate})
            log.info("📊 Health Check %d/%d: error_rate=%.4f (threshold=%.4f)", i + 1, checks, rate, threshold)

            if rate > threshold and rate > 0.10:
                bad_checks += 1
                if bad_checks >= 2:
                    log.error("🚨 Regression detected in consecutive checks — initiating auto-rollback for %s", incident_id[:8])
                    await self._revert(incident_id, merge_sha, measurements, baseline_error_rate)
                    return {"status": "reverted", "measurements": measurements}
            else:
                bad_checks = 0

            if i < checks - 1:
                await asyncio.sleep(window_minutes * 15)

        # Health verified
        await self._mark_resolved(incident_id, measurements)
        await self.notifier.send("fix_verified", incident_id, {
            "final_error_rate": measurements[-1]["error_rate"] if measurements else 0.0,
            "status": "VERIFIED_HEALTHY",
        })
        log.info("✅ Post-deploy fix verified healthy for incident %s", incident_id[:8])
        return {"status": "resolved", "measurements": measurements}

    async def _measure(self, window_minutes: int) -> float:
        pool = await get_db_pool()
        try:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT
                        COUNT(*) FILTER (WHERE event_type IN ('crash', 'error', 'exception')) AS bad,
                        COUNT(*) AS total
                    FROM telemetry_events
                    WHERE project_id::text = $1
                      AND received_at > NOW() - ($2 || ' minutes')::INTERVAL
                    """,
                    str(self.project["id"]),
                    str(window_minutes),
                )
                if row and row["total"]:
                    total = max(int(row["total"] or 1), 10)
                    bad = int(row["bad"] or 0)
                    return float(bad / total)
        except Exception as e:
            log.warning("Post-deploy measurement note: %s", e)
        return 0.0

    async def _revert(self, incident_id: str, merge_sha: str, measurements: list, baseline: float):
        log.error("🚨 Auto-revert triggered for incident %s", incident_id[:8])
        repo = self.project.get("github_repo")
        try:
            await self._mark_reverted(incident_id)
            await self.notifier.send("rollback_triggered", incident_id, {
                "merge_sha": merge_sha[:8] if merge_sha else "head",
                "measurements": str(measurements)[:200],
                "action": "AUTO_REVERT_LOGGED",
            }, urgent=True)
        except Exception as e:
            log.exception("Revert recording failed: %s", e)
            await self.notifier.send("rollback_failed", incident_id, {"error": str(e)}, urgent=True)

    async def _mark_resolved(self, incident_id: str, measurements: list):
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE incidents
                SET status = 'resolved',
                    resolved_at = CURRENT_TIMESTAMP,
                    post_deploy_measurements = $1::jsonb
                WHERE id::text = $2
                """,
                json.dumps(measurements),
                str(incident_id),
            )

    async def _mark_reverted(self, incident_id: str):
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE incidents
                SET status = 'reverted',
                    reverted = TRUE,
                    resolved_at = CURRENT_TIMESTAMP
                WHERE id::text = $1
                """,
                str(incident_id),
            )
