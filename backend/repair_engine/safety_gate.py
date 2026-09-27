"""
Final safety gate — decides whether auto-merge is permitted.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any

SENSITIVE_PATHS = [
    "auth/", "authentication/", "authorization/",
    "payment", "billing", "checkout", "wallet",
    "security/", "crypto", "encryption",
    "admin/", "sudo", "privilege",
    "secret", "credential", "password",
    "infra/", "terraform/", "k8s/", "kubernetes/",
    ".github/workflows/",
    "Dockerfile", "docker-compose",
    "package.json", "requirements.txt", "Gemfile", "go.mod", "Cargo.toml",
]


@dataclass
class SafetyDecision:
    allowed: bool
    reason: str = ""
    warnings: List[str] = field(default_factory=list)


class SafetyGate:
    def __init__(self, project: dict):
        self.project = project
        self.min_confidence = float(project.get("min_fix_confidence") or 0.70)
        self.max_files = int(project.get("max_files_per_fix") or 5)

    def evaluate(
        self,
        patch: str,
        confidence: float,
        test_result: Dict[str, Any],
        ci_result: Dict[str, Any],
        files: List[str],
    ) -> SafetyDecision:
        warnings = []

        # 1. Confidence threshold
        if confidence < self.min_confidence:
            return SafetyDecision(
                allowed=False,
                reason=f"Confidence {confidence:.2f} is below required threshold ({self.min_confidence:.2f})",
            )

        # 2. Local sandbox tests
        if test_result.get("status") not in ("passed", "no_tests"):
            return SafetyDecision(
                allowed=False,
                reason=f"Local sandbox tests did not pass: {test_result.get('status')}",
            )

        # 3. Remote CI checks
        if ci_result.get("status") == "failure":
            return SafetyDecision(
                allowed=False,
                reason=f"Remote CI checks failed: {ci_result.get('failed')}",
            )

        # 4. File count limits
        if len(files) > self.max_files:
            return SafetyDecision(
                allowed=False,
                reason=f"Too many files changed ({len(files)} > {self.max_files})",
            )

        # 5. Sensitive path blocklist
        blocked = []
        for f in files:
            fl = f.lower()
            for s in SENSITIVE_PATHS:
                if s in fl:
                    blocked.append(f)
                    break

        if blocked:
            return SafetyDecision(
                allowed=False,
                reason=f"Patch touches restricted sensitive path(s): {', '.join(blocked)}",
            )

        if confidence < 0.85:
            warnings.append(f"Confidence score {confidence:.2f} is moderate")

        if len(files) >= 3:
            warnings.append(f"{len(files)} files modified in single patch")

        return SafetyDecision(allowed=True, warnings=warnings)
