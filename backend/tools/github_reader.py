"""Public GitHub repos for a profile link. Fails soft: no network means no repos, not a dead quest."""
from __future__ import annotations

import os
import re

import httpx


def username(link: str | None) -> str | None:
    m = re.search(r"github\.com/([\w-]+)", link or "", re.I)
    return m.group(1) if m else None


async def read_repos(link: str | None, limit: int = 12) -> list[dict]:
    user = username(link)
    if not user:
        return []
    headers = {"Accept": "application/vnd.github+json"}
    if tok := os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {tok}"
    try:
        async with httpx.AsyncClient(timeout=6) as client:
            r = await client.get(f"https://api.github.com/users/{user}/repos",
                                 params={"sort": "updated", "per_page": limit}, headers=headers)
            r.raise_for_status()
    except (httpx.HTTPError, ValueError):
        return []
    return [{"name": x["name"], "description": x.get("description") or "",
             "language": x.get("language") or "", "stars": x.get("stargazers_count", 0),
             "topics": x.get("topics", []), "url": x.get("html_url", "")}
            for x in r.json() if not x.get("fork")]
