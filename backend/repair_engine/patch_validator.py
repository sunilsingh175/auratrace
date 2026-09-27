"""
Validates a unified diff patch before it reaches the sandbox.
Blocks destructive operations and syntax errors.
"""
import re
from typing import List, Tuple

# Forbidden patterns — never allow these in a patch
FORBIDDEN_PATTERNS = [
    (r"rm\s+-rf\s+/", "rm -rf / (destructive)"),
    (r"DROP\s+(TABLE|DATABASE)", "DROP TABLE/DATABASE"),
    (r"DELETE\s+FROM\s+\w+\s*;", "unqualified DELETE"),
    (r"TRUNCATE\s+TABLE", "TRUNCATE TABLE"),
    (r"eval\s*\(", "eval()"),
    (r"exec\s*\(", "exec()"),
    (r"os\.system\s*\(", "os.system()"),
    (r"subprocess\.[a-z_]*\(.*shell\s*=\s*True", "shell=True"),
    (r"child_process\.exec\(", "child_process.exec()"),
    (r"__import__\s*\(", "__import__()"),
    (r"chmod\s+777", "chmod 777"),
    (r"\.env\b", "touching .env file"),
]


def extract_files(patch: str) -> List[str]:
    """Extract file paths from a unified diff."""
    files = []
    if not patch:
        return files
    for line in patch.split("\n"):
        m = re.match(r"^\+\+\+ [b/]*(.+)$", line)
        if m and m.group(1).strip() != "/dev/null":
            clean_path = m.group(1).strip().lstrip("b/").lstrip("/")
            if clean_path and clean_path not in files:
                files.append(clean_path)
        m2 = re.match(r"^--- [a/]*(.+)$", line)
        if m2 and m2.group(1).strip() != "/dev/null":
            clean_path2 = m2.group(1).strip().lstrip("a/").lstrip("/")
            if clean_path2 and clean_path2 not in files:
                files.append(clean_path2)
    return files


def validate_patch(patch: str) -> Tuple[bool, str]:
    """
    Validate a unified diff.
    Returns: (is_valid, reason)
    """
    if not patch or not patch.strip():
        return False, "Empty patch"

    if patch.strip() == "NO_PATCH_AVAILABLE":
        return False, "No patch available"

    if len(patch) < 20:
        return False, "Patch too short"

    if len(patch) > 50_000:
        return False, "Patch too large (>50KB)"

    # Check forbidden destructive patterns
    for pattern, label in FORBIDDEN_PATTERNS:
        if re.search(pattern, patch, re.I | re.MULTILINE):
            return False, f"Forbidden pattern: {label}"

    # Extract files
    files = extract_files(patch)
    if not files and not ("---" in patch or "+++" in patch):
        return False, "No diff headers found in patch"

    if len(files) > 5:
        return False, f"Too many files touched ({len(files)} > 5)"

    return True, "OK"
