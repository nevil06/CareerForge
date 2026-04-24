"""
External Job Fetcher — pulls jobs from Adzuna API and normalises them
into the internal Job schema.
"""
import httpx
from typing import List
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.job import Job, JobSource


async def fetch_external_jobs(query: str = "software engineer",
                               country: str = "us",
                               results_per_page: int = 20) -> List[dict]:
    """Fetch jobs from Adzuna and return normalised dicts."""
    if not settings.JOB_API_APP_ID or not settings.JOB_API_KEY:
        return []  # API not configured

    url = f"{settings.JOB_API_URL}/{country}/search/1"
    params = {
        "app_id": settings.JOB_API_APP_ID,
        "app_key": settings.JOB_API_KEY,
        "results_per_page": results_per_page,
        "what": query,
        "content-type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    jobs = []
    for item in data.get("results", []):
        jobs.append({
            "title": item.get("title", ""),
            "company_name": item.get("company", {}).get("display_name", "Unknown"),
            "description": item.get("description", ""),
            "location": item.get("location", {}).get("display_name", ""),
            "application_link": item.get("redirect_url", ""),
            "required_skills": [],  # Adzuna doesn't provide structured skills
            "source": JobSource.external,
        })
    return jobs


def upsert_external_jobs(jobs_data: List[dict], db: Session) -> int:
    """Insert external jobs that don't already exist (by title + company)."""
    count = 0
    for jd in jobs_data:
        exists = db.query(Job).filter_by(
            title=jd["title"], company_name=jd["company_name"], source=JobSource.external
        ).first()
        if not exists:
            job = Job(**jd)
            db.add(job)
            count += 1
    db.commit()
    return count
