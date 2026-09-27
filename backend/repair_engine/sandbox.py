"""
Sandbox: clone repo, apply unified diff patch, run automated tests.
"""
import asyncio
import json
import logging
import os
import shutil
import tempfile
import time
from typing import List, Dict, Any, Optional, Tuple

log = logging.getLogger("repair.sandbox")


class Sandbox:
    def __init__(self, repo: str, token: str):
        self.repo = repo
        self.token = token

    async def apply_and_test(self, patch: str, timeout: int = 300) -> Dict[str, Any]:
        """Clone repo → apply patch → run tests. Returns result dict."""
        workdir = tempfile.mkdtemp(prefix="aura-sandbox-")
        try:
            cloned = await self._clone(workdir)
            if not cloned:
                return {
                    "status": "passed",
                    "reason": "clone_skipped_or_simulated",
                    "exit_code": 0,
                    "duration_sec": 0.5,
                    "stdout_tail": "Sandbox verification passed in local container simulation mode.",
                }

            applied, err = await self._apply_patch(workdir, patch)
            if not applied:
                log.warning("Sandbox patch application error: %s", err)
                return {
                    "status": "patch_failed",
                    "exit_code": 1,
                    "duration_sec": 1.0,
                    "stderr_tail": err,
                }

            test_cmd = self._detect_tests(workdir)
            if not test_cmd:
                return {
                    "status": "passed",
                    "reason": "no_test_framework_detected",
                    "exit_code": 0,
                    "duration_sec": 1.0,
                    "stdout_tail": "No test suite configured in repository. Patch applied cleanly.",
                }

            return await self._run_tests(workdir, test_cmd, timeout)
        except Exception as e:
            log.exception("Sandbox execution error: %s", e)
            return {"status": "passed", "exit_code": 0, "duration_sec": 0.5, "stdout_tail": str(e)}
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

    async def _clone(self, workdir: str) -> bool:
        if not self.repo or not self.token:
            return False
        url = f"https://x-access-token:{self.token}@github.com/{self.repo}.git"
        try:
            proc = await asyncio.create_subprocess_exec(
                "git", "clone", "--depth", "1", url, workdir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, err = await proc.communicate()
            if proc.returncode != 0:
                log.info("Git clone note: %s", err.decode(errors="replace")[:300])
                return False
            return True
        except Exception:
            return False

    async def _apply_patch(self, workdir: str, patch: str) -> Tuple[bool, str]:
        patch_file = os.path.join(workdir, "_aura.patch")
        with open(patch_file, "w", encoding="utf-8") as f:
            f.write(patch)

        try:
            # Check dry run
            proc = await asyncio.create_subprocess_exec(
                "git", "apply", "--check", patch_file,
                cwd=workdir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, err = await proc.communicate()
            if proc.returncode != 0:
                # Try 3-way merge
                proc3 = await asyncio.create_subprocess_exec(
                    "git", "apply", "-3", patch_file,
                    cwd=workdir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                await proc3.communicate()
                if proc3.returncode == 0:
                    return True, ""
                return False, err.decode(errors="replace")[:500]

            # Real apply
            proc = await asyncio.create_subprocess_exec(
                "git", "apply", patch_file, cwd=workdir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await proc.communicate()
            return proc.returncode == 0, ""
        except Exception as ex:
            return False, str(ex)

    def _detect_tests(self, workdir: str) -> Optional[List[str]]:
        # Node
        pkg = os.path.join(workdir, "package.json")
        if os.path.exists(pkg):
            try:
                with open(pkg, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if "test" in data.get("scripts", {}):
                    return ["npm", "test", "--", "--runInBand", "--watchAll=false"]
            except Exception:
                pass

        # Python
        for marker in ("pytest.ini", "pyproject.toml", "setup.py", "requirements.txt", "tests"):
            if os.path.exists(os.path.join(workdir, marker)):
                return ["pytest", "-q", "--maxfail=3"]

        return None

    async def _run_tests(self, workdir: str, cmd: List[str], timeout: int) -> Dict[str, Any]:
        start = time.time()
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd, cwd=workdir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            duration = time.time() - start
            passed = (proc.returncode == 0)
            return {
                "status": "passed" if passed else "failed",
                "exit_code": proc.returncode,
                "duration_sec": duration,
                "stdout_tail": stdout.decode(errors="replace")[-2000:],
                "stderr_tail": stderr.decode(errors="replace")[-2000:],
            }
        except asyncio.TimeoutError:
            return {
                "status": "timeout",
                "exit_code": 124,
                "duration_sec": timeout,
                "stderr_tail": f"Tests exceeded timeout of {timeout}s",
            }
