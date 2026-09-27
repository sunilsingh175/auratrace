"""
Auto-detect runtime info (language, version, framework, hostname).
"""
import os
import platform
import socket
import sys


def _detect_framework() -> str | None:
    """Return the name of a detected web framework, if any."""
    if "fastapi" in sys.modules:
        return "fastapi"
    if "flask" in sys.modules:
        return "flask"
    if "django" in sys.modules:
        return "django"
    if "starlette" in sys.modules:
        return "starlette"
    return None


def _detect_framework_version(name: str | None) -> str | None:
    if not name:
        return None
    try:
        import importlib.metadata as md
        return md.version(name)
    except Exception:
        return None


def detect_runtime() -> dict:
    """Build runtime metadata dict."""
    framework = _detect_framework()
    return {
        "language": "python",
        "version": platform.python_version(),
        "framework": framework,
        "framework_version": _detect_framework_version(framework),
        "platform": platform.system(),
        "hostname": socket.gethostname(),
        "pid": os.getpid(),
    }


def detect_service_name() -> str:
    """Best-effort service name from env or cwd."""
    for key in ("AURATRACE_SERVICE", "SERVICE_NAME", "APP_NAME"):
        v = os.getenv(key)
        if v:
            return v
    return os.path.basename(os.getcwd()) or "python-app"


def detect_environment() -> str:
    for key in ("AURATRACE_ENV", "ENVIRONMENT", "ENV", "APP_ENV"):
        v = os.getenv(key)
        if v:
            return v
    return "production"
