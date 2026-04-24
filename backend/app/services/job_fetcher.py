"""
Job Fetcher — searches real internet jobs via JSearch (RapidAPI)
using the candidate's skills and preferred roles as search query.

Sign up free: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
Free tier: 200 requests/month
"""
import httpx
from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.job import Job, JobSource
from app.models.candidate import CandidateProfile


JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"


async def search_jobs_for_candidate(candidate: CandidateProfile,
                                     num_pages: int = 2) -> List[dict]:
    """
    Build a smart search query from candidate's resume profile,
    then fetch real jobs from JSearch.
    """
    if not settings.JSEARCH_API_KEY:
        return []

    # Build query from preferred roles + top skills
    roles = candidate.preferred_roles or []
    skills = (candidate.skills or [])[:3]
    location = candidate.location or ""

    # Primary query: first preferred role + top skill
    query = roles[0] if roles else (skills[0] if skills else "software engineer")
    if skills and roles:
        query = f"{roles[0]} {skills[0]}"

    # Location: extract city/country
    location_query = location.split(",")[0].strip() if location else ""

    headers = {
        "X-RapidAPI-Key": settings.JSEARCH_API_KEY,
        "X-RapidAPI-Host": settings.JSEARCH_API_HOST,
    }

    all_jobs = []
    async with httpx.AsyncClient(timeout=20) as client:
        for page in range(1, num_pages + 1):
            params = {
                "query": query,
                "page": str(page),
                "num_pages": "1",
                "date_posted": "month",
            }
            if location_query:
                params["query"] = f"{query} in {location_query}"

            try:
                resp = await client.get(JSEARCH_URL, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
                all_jobs.extend(data.get("data", []))
            except Exception as e:
                print(f"[job_fetcher] JSearch error: {e}")
                break

    return [_normalize(j) for j in all_jobs]


def _normalize(item: dict) -> dict:
    """Convert JSearch response to our internal Job schema."""
    # Extract skills from job highlights if available
    skills = []
    highlights = item.get("job_highlights", {})
    qualifications = highlights.get("Qualifications", [])
    for q in qualifications[:5]:
        # Extract short skill-like phrases
        if len(q) < 60:
            skills.append(q)

    return {
        "title": item.get("job_title", ""),
        "company_name": item.get("employer_name", "Unknown"),
        "description": item.get("job_description", "")[:2000],
        "location": _build_location(item),
        "application_link": item.get("job_apply_link", ""),
        "required_skills": skills,
        "experience_level": _map_experience(item.get("job_required_experience", {})),
        "experience_years_min": _extract_years(item.get("job_required_experience", {})),
        "salary_min": item.get("job_min_salary"),
        "salary_max": item.get("job_max_salary"),
        "source": JobSource.external,
        "is_active": True,
    }


def _build_location(item: dict) -> str:
    parts = [
        item.get("job_city", ""),
        item.get("job_state", ""),
        item.get("job_country", ""),
    ]
    loc = ", ".join(p for p in parts if p)
    if item.get("job_is_remote"):
        return "Remote" if not loc else f"Remote / {loc}"
    return loc or "Unknown"


def _map_experience(exp: dict) -> str:
    years = exp.get("required_experience_in_months", 0) or 0
    if years < 24:
        return "junior"
    elif years < 60:
        return "mid"
    return "senior"


def _extract_years(exp: dict) -> float:
    months = exp.get("required_experience_in_months", 0) or 0
    return round(months / 12, 1)


async def upsert_jobs_for_candidate(candidate: CandidateProfile,
                                     db: Session) -> int:
    """Fetch real jobs for this candidate and save new ones to DB."""
    jobs_data = await search_jobs_for_candidate(candidate)
    count = 0
    for jd in jobs_data:
        if not jd["title"] or not jd["company_name"]:
            continue
        exists = db.query(Job).filter_by(
            title=jd["title"],
            company_name=jd["company_name"],
            source=JobSource.external,
        ).first()
        if not exists:
            db.add(Job(**jd))
            count += 1
    db.commit()
    return count
