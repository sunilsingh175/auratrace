"""
AuraTrace Python SDK Metadata & Environment Detection
"""

import os
import platform
import socket
import sys
from typing import Any, Dict


def get_runtime_info() -> Dict[str, Any]:
    """Capture host, Python runtime, and environment information."""
    return {
        "language": "python",
        "python_version": platform.python_version(),
        "python_implementation": platform.python_implementation(),
        "os_name": platform.system(),
        "os_release": platform.release(),
        "os_platform": platform.platform(),
        "hostname": socket.gethostname(),
        "pid": os.getpid(),
    }


def resolve_service_name(configured_name: str | None = None) -> str:
    """Resolve service identifier from configuration, environment, or process name."""
    if configured_name and configured_name.strip():
        return configured_name.strip()

    env_name = os.getenv("AURATRACE_SERVICE_NAME") or os.getenv("AURA_SERVICE_NAME")
    if env_name and env_name.strip():
        return env_name.strip()

    # Fallback to main script name if available
    try:
        if sys.argv and sys.argv[0]:
            base = os.path.basename(sys.argv[0]).replace(".py", "")
            if base and base != "-c":
                return base
    except Exception:
        pass

    return "python-service"


def resolve_environment(configured_env: str | None = None) -> str:
    """Resolve deployment environment from configuration or environment variable."""
    if configured_env and configured_env.strip():
        return configured_env.strip()
    return (
        os.getenv("AURATRACE_ENV")
        or os.getenv("ENVIRONMENT")
        or os.getenv("NODE_ENV")
        or "production"
    )


def resolve_api_key(configured_key: str | None = None) -> str:
    """Resolve project API key from configuration or environment."""
    if configured_key and configured_key.strip():
        return configured_key.strip()
    return (
        os.getenv("AURATRACE_API_KEY")
        or os.getenv("AURA_API_KEY")
        or os.getenv("AURA_PROJECT_KEY")
        or ""
    )


def resolve_endpoint(configured_endpoint: str | None = None) -> str:
    """Resolve AuraTrace Ingestion endpoint URL."""
    if configured_endpoint and configured_endpoint.strip():
        return configured_endpoint.rstrip("/")
    env_url = (
        os.getenv("AURATRACE_ENDPOINT")
        or os.getenv("AURA_ENDPOINT")
        or os.getenv("AURA_API_URL")
        or os.getenv("AURA_BACKEND_URL")
    )
    if env_url and env_url.strip():
        return env_url.rstrip("/")
    return "http://localhost:8000"
