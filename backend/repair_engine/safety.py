"""
Safety Gate module for AuraTrace L3 Automated Repair Engine.
Inspects unified diff patches, restricts sensitive file modifications,
prevents path traversal attacks, and detects dangerous command injection patterns.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from typing import Optional, Sequence


@dataclass(frozen=True)
class PatchSafetyResult:
    """Represents the outcome of a patch safety inspection."""
    allowed: bool
    reasons: tuple[str, ...] = field(default_factory=tuple)
    target_files: tuple[str, ...] = field(default_factory=tuple)
    flagged_patterns: tuple[str, ...] = field(default_factory=tuple)

    def __bool__(self) -> bool:
        return self.allowed


# Blocked exact file names (case-insensitive)
RESTRICTED_FILENAMES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.staging",
    ".env.development",
    ".env.test",
    "id_rsa",
    "id_dsa",
    "id_ed25519",
    "id_ecdsa",
    "authorized_keys",
    "known_hosts",
    "passwd",
    "shadow",
    "sudoers",
    "credentials.json",
    "service_account.json",
}

# Blocked extensions
RESTRICTED_EXTENSIONS = {
    ".pem",
    ".key",
    ".pfx",
    ".p12",
    ".crt",
    ".cer",
    ".der",
    ".kdbx",
    ".sqlite",
    ".sqlite3",
    ".dump",
}

# Blocked path prefixes / directories
RESTRICTED_DIRECTORIES = (
    ".git/",
    ".git\\",
    ".ssh/",
    ".ssh\\",
    "/etc/",
    "/proc/",
    "/sys/",
    "/dev/",
    "/root/",
    "~/.ssh",
    "~/.aws",
    "c:\\windows",
    "c:/windows",
)

# Dangerous regex patterns in added diff lines
DANGEROUS_PATTERNS = [
    (re.compile(r"rm\s+-rf\s+[/~]", re.IGNORECASE), "Destructive filesystem deletion (rm -rf /)"),
    (re.compile(r"mkfs(\.[a-z0-9]+)?\s+", re.IGNORECASE), "Filesystem format command (mkfs)"),
    (re.compile(r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:", re.IGNORECASE), "Fork bomb sequence"),
    (re.compile(r"(curl|wget)\s+[^\n|;]+\|\s*(sh|bash|zsh)", re.IGNORECASE), "Piped remote execution (curl | sh)"),
    (re.compile(r"nc\s+.*-e\s+/bin/(bash|sh)", re.IGNORECASE), "Netcat reverse shell execution"),
    (re.compile(r"powershell(\.exe)?\s+.*-ExecutionPolicy\s+Bypass", re.IGNORECASE), "PowerShell execution policy bypass"),
    (re.compile(r"os\.system\s*\(", re.IGNORECASE), "Raw unescaped shell execution (os.system)"),
    (re.compile(r"subprocess\.(Popen|call|run|check_call|check_output)\s*\([^)]*shell\s*=\s*True", re.IGNORECASE), "Subprocess with shell=True"),
    (re.compile(r"\b(eval|exec)\s*\([^)]+\)", re.IGNORECASE), "Dynamic code execution (eval/exec)"),
]


def extract_files_from_patch(patch: str) -> list[str]:
    """Extract modified target file paths from a unified diff patch string."""
    files: list[str] = []
    for line in patch.splitlines():
        # Check diff --git a/path b/path
        git_match = re.match(r"^diff\s+--git\s+a/(.+?)\s+b/(.+)$", line)
        if git_match:
            f = git_match.group(2).strip()
            if f not in files:
                files.append(f)
            continue

        # Check +++ b/path
        plus_match = re.match(r"^\+\+\+\s+(?:b/)?(.+)$", line)
        if plus_match:
            f = plus_match.group(1).strip()
            if f != "/dev/null" and f not in files:
                files.append(f)
    return files


def inspect_file_path(path: str) -> list[str]:
    """Validate a single target file path against safety gate constraints."""
    reasons: list[str] = []
    normalized = path.replace("\\", "/").strip()

    # Check for empty path
    if not normalized:
        reasons.append("Empty file path encountered.")
        return reasons

    # Path traversal check
    if ".." in normalized.split("/"):
        reasons.append(f"Path traversal ('..') detected in path: {path}")

    # Absolute path check (Unix & Windows)
    if normalized.startswith("/") or re.match(r"^[a-zA-Z]:", normalized):
        reasons.append(f"Absolute file path is not allowed: {path}")

    # Base filename check
    filename = os.path.basename(normalized).lower()
    if filename in RESTRICTED_FILENAMES:
        reasons.append(f"Modification of sensitive file '{filename}' is blocked by Safety Gate.")

    # Extension check
    ext = os.path.splitext(filename)[1].lower()
    if ext in RESTRICTED_EXTENSIONS:
        reasons.append(f"Modification of files with extension '{ext}' is blocked: {path}")

    # Directory prefix check
    for prefix in RESTRICTED_DIRECTORIES:
        if normalized.lower().startswith(prefix.lower()):
            reasons.append(f"Modification of directory '{prefix}' is blocked by Safety Gate: {path}")

    return reasons


def inspect_patch(patch: str, target_files: Optional[Sequence[str]] = None) -> PatchSafetyResult:
    """
    Inspect a unified diff patch against AuraTrace Safety Gate rules.
    Validates file paths, extensions, path traversal, and dangerous command additions.
    """
    reasons: list[str] = []
    flagged: list[str] = []

    # 1. Extract target files if not explicitly provided
    extracted = extract_files_from_patch(patch)
    all_files = list(target_files) if target_files is not None else extracted

    if not all_files and not patch.strip():
        return PatchSafetyResult(
            allowed=False,
            reasons=("Empty patch provided.",),
            target_files=(),
            flagged_patterns=(),
        )

    # 2. Inspect all file paths
    for f in all_files:
        file_reasons = inspect_file_path(f)
        reasons.extend(file_reasons)

    # 3. Inspect added lines in diff for dangerous patterns
    added_lines = [line[1:] for line in patch.splitlines() if line.startswith("+") and not line.startswith("+++")]
    added_code = "\n".join(added_lines)

    for pattern, desc in DANGEROUS_PATTERNS:
        if pattern.search(added_code):
            flagged.append(desc)
            reasons.append(f"Safety Gate detected restricted pattern in patch additions: {desc}")

    allowed = len(reasons) == 0
    return PatchSafetyResult(
        allowed=allowed,
        reasons=tuple(reasons),
        target_files=tuple(all_files),
        flagged_patterns=tuple(flagged),
    )
