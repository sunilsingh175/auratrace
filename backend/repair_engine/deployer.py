"""
Trigger deployment webhook or automated deploy pipeline after merge.
"""
import logging
from typing import Dict, Any
import httpx

log = logging.getLogger("repair.deployer")


class Deployer:
    def __init__(self, project: dict):
        self.webhook_url = project.get("deploy_webhook") or project.get("deploy_webhook_url")
        self.provider = project.get("deploy_provider") or "webhook"

    async def trigger_deploy(self, commit_sha: str, incident_id: str) -> Dict[str, Any]:
        if not self.webhook_url:
            log.info("No deploy webhook configured for project %s — auto-deployment skipped.", incident_id[:8])
            return {"status": "skipped", "reason": "no_webhook_configured"}

        try:
            async with httpx.AsyncClient(timeout=25) as c:
                r = await c.post(self.webhook_url, json={
                    "source": "auratrace",
                    "event": "deployment_trigger",
                    "commit_sha": commit_sha,
                    "incident_id": incident_id,
                    "provider": self.provider,
                })
            success = r.status_code < 400
            log.info("Deployment webhook status: HTTP %d", r.status_code)
            return {
                "status": "triggered" if success else "failed",
                "http_status": r.status_code,
            }
        except Exception as e:
            log.warning("Deployment webhook delivery note: %s", e)
            return {"status": "failed", "error": str(e)}
