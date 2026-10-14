"""
AuraTrace Embedded Autonomous Diagnostics & Self-Healing Engine.
Executes crash telemetry analysis, local RAG retrieval, AI diagnosis,
Safety Gate inspection, and patch verification directly in the host process
without requiring any remote backend services.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
import re
import traceback
import uuid
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

from .safety import PatchSafetyResult, inspect_patch
from .sandbox import run_sandbox_test

logger = logging.getLogger("auratrace.engine")


@dataclass
class SimilarHistoricalMatch:
    title: str
    error_type: str
    similarity_score: float
    recommended_fix: str


@dataclass
class DiagnosticReport:
    incident_id: str
    timestamp: str
    service_name: str
    error_type: str
    error_message: str
    failing_file: Optional[str]
    failing_line: Optional[int]
    anomaly_score: float
    severity: str
    root_cause: str
    suggested_patch: str
    similar_cases: List[Dict[str, Any]]
    safety_allowed: bool
    safety_reasons: List[str]
    sandbox_status: Optional[str] = None
    applied_patch: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ==============================================================================
# Embedded Knowledge Base for Offline Semantic Matching
# ==============================================================================

KNOWLEDGE_BASE = [
    {
        "error_type": "KeyError",
        "pattern": r"KeyError",
        "title": "Missing Dictionary Key Access",
        "root_cause": (
            "Application attempted direct dictionary subscript access for a key that does not exist in the payload. "
            "Unchecked nested lookups fail when optional keys are absent or omitted by callers."
        ),
        "fix_strategy": "Use dict.get(key, default) or verify key existence before subscripting.",
        "patch_template": "safe_get",
    },
    {
        "error_type": "AttributeError",
        "pattern": r"NoneType.*has no attribute|has no attribute",
        "title": "Null-Pointer / Missing Attribute Dereference",
        "root_cause": (
            "Attempted to access an attribute or method on a variable evaluated as None. "
            "Occurs when an upstream database query, cache fetch, or API call returns None instead of an expected model."
        ),
        "fix_strategy": "Insert null check 'if obj is not None:' or optional chaining fallback '(obj or {}).get(...)'.",
        "patch_template": "null_guard",
    },
    {
        "error_type": "ConnectionRefusedError",
        "pattern": r"Connection refused|ConnectionRefusedError|redis|psycopg2|database",
        "title": "Downstream Service / Broker Connection Failure",
        "root_cause": (
            "Target network socket, Redis broker, or database host refused connection. "
            "Could indicate transient network partition, cold restart, or unavailable daemon port."
        ),
        "fix_strategy": "Implement exponential backoff retry mechanism with circuit-breaker fallback.",
        "patch_template": "retry_fallback",
    },
    {
        "error_type": "ZeroDivisionError",
        "pattern": r"division by zero",
        "title": "Arithmetic Division by Zero",
        "root_cause": (
            "Mathematical computation divided by a denominator variable that evaluated to 0. "
            "Common in latency, rate, or percentage calculations during periods of zero traffic."
        ),
        "fix_strategy": "Guard divisor with conditional check 'denominator if denominator else 1' or default to 0.0.",
        "patch_template": "divisor_guard",
    },
    {
        "error_type": "TypeError",
        "pattern": r"unsupported operand|object is not callable|argument must be",
        "title": "Type Mismatch or Incompatible Invocation",
        "root_cause": (
            "Operation invoked with operand types that do not support the target method, or callable expected but non-callable supplied."
        ),
        "fix_strategy": "Add explicit type coercion or validate argument types prior to processing.",
        "patch_template": "type_check",
    },
    {
        "error_type": "IndexError",
        "pattern": r"list index out of range|tuple index out of range",
        "title": "Sequence Subscript Index Out of Range",
        "root_cause": (
            "Attempted to access element at index >= len(sequence) on an empty or undersized list/tuple."
        ),
        "fix_strategy": "Check sequence length with 'if len(items) > index:' before direct subscripting.",
        "patch_template": "bounds_check",
    },
]


class EmbeddedDiagnosticEngine:
    """Self-contained intelligence engine executing local crash triage & repair."""

    def __init__(self, service_name: str = "embedded-service"):
        self.service_name = service_name
        self.error_history: List[Dict[str, Any]] = []

    def evaluate_crash(
        self,
        exception: BaseException,
        stack_trace: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None,
        auto_sandbox: bool = False,
    ) -> DiagnosticReport:
        """Analyze an unhandled crash, query local RAG, synthesize patch, and inspect safety."""
        incident_id = f"inc_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        err_type = type(exception).__name__
        err_msg = str(exception)

        if not stack_trace:
            tb_lines = traceback.format_exception(type(exception), exception, exception.__traceback__)
            stack_trace = "".join(tb_lines)

        # 1. Parse failing frame
        failing_file, failing_line, failing_code = self._extract_failing_frame(exception)

        # 2. Local Anomaly Scoring
        anomaly_score = self._compute_local_anomaly_score(err_type)
        severity = "CRITICAL" if anomaly_score >= 0.85 else "HIGH"

        # 3. Local RAG Retrieval
        root_cause, fix_strategy, similar_matches = self._match_historical_knowledge(err_type, err_msg)

        # 4. Synthesize Code Patch
        patch = self._generate_patch(
            failing_file=failing_file,
            failing_line=failing_line,
            failing_code=failing_code,
            err_type=err_type,
            err_msg=err_msg,
        )

        # 5. Safety Gate Inspection
        safety_result: PatchSafetyResult = inspect_patch(patch)

        # 6. Optional Sandbox Verification
        sandbox_status = None
        if auto_sandbox and safety_result.allowed and failing_file:
            repo_root = os.getcwd()
            sb_res = run_sandbox_test(repo_root, patch, test_command="pytest", isolated=True)
            sandbox_status = sb_res.get("status")

        report = DiagnosticReport(
            incident_id=incident_id,
            timestamp=now_iso,
            service_name=self.service_name,
            error_type=err_type,
            error_message=err_msg,
            failing_file=failing_file,
            failing_line=failing_line,
            anomaly_score=anomaly_score,
            severity=severity,
            root_cause=root_cause,
            suggested_patch=patch,
            similar_cases=similar_matches,
            safety_allowed=safety_result.allowed,
            safety_reasons=list(safety_result.reasons),
            sandbox_status=sandbox_status,
        )

        self._persist_and_display_report(report)
        return report

    def _extract_failing_frame(self, exception: BaseException) -> tuple[Optional[str], Optional[int], Optional[str]]:
        tb = exception.__traceback__
        if not tb:
            return None, None, None

        frames = traceback.extract_tb(tb)
        # Find the last frame that is within user project code (not in standard library or site-packages)
        project_frame = None
        for frame in reversed(frames):
            if "site-packages" not in frame.filename and "lib" not in frame.filename.lower():
                project_frame = frame
                break

        if not project_frame and frames:
            project_frame = frames[-1]

        if project_frame:
            # Normalize path relative to current working directory if possible
            try:
                rel_path = os.path.relpath(project_frame.filename, os.getcwd())
            except ValueError:
                rel_path = project_frame.filename
            return rel_path, project_frame.lineno, project_frame.line

        return None, None, None

    def _compute_local_anomaly_score(self, err_type: str) -> float:
        critical_types = {"ConnectionRefusedError", "MemoryError", "SystemError", "ZeroDivisionError"}
        high_types = {"KeyError", "AttributeError", "TypeError", "IndexError"}
        base = 0.90 if err_type in critical_types else (0.78 if err_type in high_types else 0.70)
        self.error_history.append({"type": err_type, "time": datetime.datetime.now()})
        recent_count = len(self.error_history[-10:])
        score = min(0.99, base + (recent_count * 0.01))
        return round(score, 2)

    def _match_historical_knowledge(self, err_type: str, err_msg: str) -> tuple[str, str, List[Dict[str, Any]]]:
        matches: List[Dict[str, Any]] = []
        best_cause = (
            f"Unhandled exception '{err_type}' intercepted in runtime execution loop. "
            f"Stack frame terminated unexpectedly."
        )
        best_fix = "Wrap operation in localized error handler or add defensive parameter validation."

        combined_text = f"{err_type} {err_msg}".lower()

        for item in KNOWLEDGE_BASE:
            score = 0.0
            if item["error_type"].lower() == err_type.lower():
                score = 0.95
            elif re.search(item["pattern"], combined_text, re.IGNORECASE):
                score = 0.85

            if score > 0:
                matches.append({
                    "title": item["title"],
                    "error_type": item["error_type"],
                    "similarity_score": score,
                    "recommended_fix": item["fix_strategy"],
                })

        if matches:
            matches.sort(key=lambda m: m["similarity_score"], reverse=True)
            top = matches[0]
            # Find the original record
            rec = next((k for k in KNOWLEDGE_BASE if k["title"] == top["title"]), None)
            if rec:
                best_cause = rec["root_cause"]
                best_fix = rec["fix_strategy"]

        return best_cause, best_fix, matches[:3]

    def _generate_patch(
        self,
        failing_file: Optional[str],
        failing_line: Optional[int],
        failing_code: Optional[str],
        err_type: str,
        err_msg: str,
    ) -> str:
        """Synthesize unified diff patch for the failing source code line."""
        target_file = (failing_file or "app.py").replace("\\", "/")
        line_num = failing_line or 1
        orig_line = (failing_code or "result = data['name']").strip()

        # Heuristic patch transformations based on error type
        repaired_line = orig_line
        if err_type == "KeyError":
            # e.g., data['key'] -> (data or {}).get('key')
            key_match = re.search(r"(\w+)\[(['\"])(.*?)\2\]", orig_line)
            if key_match:
                dict_var, quote, key_name = key_match.groups()
                repaired_line = orig_line.replace(
                    f"{dict_var}[{quote}{key_name}{quote}]",
                    f"({dict_var} or {{}}).get({quote}{key_name}{quote})"
                )
            else:
                repaired_line = f"# Guarded access\n    try:\n        {orig_line}\n    except KeyError:\n        return None"
        elif err_type == "AttributeError":
            # e.g. obj.attr -> (obj.attr if obj is not None else None)
            repaired_line = f"({orig_line} if {orig_line.split('.')[0]} is not None else None)"
        elif err_type == "ZeroDivisionError":
            # e.g., a / b -> a / (b or 1)
            repaired_line = re.sub(r"/\s*(\w+)", r"/ (\1 or 1)", orig_line)
        elif err_type == "ConnectionRefusedError":
            repaired_line = (
                f"# Resilient connection retry fallback\n"
                f"    try:\n"
                f"        {orig_line}\n"
                f"    except ConnectionRefusedError as conn_err:\n"
                f"        import logging; logging.warning(f'Retrying connection: {{conn_err}}')\n"
                f"        return None"
            )
        else:
            # Avoid suggesting speculative fixes for unsupported exception types.
            return ""

        patch = (
            f"--- a/{target_file}\n"
            f"+++ b/{target_file}\n"
            f"@@ -{line_num},1 +{line_num},1 @@\n"
            f"-    {orig_line}\n"
            f"+    {repaired_line}\n"
        )
        return patch

    def _persist_and_display_report(self, report: DiagnosticReport) -> None:
        """Write diagnostic report to .auratrace/diagnostics/ and print concise alert."""
        try:
            diag_dir = os.path.join(os.getcwd(), ".auratrace", "diagnostics")
            os.makedirs(diag_dir, exist_ok=True)
            report_file = os.path.join(diag_dir, f"{report.incident_id}.json")
            with open(report_file, "w", encoding="utf-8") as f:
                json.dump(report.to_dict(), f, indent=2)
        except Exception:
            pass

        # Terminal banner
        try:
            print("\n" + "=" * 68)
            print("⚡ AURATRACE EMBEDDED DIAGNOSTICS & SELF-HEALING DOCTOR")
            print("=" * 68)
            print(f"  • Incident ID   : {report.incident_id}")
            print(f"  • Service       : {report.service_name}")
            print(f"  • Severity      : {report.severity} (Anomaly Score: {report.anomaly_score})")
            print(f"  • Error Type    : {report.error_type}: {report.error_message}")
            if report.failing_file:
                print(f"  • Location      : {report.failing_file}:{report.failing_line}")
            print("\nROOT CAUSE ANALYSIS:")
            print(f"  {report.root_cause}")

            print("\nSAFETY GATE INSPECTION:")
            if not report.suggested_patch.strip():
                print("  Status: BLOCKED - No patch generated")
            elif report.safety_allowed:
                print("  Status: PASSED initial safety checks; validation still required")
            else:
                print("  Status: BLOCKED")

            for reason in report.safety_reasons:
                print(f"    - {reason}")

            print("\nREMEDIATION:")
            if report.suggested_patch.strip():
                for pline in report.suggested_patch.splitlines()[:12]:
                    print(f"    {pline}")
            else:
                print("  No automatic patch is available for this exception.")
                print("  Review the root cause and create a fix manually.")

            print("=" * 68 + "\n")
        except Exception:
            pass
