"""
Client-side & server-side secret scrubbing and incident signature hashing.
"""
import re
import hashlib
from typing import Any, Dict, List, Union


# Keys to redact entirely
SENSITIVE_KEYS = {
    "authorization", "auth", "token", "api_key", "apikey",
    "secret", "password", "passwd", "pwd", "session",
    "cookie", "jwt", "bearer", "private_key",
    "access_token", "refresh_token", "client_secret",
}

# Value patterns to redact
PATTERNS = [
    (re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', re.I), 'Bearer [REDACTED]'),
    (re.compile(r'eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+'), '[JWT_REDACTED]'),
    (re.compile(r'sk-[A-Za-z0-9]{20,}'), '[API_KEY_REDACTED]'),
    (re.compile(r'ghp_[A-Za-z0-9]{36}'), '[GITHUB_TOKEN_REDACTED]'),
    (re.compile(r'github_pat_[a-zA-Z0-9_]{82}'), '[GITHUB_PAT_REDACTED]'),
    (re.compile(r'AKIA[0-9A-Z]{16}'), '[AWS_KEY_REDACTED]'),
    (re.compile(r'-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----'), '-----BEGIN PRIVATE KEY-----\n***REDACTED***\n-----END PRIVATE KEY-----'),
]


def sanitize_string(text: str) -> str:
    """Redact common secrets inside a string."""
    if not isinstance(text, str):
        return str(text) if text is not None else ""
    for pattern, replacement in PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def sanitize_text(text: str) -> str:
    """Alias for sanitize_string."""
    return sanitize_string(text)


def sanitize_dict(data: Union[Dict, List, Any], depth: int = 0) -> Union[Dict, List, Any]:
    """Recursively sanitize a dict/list structure."""
    if depth > 10:
        return "[MAX_DEPTH]"

    if isinstance(data, dict):
        cleaned = {}
        for k, v in data.items():
            k_str = str(k).lower()
            if any(s in k_str for s in SENSITIVE_KEYS):
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = sanitize_dict(v, depth + 1)
        return cleaned
    elif isinstance(data, list):
        return [sanitize_dict(x, depth + 1) for x in data[:100]]
    elif isinstance(data, str):
        return sanitize_string(data)[:5000]
    return data


def error_signature(error_type: str, message: str, stack_trace: str = "") -> str:
    """Stable 16-char signature for incident deduplication."""
    err_type = (error_type or "UnknownError").strip()
    msg = (message or "").strip()
    frames = "\n".join(stack_trace.split("\n")[:5]) if stack_trace else ""
    content = f"{err_type}|{msg[:200]}|{frames}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]
