"""
Client-side secret scrubbing — happens BEFORE sending over the wire.
"""
import re

SENSITIVE_KEYS = {
    "authorization", "auth", "token", "api_key", "apikey",
    "secret", "password", "passwd", "pwd", "session",
    "cookie", "jwt", "bearer", "private_key",
    "access_token", "refresh_token", "client_secret",
}

PATTERNS = [
    (re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.I), "Bearer [REDACTED]"),
    (re.compile(r"eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+"), "[JWT_REDACTED]"),
    (re.compile(r"sk-[A-Za-z0-9]{20,}"), "[API_KEY_REDACTED]"),
    (re.compile(r"ghp_[A-Za-z0-9]{36}"), "[GITHUB_TOKEN_REDACTED]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[AWS_KEY_REDACTED]"),
]


def sanitize_string(text: str) -> str:
    if not isinstance(text, str):
        return text
    for pat, rep in PATTERNS:
        text = pat.sub(rep, text)
    return text


def sanitize(data, depth: int = 0):
    """Recursively sanitize dicts/lists/strings."""
    if depth > 8:
        return "[MAX_DEPTH]"
    if isinstance(data, dict):
        return {
            k: "[REDACTED]" if k.lower() in SENSITIVE_KEYS
               else sanitize(v, depth + 1)
            for k, v in data.items()
        }
    if isinstance(data, (list, tuple)):
        return [sanitize(x, depth + 1) for x in list(data)[:50]]
    if isinstance(data, str):
        return sanitize_string(data)[:8000]
    if isinstance(data, (int, float, bool)) or data is None:
        return data
    # Fallback: stringify and sanitize
    return sanitize_string(str(data))[:2000]
