"""
Slack / Discord / generic webhook notifications for AuraTrace Autonomous Repairs.
"""
import asyncio
import logging
import os
from typing import Dict, Any
import httpx

log = logging.getLogger("repair.notify")


class Notifier:
    def __init__(self, project: dict):
        self.project = project
        self.slack_url = (
            project.get("slack_webhook_url")
            or os.getenv("SLACK_WEBHOOK_URL")
        )
        self.discord_url = (
            project.get("discord_webhook_url")
            or os.getenv("DISCORD_WEBHOOK_URL")
        )
        self.generic_url = project.get("notify_webhook_url")

    async def send(self, event: str, incident_id: str, data: Dict[str, Any], urgent: bool = False):
        emoji = {
            "pr_created": "📬",
            "auto_merged": "🚀",
            "deploy_triggered": "🌐",
            "fix_verified": "✅",
            "rollback_triggered": "↩️",
            "rollback_failed": "🚨",
            "reverted": "↩️",
        }.get(event, "ℹ️")

        title = {
            "pr_created": "AuraTrace: Pull Request Created",
            "auto_merged": "AuraTrace: Fix Auto-Merged",
            "deploy_triggered": "AuraTrace: Deployment Triggered",
            "fix_verified": "AuraTrace: Fix Verified in Production",
            "rollback_triggered": "AuraTrace: Auto-Revert Triggered",
            "rollback_failed": "AuraTrace: Rollback Failed",
        }.get(event, event)

        text = f"{emoji} *{title}*\nIncident: `{str(incident_id)[:8]}`"
        for k, v in data.items():
            text += f"\n• *{k}*: `{str(v)[:250]}`"

        tasks = []
        if self.slack_url:
            tasks.append(self._post_slack({"text": text}))
        if self.discord_url:
            tasks.append(self._post_discord({"content": text}))
        if self.generic_url:
            tasks.append(self._post_generic(event, incident_id, data))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _post_slack(self, payload: dict):
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                await c.post(self.slack_url, json=payload)
        except Exception as e:
            log.warning("Slack notify note: %s", e)

    async def _post_discord(self, payload: dict):
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                await c.post(self.discord_url, json=payload)
        except Exception as e:
            log.warning("Discord notify note: %s", e)

    async def _post_generic(self, event: str, incident_id: str, data: dict):
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                await c.post(self.generic_url, json={
                    "event": event,
                    "incident_id": incident_id,
                    "data": data,
                })
        except Exception as e:
            log.warning("Generic webhook notify note: %s", e)
