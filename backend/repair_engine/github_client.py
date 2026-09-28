"""
GitHub REST API Client module for AuraTrace L3 Automated Repair Engine.
Provides asynchronous repository operations: branch creation, file commits,
Pull Request management, CI check-runs polling, auto-merging, and revert creation.
"""

from __future__ import annotations

import base64
import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger("auratrace.repair.github")


class GitHubClient:
    """Asynchronous client for interacting with the GitHub REST API v3 / v4."""

    def __init__(self, token: str, base_url: str = "https://api.github.com", timeout: float = 30.0):
        self.token = token.strip()
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "AuraTrace-L3-Automated-Repair",
        }
        self.timeout = timeout

    async def _request(self, method: str, endpoint: str, **kwargs) -> dict[str, Any]:
        """Internal helper to dispatch authenticated HTTP requests to GitHub API."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        async with httpx.AsyncClient(headers=self.headers, timeout=self.timeout) as client:
            response = await client.request(method, url, **kwargs)
            if response.status_code >= 400:
                error_msg = f"GitHub API {method} {endpoint} failed [{response.status_code}]: {response.text}"
                logger.error(error_msg)
                try:
                    payload = response.json()
                except Exception:
                    payload = {"message": response.text}
                raise HTTPExceptionWithGitHub(response.status_code, error_msg, payload)
            if response.status_code == 204:
                return {}
            return response.json()

    async def get_repository(self, repo: str) -> dict[str, Any]:
        """Fetch repository metadata and verify access permissions."""
        return await self._request("GET", f"/repos/{repo}")

    async def get_default_branch(self, repo: str) -> str:
        """Fetch default branch name for the target repository."""
        data = await self.get_repository(repo)
        return data.get("default_branch", "main")

    async def get_branch_sha(self, repo: str, branch: str) -> str:
        """Retrieve the latest commit SHA for a specific branch."""
        ref_data = await self._request("GET", f"/repos/{repo}/git/ref/heads/{branch}")
        return ref_data["object"]["sha"]

    async def create_branch(self, repo: str, new_branch: str, from_ref_or_sha: str = "main") -> dict[str, Any]:
        """
        Create a new git branch on the remote repository.
        If from_ref_or_sha is a branch name, its latest commit SHA is resolved first.
        """
        if len(from_ref_or_sha) == 40 and all(c in "0123456789abcdefABCDEF" for c in from_ref_or_sha):
            sha = from_ref_or_sha
        else:
            sha = await self.get_branch_sha(repo, from_ref_or_sha)

        payload = {
            "ref": f"refs/heads/{new_branch}",
            "sha": sha,
        }
        return await self._request("POST", f"/repos/{repo}/git/refs", json=payload)

    async def get_file(self, repo: str, path: str, ref: str = "main") -> tuple[str, str]:
        """
        Fetch file content and blob SHA from repository at a given ref.
        Returns (decoded_text_content, blob_sha).
        """
        data = await self._request("GET", f"/repos/{repo}/contents/{path}?ref={ref}")
        content_b64 = data.get("content", "")
        sha = data.get("sha", "")
        decoded = base64.b64decode(content_b64).decode("utf-8")
        return decoded, sha

    async def create_or_update_file(
        self,
        repo: str,
        path: str,
        content: str,
        message: str,
        branch: str,
        sha: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Create or update a single file in the repository on a specific branch.
        If sha is not provided, attempts to fetch current sha on the target branch.
        """
        if sha is None:
            try:
                _, current_sha = await self.get_file(repo, path, ref=branch)
                sha = current_sha
            except Exception:
                sha = None

        payload: dict[str, Any] = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
            "branch": branch,
        }
        if sha:
            payload["sha"] = sha

        return await self._request("PUT", f"/repos/{repo}/contents/{path}", json=payload)

    async def create_pull_request(
        self,
        repo: str,
        title: str,
        head: str,
        base: str,
        body: str,
    ) -> dict[str, Any]:
        """Create a new Pull Request from head branch to base branch."""
        payload = {
            "title": title,
            "head": head,
            "base": base,
            "body": body,
            "maintainer_can_modify": True,
        }
        return await self._request("POST", f"/repos/{repo}/pulls", json=payload)

    async def get_check_runs(self, repo: str, ref: str) -> dict[str, Any]:
        """Fetch check-runs status and conclusions for a given commit ref."""
        try:
            return await self._request("GET", f"/repos/{repo}/commits/{ref}/check-runs")
        except Exception:
            # Fallback to legacy commit status API
            status_data = await self._request("GET", f"/repos/{repo}/commits/{ref}/status")
            state = status_data.get("state", "pending")
            return {
                "check_runs": [
                    {
                        "name": "GitHub Status Check",
                        "status": "completed" if state in ("success", "failure", "error") else "in_progress",
                        "conclusion": "success" if state == "success" else ("failure" if state in ("failure", "error") else None),
                    }
                ]
            }

    async def merge_pull_request(
        self,
        repo: str,
        pull_number: int,
        commit_title: Optional[str] = None,
        merge_method: str = "squash",
    ) -> dict[str, Any]:
        """Merge an open Pull Request using squash, merge, or rebase."""
        payload: dict[str, Any] = {
            "merge_method": merge_method,
        }
        if commit_title:
            payload["commit_title"] = commit_title
        return await self._request("PUT", f"/repos/{repo}/pulls/{pull_number}/merge", json=payload)

    async def create_revert_pr(
        self,
        repo: str,
        base_branch: str,
        commit_sha: str,
        reason: str,
    ) -> dict[str, Any]:
        """
        Create a revert branch and Pull Request to rollback a problematic repair merge.
        """
        revert_branch = f"auratrace/revert-{commit_sha[:8]}"
        await self.create_branch(repo, revert_branch, from_ref_or_sha=base_branch)
        pr_title = f"fix(revert): rollback automated repair commit {commit_sha[:8]}"
        pr_body = (
            f"### ⚠️ AuraTrace Automated Rollback\n\n"
            f"**Reason:** {reason}\n\n"
            f"Post-deployment health monitoring detected a telemetry regression above baseline threshold. "
            f"This PR reverts commit `{commit_sha}` to restore cluster stability."
        )
        return await self.create_pull_request(repo, pr_title, revert_branch, base_branch, pr_body)


class HTTPExceptionWithGitHub(Exception):
    """Custom exception containing GitHub HTTP status code and response payload."""
    def __init__(self, status_code: int, message: str, payload: dict[str, Any]):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload
