"""
Multi-Source Job Aggregator — 100% Free
========================================
Sources:
1. JSearch (RapidAPI)     — LinkedIn/Indeed/Glassdoor (500 req/month free)
2. RemoteOK API           — Remote tech jobs (completely free, no key)
3. Remotive API           — Remote jobs (completely free, no key)
4. Arbeitnow API          — EU + Remote jobs (completely free, no key)
5. The Muse API           — Tech company jobs (completely free, no key)

All sources run concurrently. GLM extracts skills from descriptions.
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


# ---------------------------------------------------------------------------
# Source 1: JSearch (RapidAPI) — already configured
# ---------------------------------------------------------------------------

async def fetch_jsearch(query: str, location: str = "") -> List[dict]:
    if not settings.JSEARCH_API_KEY:
        return []
    q = f"{query} {location}".strip() if location else query
    headers = {
        "X-RapidAPI-Key": settings.JSEARCH_API_KEY,
        "X-RapidAPI-Host": settings.JSEARCH_API_HOST,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://jsearch.p.rapidapi.com/search",
                headers=headers,
                params={"query": q, "page": "1", "num_pages": "2", "date_posted": "month"})
            r.raise_for_status()
            items = r.json().get("data", [])
            return [_norm_jsearch(i) for i in items]
    except Exception as e:
        print(f"[aggregator] JSearch error: {e}")
        return []


def _norm_jsearch(i: dict) -> dict:
    parts = [i.get("job_city",""), i.get("job_state",""), i.get("job_country","")]
    loc = ", ".join(p for p in parts if p)
    if i.get("job_is_remote"): loc = "Remote" if not loc else f"Remote / {loc}"
    exp = i.get("job_required_experience") or {}
    months = exp.get("required_experience_in_months") or 0
    return {
        "title": (i.get("job_title") or "")[:255],
        "company_name": (i.get("employer_name") or "Unknown")[:255],
        "description": (i.get("job_description") or "")[:3000],
        "location": loc[:255],
        "application_link": (i.get("job_apply_link") or "")[:500],
        "required_skills": [],
        "experience_years_min": round(months / 12, 1),
        "salary_min": i.get("job_min_salary"),
        "salary_max": i.get("job_max_salary"),
        "source": JobSource.external,
    }


# ---------------------------------------------------------------------------
# Source 2: RemoteOK — free, no key needed
# ---------------------------------------------------------------------------

async def fetch_remoteok(query: str) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=15, headers={"User-Agent": "CarrierForge/1.0"}) as client:
            r = await client.get("https://remoteok.com/api")
            r.raise_for_status()
            items = r.json()
            # Filter by query keywords
            q_words = set(query.lower().split())
            results = []
            for item in items:
                if not isinstance(item, dict) or not item.get("position"):
                    continue
                text = f"{item.get('position','')} {item.get('tags','')} {item.get('description','')}".lower()
                if any(w in text for w in q_words):
                    results.append(_norm_remoteok(item))
            return results[:20]
    except Exception as e:
        print(f"[aggregator] RemoteOK error: {e}")
        return []


def _norm_remoteok(i: dict) -> dict:
    tags = i.get("tags") or []
    skills = [t for t in tags if isinstance(t, str)][:8]
    return {
        "title": (i.get("position") or "")[:255],
        "company_name": (i.get("company") or "Unknown")[:255],
        "description": (i.get("description") or "")[:3000],
        "location": "Remote",
        "application_link": (i.get("url") or "")[:500],
        "required_skills": skills,
        "experience_years_min": 0,
        "salary_min": None,
        "salary_max": None,
        "source": JobSource.external,
    }


# ---------------------------------------------------------------------------
# Source 3: Remotive — free, no key needed
# ---------------------------------------------------------------------------

async def fetch_remotive(query: str) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://remotive.com/api/remote-jobs",
                params={"search": query, "limit": "20"})
            r.raise_for_status()
            items = r.json().get("jobs", [])
            return [_norm_remotive(i) for i in items]
    except Exception as e:
        print(f"[aggregator] Remotive error: {e}")
        return []


def _norm_remotive(i: dict) -> dict:
    tags = i.get("tags") or []
    skills = [t for t in tags if isinstance(t, str)][:8]
    return {
        "title": (i.get("title") or "")[:255],
        "company_name": (i.get("company_name") or "Unknown")[:255],
        "description": (i.get("description") or "")[:3000],
        "location": (i.get("candidate_required_location") or "Remote")[:255],
        "application_link": (i.get("url") or "")[:500],
        "required_skills": skills,
        "experience_years_min": 0,
        "salary_min": None,
        "salary_max": None,
        "source": JobSource.external,
    }


# ---------------------------------------------------------------------------
# Source 4: Arbeitnow — free, no key needed (EU + Remote)
# ---------------------------------------------------------------------------

async def fetch_arbeitnow(query: str) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://www.arbeitnow.com/api/job-board-api",
                params={"search": query, "page": "1"})
            r.raise_for_status()
            items = r.json().get("data", [])
            return [_norm_arbeitnow(i) for i in items[:20]]
    except Exception as e:
        print(f"[aggregator] Arbeitnow error: {e}")
        return []


def _norm_arbeitnow(i: dict) -> dict:
    tags = i.get("tags") or []
    return {
        "title": (i.get("title") or "")[:255],
        "company_name": (i.get("company_name") or "Unknown")[:255],
        "description": (i.get("description") or "")[:3000],
        "location": ("Remote" if i.get("remote") else i.get("location") or "")[:255],
        "application_link": (i.get("url") or "")[:500],
        "required_skills": [t for t in tags if isinstance(t, str)][:8],
        "experience_years_min": 0,
        "salary_min": None,
        "salary_max": None,
        "source": JobSource.external,
    }


# ---------------------------------------------------------------------------
# Source 5: The Muse — free, no key needed
# ---------------------------------------------------------------------------

async def fetch_themuse(query: str) -> List[dict]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get("https://www.themuse.com/api/public/jobs",
                params={"descending": "true", "page": "1"})
            r.raise_for_status()
            items = r.json().get("results", [])
            q_words = set(query.lower().split())
            results = []
            for item in items:
                name = (item.get("name") or "").lower()
                if any(w in name for w in q_words):
                    results.append(_norm_themuse(item))
            return results[:15]
    except Exception as e:
        print(f"[aggregator] TheMuse error: {e}")
        return []


def _norm_themuse(i: dict) -> dict:
    locs = i.get("locations") or [{}]
    loc = locs[0].get("name", "") if locs else ""
    company = (i.get("company") or {}).get("name", "Unknown")
    return {
        "title": (i.get("name") or "")[:255],
        "company_name": company[:255],
        "description": (i.get("contents") or "")[:3000],
        "location": loc[:255],
        "application_link": (i.get("refs", {}).get("landing_page") or "")[:500],
        "required_skills": [],
        "experience_years_min": 0,
        "salary_min": None,
        "salary_max": None,
        "source": JobSource.external,
    }


# ---------------------------------------------------------------------------
# GLM skill extraction
# ---------------------------------------------------------------------------

def extract_skills(description: str) -> List[str]:
    if not description or len(description) < 50:
        return []
    prompt = f"""Extract required technical skills from this job description.
