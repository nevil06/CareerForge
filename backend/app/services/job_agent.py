"""
AI Job Search Agent
===================
1. GLM analyses candidate profile → generates diverse search queries
2. JSearch fetches real jobs from LinkedIn/Indeed/Glassdoor for each query
3. GLM extracts structured skills from job descriptions
4. Jobs saved to DB, duplicates skipped
5. Matching engine runs automatically
"""
import httpx
import asyncio
import json
import re
from typing import List
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.job import Job, JobSource
from app.models.candidate import CandidateProfile
from app.services.ai_service import _chat


JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"


# ---------------------------------------------------------------------------
# Step 1 — GLM generates smart search queries from resume
# ---------------------------------------------------------------------------

def generate_search_queries(candidate: CandidateProfile) -> List[str]:
    """Ask GLM to generate 5 diverse job search queries based on the resume."""
    profile_summary = f"""
Name: {candidate.full_name}
Skills: {', '.join((candidate.skills or [])[:10])}
Experience: {candidate.experience_years} years
Preferred roles: {', '.join(candidate.preferred_roles or [])}
Location: {candidate.location or 'Remote'}
Summary: {candidate.summary or ''}
"""
    prompt = f"""You are a job search expert.
Based on this candidate profile, generate 5 diverse job search queries to find the best matching jobs on job boards.
Return ONLY a JSON array of 5 strings, no explanation.
Example: ["Python backend engineer remote", "FastAPI developer", "Full stack Python React", ...]

Candidate profile:
{profile_summary}"""

    try:
        content = _chat([{"role": "user", "content": prompt}], temperature=0.7)
        # Extract JSON array
        match = re.search(r'\[.*?\]', content, re.DOTALL)
        if match:
            queries = json.loads(match.group())
            return [q for q in queries if isinstance(q, str)][:5]
    except Exception as e:
        print(f"[job_agent] Query generation failed: {e}")

    # Fallback: build queries manually
    queries = []
    roles = candidate.preferred_roles or []
    skills = (candidate.skills or [])[:3]
    location = (candidate.location or "").split(",")[0].strip()

    for role in roles[:2]:
        queries.append(f"{role} {location}".strip() if location else role)
    for skill in skills[:2]:
        queries.append(f"{skill} developer {location}".strip() if location else f"{skill} developer")
    if not queries:
        queries = ["software engineer", "developer remote"]

    return queries[:5]


# ---------------------------------------------------------------------------
# Step 2 — Fetch jobs from JSearch
# ---------------------------------------------------------------------------

async def fetch_jobs_for_query(query: str, pages: int = 1) -> List[dict]:
    """Fetch jobs from JSearch API for a single query."""
    if not settings.JSEARCH_API_KEY:
        return []

    headers = {
        "X-RapidAPI-Key": settings.JSEARCH_API_KEY,
        "X-RapidAPI-Host": settings.JSEARCH_API_HOST,
    }

    results = []
    async with httpx.AsyncClient(timeout=20) as client:
        for page in range(1, pages + 1):
            try:
                resp = await client.get(JSEARCH_URL, headers=headers, params={
                    "query": query,
                    "page": str(page),
                    "num_pages": "1",
                    "date_posted": "month",
                    "remote_jobs_only": "false",
                })
                resp.raise_for_status()
                data = resp.json()
                results.extend(data.get("data", []))
            except Exception as e:
                print(f"[job_agent] JSearch error for '{query}': {e}")
    return results


# ---------------------------------------------------------------------------
# Step 3 — GLM extracts skills from job description
# ---------------------------------------------------------------------------

def extract_skills_from_description(description: str) -> List[str]:
    """Use GLM to extract a clean list of required skills from job description."""
    if not description:
        return []
    prompt = f"""Extract the required technical skills from this job description.
Return ONLY a JSON array of skill strings (max 10), no explanation.
Example: ["Python", "React", "PostgreSQL", "Docker"]

Job description:
{description[:1500]}"""
    try:
        content = _chat([{"role": "user", "content": prompt}], temperature=0.1)
        match = re.search(r'\[.*?\]', content, re.DOTALL)
        if match:
            skills = json.loads(match.group())
            return [s for s in skills if isinstance(s, str)][:10]
    except Exception:
        pass
    return []


# ---------------------------------------------------------------------------
# Step 4 — Normalize JSearch result to our Job model
# ---------------------------------------------------------------------------

def normalize_job(item: dict, skills: List[str] = None) -> dict:
    location_parts = [
        item.get("job_city", ""),
        item.get("job_state", ""),
        item.get("job_country", ""),
    ]
    location = ", ".join(p for p in location_parts if p)
    if item.get("job_is_remote"):
        location = "Remote" if not location else f"Remote / {location}"

    exp = item.get("job_required_experience") or {}
    months = exp.get("required_experience_in_months") or 0

    return {
        "title": item.get("job_title", "")[:255],
        "company_name": (item.get("employer_name") or "Unknown")[:255],
        "description": (item.get("job_description") or "")[:3000],
        "location": location[:255],
        "application_link": (item.get("job_apply_link") or "")[:500],
        "required_skills": skills or [],
        "experience_level": "junior" if months < 24 else "mid" if months < 60 else "senior",
        "experience_years_min": round(months / 12, 1),
        "salary_min": item.get("job_min_salary"),
        "salary_max": item.get("job_max_salary"),
        "source": JobSource.external,
        "is_active": True,
    }


# ---------------------------------------------------------------------------
# Main agent entry point
# ---------------------------------------------------------------------------

async def run_job_search_agent(candidate: CandidateProfile,
                                db: Session) -> dict:
    """
    Full pipeline:
    1. Generate queries with GLM
    2. Fetch jobs from JSearch
    3. Extract skills with GLM
    4. Save to DB
    5. Return stats
    """
    print(f"[job_agent] Starting for candidate: {candidate.full_name}")

    # Step 1: Generate queries
    queries = generate_search_queries(candidate)
    print(f"[job_agent] Queries: {queries}")

    # Step 2: Fetch jobs for all queries concurrently
    tasks = [fetch_jobs_for_query(q, pages=1) for q in queries]
    results = await asyncio.gather(*tasks)

    # Deduplicate by job_id
    seen_ids = set()
    unique_jobs = []
    for batch in results:
        for job in batch:
            jid = job.get("job_id", "")
            if jid and jid not in seen_ids:
                seen_ids.add(jid)
                unique_jobs.append(job)

    print(f"[job_agent] Fetched {len(unique_jobs)} unique jobs")

    # Step 3 & 4: Extract skills and save
    saved = 0
    skipped = 0

    for item in unique_jobs:
        title = (item.get("job_title") or "")[:255]
        company = (item.get("employer_name") or "Unknown")[:255]

        if not title:
            continue

        # Skip if already exists
        exists = db.query(Job).filter_by(
            title=title, company_name=company, source=JobSource.external
        ).first()
        if exists:
            skipped += 1
            continue

        # Extract skills with GLM (only for new jobs)
        desc = item.get("job_description") or ""
        skills = extract_skills_from_description(desc)

        job_data = normalize_job(item, skills)
        db.add(Job(**job_data))
        saved += 1

    db.commit()

    print(f"[job_agent] Done — saved: {saved}, skipped: {skipped}")
    return {
        "queries_used": queries,
        "total_fetched": len(unique_jobs),
        "jobs_saved": saved,
        "jobs_skipped": skipped,
    }
