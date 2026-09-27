"""
GitHub REST API client for AuraTrace Automated Repairs.
Handles: file retrieval, branch creation, unified patch application, PR creation, auto-merge, and reverts.
"""
import base64
import logging
import re
from typing import Tuple, Dict, Any, List, Optional
import httpx

log = logging.getLogger("repair.git")
API = "https://api.github.com"


class GitHubClient:
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token.strip()}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    # ── Read Operations ──────────────────────────────────

    async def get_default_branch(self, repo: str) -> str:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(f"{API}/repos/{repo}", headers=self.headers)
            if r.status_code != 200:
                raise ValueError(f"Repo {repo} not accessible: HTTP {r.status_code}")
            return r.json().get("default_branch", "main")

    async def get_sha(self, repo: str, branch: str) -> str:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                f"{API}/repos/{repo}/git/ref/heads/{branch}",
                headers=self.headers,
            )
            if r.status_code != 200:
                # Try getting latest commit directly
                r2 = await c.get(f"{API}/repos/{repo}/commits/{branch}", headers=self.headers)
                if r2.status_code == 200:
                    return r2.json()["sha"]
                raise ValueError(f"Branch or ref '{branch}' not found in {repo}")
            return r.json()["object"]["sha"]

    async def get_file(self, repo: str, path: str, ref: str) -> Tuple[str, str]:
        """Returns (content_string, blob_sha)."""
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                f"{API}/repos/{repo}/contents/{path}",
                headers=self.headers,
                params={"ref": ref},
            )
            if r.status_code != 200:
                raise ValueError(f"File {path} not found in {repo} at {ref}")
            data = r.json()
            content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return content, data["sha"]

    # ── Write Operations ─────────────────────────────────

    async def create_branch(self, repo: str, branch: str, sha: str) -> bool:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                f"{API}/repos/{repo}/git/refs",
                headers=self.headers,
                json={"ref": f"refs/heads/{branch}", "sha": sha},
            )
            if r.status_code == 201:
                return True
            if r.status_code in (422, 400):
                # Branch already exists — force update pointer
                r2 = await c.patch(
                    f"{API}/repos/{repo}/git/refs/heads/{branch}",
                    headers=self.headers,
                    json={"sha": sha, "force": True},
                )
                return r2.status_code in (200, 201)
            raise ValueError(f"Failed to create branch {branch}: HTTP {r.status_code} {r.text}")

    async def apply_patch_via_blob(
        self,
        repo: str,
        branch: str,
        path: str,
        new_content: str,
        base_sha: str,
        message: str,
    ) -> str:
        """
        Apply or update a file on a branch and create a commit.
        Returns new commit SHA.
        """
        async with httpx.AsyncClient(timeout=30) as c:
            current_sha = None
            try:
                r_chk = await c.get(
                    f"{API}/repos/{repo}/contents/{path}",
                    headers=self.headers,
                    params={"ref": branch},
                )
                if r_chk.status_code == 200:
                    current_sha = r_chk.json()["sha"]
            except Exception:
                pass

            body: Dict[str, Any] = {
                "message": message,
                "content": base64.b64encode(new_content.encode("utf-8")).decode("utf-8"),
                "branch": branch,
            }
            if current_sha:
                body["sha"] = current_sha

            r = await c.put(
                f"{API}/repos/{repo}/contents/{path}",
                headers=self.headers,
                json=body,
            )
            if r.status_code not in (200, 201):
                raise ValueError(f"Failed to commit file {path}: HTTP {r.status_code} {r.text}")
            return r.json()["commit"]["sha"]

    async def apply_patch_to_files(
        self,
        repo: str,
        branch: str,
        patch: str,
        message: str,
    ) -> str:
        """
        Parses unified diff and applies modifications to target files in GitHub repo.
        Falls back to .auratrace-patch.txt marker commit if source file lookup is unavailable.
        """
        # Parse target file from diff
        m = re.search(r"^\+\+\+ [b/]*(.+)$", patch, re.MULTILINE)
        target_file = m.group(1).strip().lstrip("b/").lstrip("/") if m else None

        if target_file:
            try:
                current_content, _ = await self.get_file(repo, target_file, ref=branch)
                # Apply simple replacement if hunk pattern matches
                hunk_match = re.search(r"^@@.*?@@\n((?:[-+ ].*\n?)+)", patch, re.MULTILINE)
                if hunk_match:
                    hunk = hunk_match.group(1)
                    old_lines = [l[1:] for l in hunk.splitlines() if l.startswith("-")]
                    new_lines = [l[1:] for l in hunk.splitlines() if l.startswith("+")]
                    
                    old_block = "\n".join(old_lines).strip()
                    new_block = "\n".join(new_lines).strip()

                    if old_block and old_block in current_content:
                        modified_content = current_content.replace(old_block, new_block, 1)
                        return await self.apply_patch_via_blob(
                            repo=repo,
                            branch=branch,
                            path=target_file,
                            new_content=modified_content,
                            base_sha="",
                            message=message,
                        )
            except Exception as ex:
                log.info("Direct file patch application note (%s). Writing patch file.", ex)

        # Fallback / patch descriptor commit
        return await self.apply_patch_via_blob(
            repo=repo,
            branch=branch,
            path=".auratrace-patch.txt",
            new_content=patch,
            base_sha="",
            message=message,
        )

    # ── PR & Merge Operations ────────────────────────────

    async def create_pr(
        self,
        repo: str,
        head: str,
        base: str,
        title: str,
        body: str,
        draft: bool = False,
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                f"{API}/repos/{repo}/pulls",
                headers=self.headers,
                json={
                    "title": title,
                    "body": body,
                    "head": head,
                    "base": base,
                    "draft": draft,
                },
            )
            if r.status_code not in (200, 201):
                # If PR already exists, fetch existing
                if "A pull request already exists" in r.text or r.status_code == 422:
                    prs_r = await c.get(
                        f"{API}/repos/{repo}/pulls",
                        headers=self.headers,
                        params={"head": f"{repo.split('/')[0]}:{head}", "state": "open"},
                    )
                    if prs_r.status_code == 200 and prs_r.json():
                        existing = prs_r.json()[0]
                        return {
                            "url": existing["html_url"],
                            "number": existing["number"],
                            "sha": existing["head"]["sha"],
                        }
                raise ValueError(f"Failed to create PR: HTTP {r.status_code} {r.text}")
            data = r.json()
            return {
                "url": data["html_url"],
                "number": data["number"],
                "sha": data["head"]["sha"],
            }

    async def merge_pr(
        self,
        repo: str,
        pr_number: int,
        merge_method: str = "squash",
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.put(
                f"{API}/repos/{repo}/pulls/{pr_number}/merge",
                headers=self.headers,
                json={"merge_method": merge_method},
            )
            if r.status_code != 200:
                return {"merged": False, "message": r.text}
            data = r.json()
            return {
                "merged": data.get("merged", False),
                "sha": data.get("sha", ""),
                "message": data.get("message", "Merged successfully"),
            }

    async def close_pr(self, repo: str, pr_number: int, comment: str = ""):
        async with httpx.AsyncClient(timeout=15) as c:
            if comment:
                try:
                    await c.post(
                        f"{API}/repos/{repo}/issues/{pr_number}/comments",
                        headers=self.headers,
                        json={"body": comment},
                    )
                except Exception:
                    pass
            await c.patch(
                f"{API}/repos/{repo}/pulls/{pr_number}",
                headers=self.headers,
                json={"state": "closed"},
            )
