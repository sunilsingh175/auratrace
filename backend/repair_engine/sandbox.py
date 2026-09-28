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
import tempfile
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
    if not os.path.exists(repo_dir):
        return {
            "status": "FAILED",
            "stage": "precheck",
            "error": f"Repository directory not found: {repo_dir}",
            "stdout": "",
            "stderr": "",
            "duration_ms": 0,
        }

    work_dir = repo_dir
    temp_dir_obj = None

    if isolated:
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

        # 1. git apply --check
        check_proc = subprocess.run(
            ["git", "apply", "--check", patch_file_path],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if check_proc.returncode != 0:
            return {
                "status": "FAILED",
                "stage": "patch_check",
                "error": check_proc.stderr or check_proc.stdout or "git apply --check failed",
                "stdout": check_proc.stdout,
                "stderr": check_proc.stderr,
                "duration_ms": int((time.time() - start_time) * 1000),
            }

        # 2. git apply
        apply_proc = subprocess.run(
            ["git", "apply", patch_file_path],
            cwd=work_dir,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if apply_proc.returncode != 0:
            return {
                "status": "FAILED",
                "stage": "patch_apply",
                "error": apply_proc.stderr or apply_proc.stdout or "git apply failed",
                "stdout": apply_proc.stdout,
                "stderr": apply_proc.stderr,
                "duration_ms": int((time.time() - start_time) * 1000),
            }

        # 3. Execute test command
        cmd_args = test_command if isinstance(test_command, list) else test_command.strip()
        test_proc = subprocess.run(
            cmd_args,
            cwd=work_dir,
            capture_output=True,
            text=True,
            shell=True,
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
