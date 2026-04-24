"""Company dashboard, profile, candidate search, AI screening."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import require_company, get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.match import Match
from app.models.notification import Notification
from app.models.candidate import CandidateProfile
from app.models.company import CompanyProfile
from app.schemas.match import NotificationOut

router = APIRouter(prefix="/api/company", tags=["company"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CompanyProfileCreate(BaseModel):
    company_name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    hiring_roles: List[str] = []
    required_skills: List[str] = []
    culture_tags: List[str] = []


class CompanyProfileOut(CompanyProfileCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True


class CandidateSearchRequest(BaseModel):
    query: str = ""
    skills: List[str] = []
    min_experience: float = 0
    location: str = ""
    limit: int = 20


class CandidateOut(BaseModel):
    id: int
    full_name: str
    location: Optional[str]
    summary: Optional[str]
    skills: List[str]
    experience_years: float
    preferred_roles: List[str]

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.post("/profile", response_model=CompanyProfileOut, status_code=201)
def create_profile(payload: CompanyProfileCreate,
                   user: User = Depends(require_company),
                   db: Session = Depends(get_db)):
    if db.query(CompanyProfile).filter_by(user_id=user.id).first():
        raise HTTPException(400, "Profile exists, use PUT to update")
    profile = CompanyProfile(user_id=user.id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("/profile", response_model=CompanyProfileOut)
def update_profile(payload: CompanyProfileCreate,
                   user: User = Depends(require_company),
                   db: Session = Depends(get_db)):
    profile = db.query(CompanyProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    for k, v in payload.model_dump().items():
        setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/profile", response_model=CompanyProfileOut)
def get_profile(user: User = Depends(require_company), db: Session = Depends(get_db)):
    profile = db.query(CompanyProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")
    return profile


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def dashboard(user: User = Depends(require_company), db: Session = Depends(get_db)):
    jobs = db.query(Job).filter_by(company_user_id=user.id, is_active=True).all()
    job_ids = [j.id for j in jobs]
    total_matches = db.query(Match).filter(Match.job_id.in_(job_ids)).count() if job_ids else 0
    return {
        "total_jobs": len(jobs),
        "total_matches": total_matches,
        "jobs": [{"id": j.id, "title": j.title, "location": j.location} for j in jobs],
    }


# ---------------------------------------------------------------------------
# Candidate Search
# ---------------------------------------------------------------------------

@router.post("/search-candidates", response_model=List[CandidateOut])
def search_candidates(payload: CandidateSearchRequest,
                      user: User = Depends(require_company),
                      db: Session = Depends(get_db)):
    """Search candidates by skills, experience, location."""
    query = db.query(CandidateProfile)

    # Filter by experience
    if payload.min_experience > 0:
        query = query.filter(CandidateProfile.experience_years >= payload.min_experience)

    # Filter by location (fuzzy)
    if payload.location:
        query = query.filter(CandidateProfile.location.ilike(f"%{payload.location}%"))

    # Filter by skills (JSON contains)
    # Note: MySQL JSON_CONTAINS requires proper JSON path syntax
    # For simplicity, fetch all and filter in Python
    candidates = query.limit(100).all()

    # Filter by skills in Python
    if payload.skills:
        skill_set = {s.lower() for s in payload.skills}
        candidates = [
            c for c in candidates
            if any(s.lower() in skill_set for s in (c.skills or []))
        ]

    # Text search in name/summary
    if payload.query:
        q_lower = payload.query.lower()
        candidates = [
            c for c in candidates
            if q_lower in (c.full_name or "").lower()
            or q_lower in (c.summary or "").lower()
            or any(q_lower in s.lower() for s in (c.skills or []))
        ]

    return candidates[:payload.limit]


# ---------------------------------------------------------------------------
# AI Candidate Screening
# ---------------------------------------------------------------------------

@router.post("/screen-candidate/{candidate_id}")
def screen_candidate(candidate_id: int, job_id: int,
                     user: User = Depends(require_company),
                     db: Session = Depends(get_db)):
    """Use GLM to analyse candidate fit for a specific job."""
    from app.services.ai_service import _chat
    from app.models.job import Job

    job = db.query(Job).filter_by(id=job_id, company_user_id=user.id).first()
    if not job:
        raise HTTPException(404, "Job not found or not yours")

    candidate = db.query(CandidateProfile).get(candidate_id)
    if not candidate:
        raise HTTPException(404, "Candidate not found")

    prompt = f"""You are an expert technical recruiter.
Analyse this candidate's fit for the job and return a JSON object:
{{
  "overall_fit": "strong" | "moderate" | "weak",
  "score": 0-100,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "concerns": ["concern 1", "concern 2"],
  "recommendation": "hire" | "interview" | "pass",
  "interview_questions": ["question 1", "question 2", "question 3"],
  "summary": "2-sentence summary"
}}

JOB:
Title: {job.title}
Skills: {', '.join(job.required_skills or [])}
Experience: {job.experience_years_min}+ years
Description: {(job.description or '')[:1000]}

CANDIDATE:
Name: {candidate.full_name}
Skills: {', '.join(candidate.skills or [])}
Experience: {candidate.experience_years} years
Summary: {candidate.summary or ''}

Return ONLY valid JSON."""

    import json, re
    content = _chat([{"role": "user", "content": prompt}], temperature=0.3)
    try:
        content = re.sub(r"```(?:json)?", "", content).strip()
        return json.loads(content)
    except Exception:
        return {"error": "Screening failed", "summary": "Unable to analyse candidate"}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@router.get("/notifications", response_model=list[NotificationOut])
def notifications(user: User = Depends(require_company), db: Session = Depends(get_db)):
    return db.query(Notification).filter_by(user_id=user.id).order_by(
        Notification.created_at.desc()
    ).limit(30).all()
