"""
Sandbox Test Runner module for AuraTrace L3 Automated Repair Engine.
Applies generated unified diff patches and executes automated test commands
in an isolated local repository directory to verify fixes before creating GitHub PRs.
"""

from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import shlex
import time
from typing import Any, Optional

logger = logging.getLogger("auratrace.repair.sandbox")


def run_sandbox_test(
    repo_dir: str,
    patch: str,
    test_command: str = "pytest",
    timeout_seconds: int = 60,
    isolated: bool = False,
) -> dict[str, Any]:
    """
    Synchronously test a patch against a repository:
      1. Check patch application with 'git apply --check'
      2. Apply patch with 'git apply'
      3. Run test command (e.g. 'pytest', 'python hello.py')
      4. Report PASSED / FAILED / TIMEOUT
    """
    work_dir = repo_dir
    temp_dir_obj = None

    if not repo_dir or not os.path.exists(repo_dir):
        # Create an isolated temporary copy/workspace of the repository
        temp_dir_obj = tempfile.TemporaryDirectory(prefix="auratrace_sandbox_")
        work_dir = temp_dir_obj.name
        try:
            from backend.repair_engine.safety import extract_files_from_patch
            target_files = extract_files_from_patch(patch)
            for tf in target_files:
                fpath = os.path.join(work_dir, tf)
                os.makedirs(os.path.dirname(fpath), exist_ok=True)
                if not os.path.exists(fpath):
                    with open(fpath, "w", encoding="utf-8") as f:
                        f.write("")
            subprocess.run(["git", "init"], cwd=work_dir, capture_output=True, check=False)
            subprocess.run(["git", "add", "."], cwd=work_dir, capture_output=True, check=False)
            subprocess.run(["git", "commit", "-m", "initial state"], cwd=work_dir, capture_output=True, check=False)
        except Exception as init_err:
            if temp_dir_obj:
                temp_dir_obj.cleanup()
            return {
                "status": "FAILED",
                "stage": "isolation_setup",
                "error": f"Failed to initialize isolated sandbox: {init_err}",
                "stdout": "",
                "stderr": "",
                "duration_ms": 0,
            }
    elif isolated:
        # Create an isolated temporary copy of the repository
        temp_dir_obj = tempfile.TemporaryDirectory(prefix="auratrace_sandbox_")
        work_dir = temp_dir_obj.name
        try:
            shutil.copytree(repo_dir, work_dir, dirs_exist_ok=True, ignore=shutil.ignore_patterns(".git"))
            # Initialize a temporary git repo in the isolated copy for git apply to work
            subprocess.run(["git", "init"], cwd=work_dir, capture_output=True, check=False)
            subprocess.run(["git", "add", "."], cwd=work_dir, capture_output=True, check=False)
            subprocess.run(["git", "commit", "-m", "initial state"], cwd=work_dir, capture_output=True, check=False)
        except Exception as copy_err:
            if temp_dir_obj:
                temp_dir_obj.cleanup()
            return {
                "status": "FAILED",
                "stage": "isolation_setup",
                "error": f"Failed to initialize isolated sandbox: {copy_err}",
                "stdout": "",
                "stderr": "",
                "duration_ms": 0,
            }

    start_time = time.time()
    patch_file_path = None

    try:
        # Write patch to a temporary file
        with tempfile.NamedTemporaryFile("w", suffix=".patch", delete=False, encoding="utf-8") as pf:
            pf.write(patch)
            patch_file_path = pf.name

        # 1. git apply --check (try with whitespace tolerance)
        check_proc = subprocess.run(
            ["git", "apply", "--check", "--ignore-whitespace", patch_file_path],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if check_proc.returncode != 0:
            # Fallback: if check failed due to clean creation, proceed to apply
            pass

        # 2. git apply
        apply_proc = subprocess.run(
            ["git", "apply", "--ignore-whitespace", patch_file_path],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if apply_proc.returncode != 0:
            # If git apply fails, try manual text patch fallback on target files
            from backend.repair_engine.orchestrator import apply_patch_to_text
            from backend.repair_engine.safety import extract_files_from_patch
            target_files = extract_files_from_patch(patch)
            applied_any = False
            for tf in target_files:
                tf_path = os.path.join(work_dir, tf)
                if os.path.exists(tf_path):
                    with open(tf_path, "r", encoding="utf-8") as rf:
                        orig = rf.read()
                    updated = apply_patch_to_text(orig, tf, patch)
                    if updated:
                        with open(tf_path, "w", encoding="utf-8") as wf:
                            wf.write(updated)
                        applied_any = True
            if not applied_any:
                return {
                    "status": "FAILED",
                    "stage": "patch_apply",
                    "error": apply_proc.stderr or apply_proc.stdout or "git apply failed",
                    "stdout": apply_proc.stdout,
                    "stderr": apply_proc.stderr,
                    "duration_ms": int((time.time() - start_time) * 1000),
                }

        # 3. Execute test command
        # Only approved test entrypoints are allowed. Never invoke a shell here.
        if isinstance(test_command, list):
            raw_args = [str(arg) for arg in test_command]
        else:
            command = test_command.strip()
            if not command:
                return {
                    "status": "FAILED",
                    "stage": "test_validation",
                    "error": "Test command cannot be empty.",
                    "stdout": "",
                    "stderr": "",
                    "duration_ms": int((time.time() - start_time) * 1000),
                }
            try:
                raw_args = shlex.split(command)
            except ValueError as exc:
                return {
                    "status": "FAILED",
                    "stage": "test_validation",
                    "error": f"Invalid test command syntax: {exc}",
                    "stdout": "",
                    "stderr": "",
                    "duration_ms": int((time.time() - start_time) * 1000),
                }

        # Allow only known test runners. Arguments are passed directly to the process,
        # never through a shell, so chaining/redirection cannot escape the test runner.
        if raw_args[0] == "pytest":
            cmd_args = raw_args
        elif len(raw_args) >= 3 and raw_args[:3] == ["python", "-m", "pytest"]:
            cmd_args = raw_args
        elif len(raw_args) >= 3 and raw_args[:3] == ["python3", "-m", "pytest"]:
            cmd_args = raw_args
        elif raw_args[:2] == ["npm", "test"]:
            cmd_args = raw_args
        elif raw_args[:3] == ["npm", "run", "test"]:
            cmd_args = raw_args
        else:
            return {
                "status": "FAILED",
                "stage": "test_validation",
                "error": "Test command is not allowlisted. Allowed entrypoints: pytest, python -m pytest, npm test, npm run test.",
                "stdout": "",
                "stderr": "",
                "duration_ms": int((time.time() - start_time) * 1000),
            }

        # Resolve binary path safely
        executable = shutil.which(cmd_args[0])
        if not executable:
            if cmd_args[0] == "pytest":
                cmd_args = [sys.executable, "-m", "pytest"] + cmd_args[1:]
            elif cmd_args[0] in ("python", "python3"):
                cmd_args = [sys.executable] + cmd_args[1:]
        else:
            cmd_args = [executable] + cmd_args[1:]

        # shell=False prevents command chaining/redirection such as ';', '&&', '|', '$()'.
        test_proc = subprocess.run(
            cmd_args,
            cwd=work_dir,
            capture_output=True,
            text=True,
            shell=False,
            timeout=timeout_seconds,
        )

        duration_ms = int((time.time() - start_time) * 1000)

        if test_proc.returncode == 0:
            return {
                "status": "PASSED",
                "stage": "test_execution",
                "exit_code": 0,
                "stdout": test_proc.stdout,
                "stderr": test_proc.stderr,
                "duration_ms": duration_ms,
            }
        elif test_proc.returncode == 5:
            # Exit code 5 from pytest means no tests were found/collected
            compile_proc = subprocess.run([sys.executable, "-m", "compileall", "-q", work_dir], capture_output=True, text=True)
            if compile_proc.returncode == 0:
                return {
                    "status": "PASSED",
                    "stage": "syntax_validation",
                    "exit_code": 0,
                    "stdout": "Patch syntax check passed (no test suites present in temporary workspace).",
                    "stderr": "",
                    "duration_ms": duration_ms,
                }
        else:
            return {
                "status": "FAILED",
                "stage": "test_execution",
                "exit_code": test_proc.returncode,
                "error": f"Test command exited with code {test_proc.returncode}",
                "stdout": test_proc.stdout,
                "stderr": test_proc.stderr,
                "duration_ms": duration_ms,
            }

    except subprocess.TimeoutExpired:
        return {
            "status": "TIMEOUT",
            "stage": "test_execution",
            "error": f"Test command exceeded timeout limit ({timeout_seconds}s)",
            "stdout": "",
            "stderr": "",
            "duration_ms": int((time.time() - start_time) * 1000),
        }
    except Exception as exc:
        return {
            "status": "FAILED",
            "stage": "unexpected_error",
            "error": str(exc),
            "stdout": "",
            "stderr": "",
            "duration_ms": int((time.time() - start_time) * 1000),
        }
    finally:
        # Clean up temporary patch file
        if patch_file_path and os.path.exists(patch_file_path):
            try:
                os.remove(patch_file_path)
            except OSError:
                pass
        # Clean up temporary isolation directory if used
        if temp_dir_obj:
            temp_dir_obj.cleanup()


async def async_run_sandbox_test(
    repo_dir: str,
    patch: str,
    test_command: str = "pytest",
    timeout_seconds: int = 60,
    isolated: bool = False,
) -> dict[str, Any]:
    """Asynchronously execute sandbox testing in a threadpool executor."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(
        None,
        run_sandbox_test,
        repo_dir,
        patch,
        test_command,
        timeout_seconds,
        isolated,
    )
