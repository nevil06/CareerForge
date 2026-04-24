import httpx
import re

async def fetch_github_user_repos(username: str) -> list[dict]:
    """Fetch public repos for a user"""
    url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=10"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"Error fetching GitHub repos for {username}: {e}")
    return []

async def fetch_github_repo(owner: str, repo: str) -> dict | None:
    """Fetch specific repo details"""
    url = f"https://api.github.com/repos/{owner}/{repo}"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"Error fetching GitHub repo {owner}/{repo}: {e}")
    return None

async def fetch_repo_languages(owner: str, repo: str) -> dict:
    url = f"https://api.github.com/repos/{owner}/{repo}/languages"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"Error fetching languages for {owner}/{repo}: {e}")
    return {}

def extract_github_username_from_url(url: str) -> str | None:
    """Extract username from a github.com profile link"""
    match = re.search(r"github\.com/([^/]+)", url)
    if match:
        return match.group(1).strip()
    return None

async def verify_candidate_github(resume_text: str, candidate_username: str = None) -> dict:
    """
    Search resume text for GitHub links, and fetch actual data from GitHub API.
    Returns structured data that can be fed into the Trust Engine AI.
    """
    username = candidate_username
    
    if not username:
        # Try to find a github link in the resume
        match = re.search(r"github\.com/([^/\s]+)", resume_text.lower())
        if match:
            username = match.group(1).strip()

    if not username:
        return {
            "github_found": False,
            "message": "No GitHub link or username found in resume.",
            "repos": []
        }
    
    # We have a username, fetch real data
    repos = await fetch_github_user_repos(username)
    
    simplified_repos = []
    for r in repos[:5]: # Top 5 recent repos
        # Get languages
        langs = await fetch_repo_languages(r.get("owner", {}).get("login", ""), r.get("name", ""))
        
        simplified_repos.append({
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "description": r.get("description"),
            "is_fork": r.get("fork"),
            "stars": r.get("stargazers_count"),
            "size_kb": r.get("size"),
            "pushed_at": r.get("pushed_at"),
            "languages": list(langs.keys()),
            "owner": r.get("owner", {}).get("login")
        })

    return {
        "github_found": True,
        "username": username,
        "repos": simplified_repos
    }