Return ONLY a JSON array of skill strings (max 10), no explanation.
Example: ["Python", "React", "PostgreSQL"]

{description[:1200]}"""
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
# GLM query generation
# ---------------------------------------------------------------------------

def generate_queries(candidate: CandidateProfile) -> List[str]:
    roles = candidate.preferred_roles or []
    skills = (candidate.skills or [])[:4]
    location = (candidate.location or "").split(",")[0].strip()

    prompt = f"""Generate 6 diverse job search queries for this candidate.
Return ONLY a JSON array of 6 short query strings.
Example: ["Python backend engineer", "FastAPI developer remote", "Full stack Python React"]

Skills: {', '.join(skills)}
Preferred roles: {', '.join(roles)}
Location: {location or 'Remote'}"""

    try:
        content = _chat([{"role": "user", "content": prompt}], temperature=0.7)
        match = re.search(r'\[.*?\]', content, re.DOTALL)
        if match:
            queries = json.loads(match.group())
            return [q for q in queries if isinstance(q, str)][:6]
    except Exception:
        pass

    # Fallback
    queries = []
    for r in roles[:2]:
        queries.append(f"{r} {location}".strip() if location else r)
    for s in skills[:2]:
        queries.append(f"{s} developer")
    return queries or ["software engineer remote"]


# ---------------------------------------------------------------------------
# Main aggregator
# ---------------------------------------------------------------------------

async def aggregate_jobs_for_candidate(candidate: CandidateProfile,
                                        db: Session) -> dict:
    print(f"[aggregator] Starting for: {candidate.full_name}")

    queries = generate_queries(candidate)
    print(f"[aggregator] Queries: {queries}")

    # Run all sources concurrently for each query
    primary_query = queries[0] if queries else "software engineer"
    location = (candidate.location or "").split(",")[0].strip()

    tasks = [
        fetch_jsearch(primary_query, location),
        fetch_remoteok(primary_query),
        fetch_remotive(primary_query),
        fetch_arbeitnow(primary_query),
        fetch_themuse(primary_query),
    ]
    # Also run secondary queries on JSearch
    for q in queries[1:3]:
        tasks.append(fetch_jsearch(q))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Flatten and deduplicate
    seen = set()
    all_jobs = []
    for batch in results:
        if isinstance(batch, Exception):
            continue
        for job in batch:
            key = f"{job['title'].lower()}|{job['company_name'].lower()}"
            if key not in seen and job["title"]:
                seen.add(key)
                all_jobs.append(job)

    print(f"[aggregator] Total unique jobs: {len(all_jobs)}")

    # Save to DB with GLM skill extraction for jobs missing skills
    saved = skipped = 0
    for jd in all_jobs:
        exists = db.query(Job).filter_by(
            title=jd["title"], company_name=jd["company_name"], source=JobSource.external
        ).first()
        if exists:
            skipped += 1
            continue

        # Extract skills if missing
        if not jd["required_skills"] and jd["description"]:
            jd["required_skills"] = extract_skills(jd["description"])

        db.add(Job(**jd))
        saved += 1

    db.commit()
    print(f"[aggregator] Saved: {saved}, Skipped: {skipped}")

    return {
        "queries_used": queries,
        "sources": ["JSearch", "RemoteOK", "Remotive", "Arbeitnow", "TheMuse"],
        "total_fetched": len(all_jobs),
        "jobs_saved": saved,
        "jobs_skipped": skipped,
    }
