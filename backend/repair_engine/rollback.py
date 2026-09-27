from __future__ import annotations

import re


def regression_detected(*, baseline_error_rate: float, current_error_rate: float, threshold: float) -> bool:
    """Return true when post-deploy error rate exceeds the configured baseline delta."""
    if baseline_error_rate < 0 or current_error_rate < 0:
        return False
    return current_error_rate > baseline_error_rate + max(threshold, 0.0)


def validate_rollback_reason(reason: str) -> str:
    return re.sub(r"[^a-zA-Z0-9 .,:;_()/-]", "", reason).strip()[:500]
