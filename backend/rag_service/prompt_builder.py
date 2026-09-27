"""
Builds the RAG prompt sent to Gemini.
Combines: current incident + similar past incidents + known historical fixes.
"""
import json
from typing import List, Dict, Any

SYSTEM_PROMPT = """You are AuraTrace, an expert autonomous site reliability engineer and automated software debugging assistant.

Your job: analyze a production crash telemetry event and produce a precise diagnosis and unified diff code fix.

OUTPUT FORMAT (EXACT — do not deviate):

WHAT_HAPPENED: <2-3 sentences in plain English explaining the visible failure>

ROOT_CAUSE: <technical root cause — be specific about the faulty line or missing check>

FIX_EXPLANATION: <what the fix does and why it's safe to apply>

AFFECTED_FILES: <comma-separated file paths, e.g., src/payment.js, src/checkout.js>

CODE_PATCH:
```diff
--- a/path/to/file
+++ b/path/to/file
@@ -line,count +line,count @@
- old line
+ new line
```

CONFIDENCE: <0.0 to 1.0 — be honest; use <0.5 if uncertain>

RULES:
1. Keep fixes MINIMAL — change only the necessary lines
2. Do NOT refactor unrelated code
3. Do NOT add unnecessary new dependencies
4. If you cannot determine a fix, set CONFIDENCE below 0.5
5. Never suggest destructive changes to: auth, payment, billing, security, admin, infra, .github/
6. If no clear fix exists, output: NO_PATCH_AVAILABLE
"""


def build_diagnosis_prompt(
    incident: dict,
    similar_incidents: List[dict],
    historical_fixes: List[dict],
) -> str:
    """Assemble the full prompt for the LLM."""
    parts = [SYSTEM_PROMPT, "\n" + "=" * 60 + "\n"]

    # ── Current incident ─────────────────────────────────
    parts.append("# CURRENT INCIDENT\n")
    parts.append(f"**Error Type:** {incident.get('error_type') or 'Unknown'}")
    parts.append(f"**Message:** {incident.get('error_message') or incident.get('root_cause') or ''}")
    parts.append(f"**Service:** {incident.get('service_name') or 'unknown'}")
    parts.append(f"**Environment:** {incident.get('environment') or 'production'}")
    parts.append(f"**Anomaly Score:** {float(incident.get('anomaly_score') or 0.85):.2f}")
    parts.append(f"**Occurrences:** {incident.get('event_count', 1)}")

    runtime = incident.get("runtime")
    if isinstance(runtime, str):
        try:
            runtime = json.loads(runtime)
        except Exception:
            runtime = {}

    if isinstance(runtime, dict) and runtime:
        parts.append(
            f"**Runtime:** {runtime.get('language', '')} "
            f"{runtime.get('version', '')} "
            f"({runtime.get('framework', '')})"
        )

    stack = incident.get("stack_trace") or ""
    if stack:
        parts.append("\n## Stack Trace\n```\n" + stack[:4000] + "\n```")

    # ── Similar past incidents ───────────────────────────
    if similar_incidents:
        parts.append("\n" + "=" * 60)
        parts.append("\n# SIMILAR PAST INCIDENTS\n")
        for i, s in enumerate(similar_incidents[:3], 1):
            parts.append(
                f"\n## Match {i} (similarity: {float(s.get('similarity') or 0):.2f})\n"
            )
            parts.append(f"- Error: {s.get('error_type')}")
            if s.get("fix_explanation"):
                parts.append(f"- Previous fix: {s['fix_explanation'][:400]}")

    # ── Historical fixes that worked ─────────────────────
    if historical_fixes:
        parts.append("\n" + "=" * 60)
        parts.append("\n# HISTORICAL FIXES THAT WORKED\n")
        for i, f in enumerate(historical_fixes[:2], 1):
            parts.append(
                f"\n## Fix {i} (similarity: {float(f.get('similarity') or 0):.2f})\n"
            )
            if f.get("fix_description"):
                parts.append(f"**Description:** {f['fix_description']}")
            if f.get("fix_diff"):
                parts.append(f"**Diff:**\n```diff\n{f['fix_diff'][:800]}\n```")

    # ── Instruction ──────────────────────────────────────
    parts.append("\n" + "=" * 60)
    parts.append(
        "\nNow analyze the CURRENT INCIDENT and produce your diagnosis "
        "in the exact format specified above."
    )

    return "\n".join(parts)


def build_rag_prompt(
    service_name: str,
    environment: str,
    error_type: str,
    stack_trace: str,
    telemetry_metadata: Dict[str, Any],
    similar_fixes: List[Dict[str, Any]],
) -> str:
    """Legacy helper function."""
    inc = {
        "service_name": service_name,
        "environment": environment,
        "error_type": error_type,
        "stack_trace": stack_trace,
        "runtime": telemetry_metadata.get("runtime"),
    }
    return build_diagnosis_prompt(inc, [], similar_fixes)
