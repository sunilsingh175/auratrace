"""Focused L3 repair-engine integration tests.

These tests exercise the real Safety Gate, sandbox runner, and rollback
regression logic without requiring GitHub credentials or a live database.
"""

from pathlib import Path

from backend.repair_engine.rollback import regression_detected, validate_rollback_reason
from backend.repair_engine.safety import inspect_patch
from backend.repair_engine.sandbox import run_sandbox_test


SAFE_PATCH = """--- a/app.py
+++ b/app.py
@@ -1,2 +1,2 @@
 def value(data):
-    return data["name"]
+    return (data or {}).get("name")
"""


def _make_repo(tmp_path: Path) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    (repo / "app.py").write_text(
        'def value(data):\n    return data["name"]\n',
        encoding="utf-8",
    )
    (repo / "test_app.py").write_text(
        "from app import value\n\n"
        "def test_value():\n"
        '    assert value({"name": "Alice"}) == "Alice"\n'
        "def test_none():\n"
        "    assert value(None) is None\n",
        encoding="utf-8",
    )

    import subprocess

    subprocess.run(["git", "init"], cwd=repo, capture_output=True, check=True)
    subprocess.run(["git", "config", "user.email", "ci@auratrace.local"], cwd=repo, check=True)
    subprocess.run(["git", "config", "user.name", "AuraTrace CI"], cwd=repo, check=True)
    subprocess.run(["git", "add", "."], cwd=repo, check=True)
    subprocess.run(["git", "commit", "-m", "initial test fixture"], cwd=repo, capture_output=True, check=True)
    return repo


def test_l3_safety_gate_allows_normal_source_patch():
    result = inspect_patch(SAFE_PATCH)
    assert result.allowed is True
    assert result.target_files == ("app.py",)
    assert result.reasons == ()


def test_l3_safety_gate_blocks_sensitive_file():
    patch = "--- a/.env\n+++ b/.env\n@@ -1 +1 @@\n-OLD\n+SECRET=value\n"
    result = inspect_patch(patch)
    assert result.allowed is False
    assert any("sensitive file" in reason for reason in result.reasons)


def test_l3_safety_gate_blocks_dangerous_added_code():
    patch = "--- a/app.py\n+++ b/app.py\n@@ -1 +1 @@\n-pass\n+import os; os.system('rm -rf /')\n"
    result = inspect_patch(patch)
    assert result.allowed is False
    assert result.flagged_patterns


def test_l3_sandbox_passes_repair_patch(tmp_path):
    repo = _make_repo(tmp_path)
    result = run_sandbox_test(
        str(repo),
        SAFE_PATCH,
        test_command="pytest",
        timeout_seconds=30,
        isolated=True,
    )
    assert result["status"] == "PASSED"
    assert result["exit_code"] == 0


def test_l3_sandbox_rejects_non_allowlisted_command(tmp_path):
    repo = _make_repo(tmp_path)
    result = run_sandbox_test(
        str(repo),
        SAFE_PATCH,
        test_command="python -c 'print(1)'",
        isolated=True,
    )
    assert result["status"] == "FAILED"
    assert result["stage"] == "test_validation"


def test_l3_sandbox_detects_failing_patch(tmp_path):
    repo = _make_repo(tmp_path)
    bad_patch = """--- a/app.py
+++ b/app.py
@@ -1,2 +1,2 @@
 def value(data):
-    return data["name"]
+    return data["missing"]
"""
    result = run_sandbox_test(
        str(repo),
        bad_patch,
        test_command="pytest",
        timeout_seconds=30,
        isolated=True,
    )
    assert result["status"] == "FAILED"
    assert result["stage"] == "test_execution"


def test_l3_regression_threshold():
    assert regression_detected(
        baseline_error_rate=0.00,
        current_error_rate=0.18,
        threshold=0.05,
    ) is True
    assert regression_detected(
        baseline_error_rate=0.00,
        current_error_rate=0.04,
        threshold=0.05,
    ) is False


def test_l3_rollback_reason_is_sanitized():
    reason = validate_rollback_reason("Regression <18%>\nRollback; urgent!")
    assert "<" not in reason
    assert ">" not in reason
    assert "\n" not in reason
    assert len(reason) <= 500
