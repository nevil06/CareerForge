from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.api.deps import require_company, get_current_user
from app.models.job import Job, JobSource
from app.models.user import User
from app.schemas.job import JobCreate, JobOut
from app.schemas.match import MatchOut
from app.services.ai_service import get_embedding
from app.services.matching_service import run_matching_for_job, notify_company
from app.models.match import Match
from app.models.candidate import CandidateProfile

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


# ---------------------------------------------------------------------------
# Public job listing
# ---------------------------------------------------------------------------

@router.get("", response_model=List[JobOut])
def list_jobs(
    q: Optional[str] = Query(None, description="Search by title or skill"),
    location: Optional[str] = None,
    skip: int = 0,
    limit: int = 40,
    db: Session = Depends(get_db),
):
    query = db.query(Job).filter(Job.is_active == True)
    if q:
        query = query.filter(Job.title.ilike(f"%{q}%"))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    return query.offset(skip).limit(limit).all()


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


# ---------------------------------------------------------------------------
# Company: post / manage jobs
# ---------------------------------------------------------------------------

@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate,
               background_tasks: BackgroundTasks,
               user: User = Depends(require_company),
               db: Session = Depends(get_db)):
    job = Job(
        **payload.model_dump(),
        company_user_id=user.id,
        company_name=user.email.split("@")[0],  # placeholder; extend with company profile
        source=JobSource.internal,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(_embed_and_match_job, job.id)
    return job


@router.put("/{job_id}", response_model=JobOut)
def update_job(job_id: int, payload: JobCreate,
               user: User = Depends(require_company),
               db: Session = Depends(get_db)):
    job = db.query(Job).filter_by(id=job_id, company_user_id=user.id).first()
    if not job:
        raise HTTPException(404, "Job not found or not yours")
    for k, v in payload.model_dump().items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, user: User = Depends(require_company), db: Session = Depends(get_db)):
    job = db.query(Job).filter_by(id=job_id, company_user_id=user.id).first()
    if not job:
        raise HTTPException(404, "Job not found or not yours")
    job.is_active = False
    db.commit()


# ---------------------------------------------------------------------------
# Company: view candidate matches for their jobs
# ---------------------------------------------------------------------------

@router.get("/{job_id}/matches", response_model=List[MatchOut])
def job_matches(job_id: int,
                user: User = Depends(require_company),
                db: Session = Depends(get_db)):
    job = db.query(Job).filter_by(id=job_id, company_user_id=user.id).first()
    if not job:
        raise HTTPException(404, "Job not found or not yours")

    matches = (
        db.query(Match)
        .filter_by(job_id=job_id)
        .order_by(Match.score_total.desc())
        .limit(50)
        .all()
    )
    result = []
    for m in matches:
        out = MatchOut.model_validate(m)
        out.candidate_name = m.candidate.full_name
        out.job_title = job.title
        out.company_name = job.company_name
        result.append(out)
    return result


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _embed_and_match_job(job_id: int):
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        job = db.query(Job).get(job_id)
        if not job:
            return
        text = f"{job.title} {job.description or ''} Skills: {', '.join(job.required_skills or [])}"
        try:
            job.embedding = get_embedding(text)
            db.commit()
        except Exception:
            pass

        matches = run_matching_for_job(job, db)
        for m in matches:
            if not m.notified_company and m.score_total >= 0.5:
                notify_company(job, m.candidate, m.score_total, db)
                m.notified_company = True
                try:
                    import httpx as _httpx
                    from app.services.email_service import _template, BREVO_API_URL
                    from app.core.config import settings as _s
                    pct = int(m.score_total * 100)
                    body = f"<p><strong>{m.candidate.full_name}</strong> matched <strong>{pct}%</strong> with your job <strong>{job.title}</strong>.</p>"
                    _httpx.post(BREVO_API_URL, json={
                        "sender": {"name": _s.BREVO_SENDER_NAME, "email": _s.BREVO_SENDER_EMAIL},
                        "to": [{"email": m.candidate.user.email, "name": job.company_name}],
                        "subject": f"New {pct}% match for {job.title}",
                        "htmlContent": _template("New Candidate Match! 👤", body),
                    }, headers={"api-key": _s.BREVO_API_KEY, "content-type": "application/json"}, timeout=10)
                except Exception:
                    pass
            if not m.notified_candidate and m.score_total >= 0.5:
                from app.services.matching_service import notify_candidate
                notify_candidate(m.candidate, job, m.score_total, db)
                m.notified_candidate = True
                try:
                    import httpx as _httpx
                    from app.services.email_service import _template, BREVO_API_URL
                    from app.core.config import settings as _s
                    pct = int(m.score_total * 100)
                    body = f"<p>Hi <strong>{m.candidate.full_name}</strong>, you matched <strong>{pct}%</strong> with <strong>{job.title}</strong> at {job.company_name}.</p>"
                    _httpx.post(BREVO_API_URL, json={
                        "sender": {"name": _s.BREVO_SENDER_NAME, "email": _s.BREVO_SENDER_EMAIL},
                        "to": [{"email": m.candidate.user.email, "name": m.candidate.full_name}],
                        "subject": f"You matched {pct}% with {job.title}",
                        "htmlContent": _template("New Job Match! 🎯", body),
                    }, headers={"api-key": _s.BREVO_API_KEY, "content-type": "application/json"}, timeout=10)
                except Exception:
                    pass
        db.commit()
    finally:
        db.close()
