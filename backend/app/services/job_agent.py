"""
AI Job Search Agent  (fast edition)
====================================
1. GLM generates 2 focused search queries from the resume       (~1-2s)
2. JSearch fetches 1 page per query concurrently                (~2-4s)
3. Cap at 12 unique jobs — no more waiting
4. Instant regex skill extraction  (zero per-job AI calls)
5. Save to DB, skip duplicates
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

# ── Skill keyword list for fast regex extraction ──────────────────────────
_SKILL_KEYWORDS = [
    "Python","JavaScript","TypeScript","Java","Go","Rust","C++","C#","Ruby","PHP","Swift","Kotlin",
    "React","Next.js","Vue","Angular","Svelte","Node.js","Express","FastAPI","Django","Flask","Spring",
    "PostgreSQL","MySQL","MongoDB","Redis","SQLite","DynamoDB","Elasticsearch","Cassandra",
    "Docker","Kubernetes","AWS","GCP","Azure","Terraform","CI/CD","GitHub Actions","Jenkins",
    "GraphQL","REST","gRPC","Kafka","RabbitMQ","Celery",
    "Machine Learning","Deep Learning","TensorFlow","PyTorch","scikit-learn","NLP","LLM",
    "Git","Linux","Bash","Nginx","Prometheus","Grafana","Figma",
]
_SKILL_PATTERN = re.compile(
    r'\b(' + '|'.join(re.escape(s) for s in _SKILL_KEYWORDS) + r')\b',
    re.IGNORECASE
)


# ---------------------------------------------------------------------------
# Step 1 — Generate 2 search queries
# ---------------------------------------------------------------------------

def generate_search_queries(candidate: CandidateProfile) -> List[str]:
    """Ask GLM to produce exactly 2 job search queries."""
    profile_summary = (
        f"Skills: {', '.join((candidate.skills or [])[:8])}\n"
        f"Experience: {candidate.experience_years} years\n"
        f"Preferred roles: {', '.join(candidate.preferred_roles or [])}\n"
        f"Location: {candidate.location or 'Remote'}"
    )
    prompt = (
        f"Based on this candidate, generate exactly 2 job search queries for job boards.\n"
        f"Return ONLY a JSON array of 2 strings, no explanation.\n"
        f"Example: [\"Python backend engineer remote\", \"FastAPI developer India\"]\n\n"
        f"Candidate:\n{profile_summary}"
    )
    try:
        content = _chat([{"role": "user", "content": prompt}], temperature=0.5)
        match = re.search(r'\[.*?\]', content, re.DOTALL)
        if match:
            queries = json.loads(match.group())
            result = [q for q in queries if isinstance(q, str)][:2]
            if result:
                return result
    except Exception as e:
        print(f"[job_agent] Query generation failed: {e}")

    # Fallback — build queries from profile fields
    roles  = candidate.preferred_roles or []
    skills = (candidate.skills or [])[:2]
    fallback = []
    if roles:
        fallback.append(roles[0])
    if skills:
        fallback.append(f"{skills[0]} developer")
    return (fallback or ["software engineer"])[:2]


# ---------------------------------------------------------------------------
# Step 2 — Fetch 1 page of jobs per query (concurrent)
# ---------------------------------------------------------------------------

async def fetch_jobs_for_query(query: str) -> List[dict]:
    """Fetch one page of results from JSearch for a single query."""
    if not settings.JSEARCH_API_KEY:
        return []
    headers = {
        "X-RapidAPI-Key": settings.JSEARCH_API_KEY,
        "X-RapidAPI-Host": settings.JSEARCH_API_HOST,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(JSEARCH_URL, headers=headers, params={
                "query": query,
                "page": "1",
                "num_pages": "1",
                "date_posted": "month",
            })
            resp.raise_for_status()
            return resp.json().get("data", [])
    except Exception as e:
        print(f"[job_agent] JSearch error for '{query}': {e}")
        return []


# ---------------------------------------------------------------------------
# Step 3 — Instant regex skill extraction (no AI call per job)
# ---------------------------------------------------------------------------

def extract_skills_fast(description: str) -> List[str]:
    """Match skills against a known keyword list — O(n) with pre-compiled regex."""
    if not description:
        return []
    found_lower = {m.group().lower() for m in _SKILL_PATTERN.finditer(description)}
    return [kw for kw in _SKILL_KEYWORDS if kw.lower() in found_lower][:12]


# ---------------------------------------------------------------------------
# Step 4 — Normalise a JSearch result dict to our Job schema
# ---------------------------------------------------------------------------

def normalize_job(item: dict, skills: List[str] = None) -> dict:
    location_parts = [item.get("job_city",""), item.get("job_state",""), item.get("job_country","")]
    location = ", ".join(p for p in location_parts if p)
    if item.get("job_is_remote"):
        location = "Remote" if not location else f"Remote / {location}"

    exp    = item.get("job_required_experience") or {}
    months = exp.get("required_experience_in_months") or 0

    return {
        "title":               item.get("job_title", "")[:255],
        "company_name":        (item.get("employer_name") or "Unknown")[:255],
        "description":         (item.get("job_description") or "")[:3000],
        "location":            location[:255],
        "application_link":    (item.get("job_apply_link") or "")[:500],
        "required_skills":     skills or [],
        "experience_level":    "junior" if months < 24 else "mid" if months < 60 else "senior",
        "experience_years_min": round(months / 12, 1),
        "salary_min":          item.get("job_min_salary"),
        "salary_max":          item.get("job_max_salary"),
        "source":              JobSource.external,
        "is_active":           True,
    }


# ---------------------------------------------------------------------------
# Main agent entry point
# ---------------------------------------------------------------------------

async def run_job_search_agent(candidate: CandidateProfile, db: Session) -> dict:
    """
    Fast pipeline — target < 8 s total:
      Step 1  Generate 2 queries            ~1-2 s
      Step 2  Concurrent JSearch fetch      ~2-4 s
      Step 3  Cap at 12 jobs, regex skills  instant
      Step 4  DB save                       instant
    """
    print(f"[job_agent] Starting for: {candidate.full_name}")

    # 1. Queries
    queries = generate_search_queries(candidate)
    print(f"[job_agent] Queries: {queries}")

    # 2. Fetch concurrently
    results = await asyncio.gather(*[fetch_jobs_for_query(q) for q in queries])

    # 3. Deduplicate + hard cap at 12
    seen_ids: set      = set()
    unique_jobs: List  = []
    for batch in results:
        for job in batch:
            if len(unique_jobs) >= 12:
                break
            jid = job.get("job_id", "")
            if jid and jid not in seen_ids:
                seen_ids.add(jid)
                unique_jobs.append(job)

    print(f"[job_agent] {len(unique_jobs)} unique jobs (cap 12)")

    # 4. Regex skill extraction + DB save
    saved = skipped = 0
    for item in unique_jobs:
        title   = (item.get("job_title") or "")[:255]
        company = (item.get("employer_name") or "Unknown")[:255]
        if not title:
            continue
        if db.query(Job).filter_by(title=title, company_name=company, source=JobSource.external).first():
            skipped += 1
            continue
        skills = extract_skills_fast(item.get("job_description") or "")
        db.add(Job(**normalize_job(item, skills)))
        saved += 1

    db.commit()
    print(f"[job_agent] Done — saved: {saved}, skipped: {skipped}")
    return {"queries_used": queries, "total_fetched": len(unique_jobs),
            "jobs_saved": saved, "jobs_skipped": skipped}
