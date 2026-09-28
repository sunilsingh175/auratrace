"""
Post-deployment telemetry health evaluation and automated rollback guard for AuraTrace L3.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.shared.database import TelemetryLog, Incident


def regression_detected(*, baseline_error_rate: float, current_error_rate: float, threshold: float) -> bool:
    """Return true when post-deploy error rate exceeds the configured baseline delta."""
    if baseline_error_rate < 0 or current_error_rate < 0:
        return False
    return current_error_rate > (baseline_error_rate + max(threshold, 0.0))


def validate_rollback_reason(reason: str) -> str:
    """Sanitize rollback reason strings to prevent header/log injection."""
    return re.sub(r"[^a-zA-Z0-9 .,:;_()/-]", "", reason).strip()[:500]


async def calculate_window_error_rate(
    session: AsyncSession,
    project_id: Optional[Any] = None,
    service_id: Optional[Any] = None,
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
) -> float:
    """
    Computes the empirical error rate (error_events / total_events)
    over a specified telemetry window.
    """
    if not end_time:
        end_time = datetime.now(timezone.utc)
    if not start_time:
        start_time = end_time - timedelta(minutes=15)

    try:
        # Query total events in window
        q_total = select(func.count(TelemetryLog.id)).where(
            TelemetryLog.created_at >= start_time,
            TelemetryLog.created_at <= end_time,
        )
        if project_id:
            q_total = q_total.where(TelemetryLog.project_id == project_id)
        if service_id:
            q_total = q_total.where(TelemetryLog.service_id == service_id)

        res_total = await session.execute(q_total)
        total_count = res_total.scalar() or 0

        if total_count == 0:
            return 0.0

        # Query error-level events in window
        q_errors = q_total.where(
            TelemetryLog.level.in_(["ERROR", "CRITICAL", "FATAL"])
        )
        res_errors = await session.execute(q_errors)
        error_count = res_errors.scalar() or 0

        return round(float(error_count) / float(total_count), 4)
    except Exception:
        return 0.0


async def check_incident_recurrence(
    session: AsyncSession,
    service_id: Optional[Any] = None,
    error_type: Optional[str] = None,
    after_time: Optional[datetime] = None,
) -> bool:
    """
    Checks whether the identical error/incident type reoccurred post-deployment.
    """
    if not service_id or not error_type or not after_time:
        return False

    try:
        q = select(func.count(Incident.id)).where(
            Incident.service_id == service_id,
            Incident.error_type == error_type,
            Incident.created_at >= after_time,
        )
        res = await session.execute(q)
        count = res.scalar() or 0
        return count > 0
    except Exception:
        return False
