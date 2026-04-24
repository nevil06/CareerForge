import httpx
import re
import asyncio

# Shared client with connection pooling — avoids creating a new TCP connection per request
_GH_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "CareerForge-TrustEngine/1.0",
}

async def _get(client: httpx.AsyncClient, url: str) -> dict | list | None:
    """Single GET with shared client, returns parsed JSON or None on error."""
    try:
        resp = await client.get(url, timeout=8.0)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[GH] GET {url} failed: {e}")
    return None


def extract_github_username_from_url(url: str) -> str | None:
    """Extract username from a github.com profile or repo link."""
    match = re.search(r"github\.com/([^/\s?#]+)", url)
    if match:
        username = match.group(1).strip()
        # Skip known non-user paths
        if username.lower() not in ("login", "signup", "features", "topics", "explore"):
            return username
    return None


async def verify_candidate_github(resume_text: str, candidate_username: str = None) -> dict:
    """
    Resolve a GitHub username from resume text or explicit param,
    then fetch repos + languages CONCURRENTLY using a single shared client.
    """
    username = candidate_username

    if not username and resume_text:
        # Search both the visible text and any embedded link section
        match = re.search(r"github\.com/([^/\s?#\r\n]+)", resume_text, re.IGNORECASE)
        if match:
            username = match.group(1).strip()

    if not username:
        return {
            "github_found": False,
            "message": "No GitHub link or username found.",
            "repos": []
        }

    # Use a single persistent client for all requests in this call
    async with httpx.AsyncClient(headers=_GH_HEADERS, timeout=8.0) as client:
        # Fetch repo list first
        repos_url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=8"
        repos = await _get(client, repos_url)

        if not repos or not isinstance(repos, list):
            return {
                "github_found": True,
                "username": username,
                "message": "GitHub profile found but no public repos.",
                "repos": []
            }

        # Fetch languages for top 5 repos CONCURRENTLY
        top_repos = repos[:5]
        lang_tasks = [
            _get(client, f"https://api.github.com/repos/{username}/{r.get('name', '')}/languages")
            for r in top_repos
        ]
        langs_list = await asyncio.gather(*lang_tasks)

        simplified_repos = []
        for r, langs in zip(top_repos, langs_list):
            simplified_repos.append({
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "description": r.get("description"),
                "is_fork": r.get("fork"),
                "stars": r.get("stargazers_count"),
                "size_kb": r.get("size"),
                "pushed_at": r.get("pushed_at"),
                "languages": list((langs or {}).keys()),
                "owner": r.get("owner", {}).get("login"),
            })

    return {
        "github_found": True,
        "username": username,
        "repos": simplified_repos,
    }
