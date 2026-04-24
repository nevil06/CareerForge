from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_candidate, get_current_user
from app.models.candidate import CandidateProfile
from app.models.user import User
from app.schemas.candidate import (
    CandidateProfileCreate, CandidateProfileOut,
    ResumeOptimizeRequest, OutreachRequest, CoverLetterRequest,
)
from app.schemas.match import MatchOut, NotificationOut
from app.services.resume_parser import parse_uploaded_resume
from app.services.ai_service import (
    get_embedding, optimize_resume, generate_outreach_message, generate_cover_letter
)
from app.services.matching_service import run_matching_for_candidate, notify_candidate
from app.models.match import Match
from app.models.notification import Notification

router = APIRouter(prefix="/api/candidates", tags=["candidates"])


def _get_or_404(user: User, db: Session) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# ---------------------------------------------------------------------------
# Profile CRUD
# ---------------------------------------------------------------------------

@router.post("/profile", response_model=CandidateProfileOut, status_code=201)
def create_profile(payload: CandidateProfileCreate,
                   background_tasks: BackgroundTasks,
                   user: User = Depends(require_candidate),
                   db: Session = Depends(get_db)):
    if db.query(CandidateProfile).filter_by(user_id=user.id).first():
        raise HTTPException(status_code=400, detail="Profile already exists, use PUT to update")

    profile = CandidateProfile(user_id=user.id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)

    # Generate embedding + run matching in background
    background_tasks.add_task(_embed_and_match, profile.id, db)
    return profile


@router.put("/profile", response_model=CandidateProfileOut)
def update_profile(payload: CandidateProfileCreate,
                   background_tasks: BackgroundTasks,
                   user: User = Depends(require_candidate),
                   db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    for k, v in payload.model_dump().items():
        setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    background_tasks.add_task(_embed_and_match, profile.id, db)
    return profile


@router.get("/profile", response_model=CandidateProfileOut)
def get_profile(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    return _get_or_404(user, db)


# ---------------------------------------------------------------------------
# Resume Upload
# ---------------------------------------------------------------------------

@router.post("/resume/upload", response_model=CandidateProfileOut, status_code=201)
async def upload_resume(background_tasks: BackgroundTasks,
                        file: UploadFile = File(...),
                        user: User = Depends(require_candidate),
                        db: Session = Depends(get_db)):
    parsed = await parse_uploaded_resume(file)
    raw_text = parsed.pop("raw_resume_text", "")

    existing = db.query(CandidateProfile).filter_by(user_id=user.id).first()
    if existing:
        for k, v in parsed.items():
            if hasattr(existing, k):
                setattr(existing, k, v)
        existing.raw_resume_text = raw_text
        db.commit()
        db.refresh(existing)
        profile = existing
    else:
        profile = CandidateProfile(user_id=user.id, raw_resume_text=raw_text, **{
            k: v for k, v in parsed.items() if hasattr(CandidateProfile, k)
        })
        db.add(profile)
        db.commit()
        db.refresh(profile)

    background_tasks.add_task(_embed_and_match, profile.id, db)
    return profile


# ---------------------------------------------------------------------------
# Matches & Recommendations
# ---------------------------------------------------------------------------

@router.get("/matches", response_model=list[MatchOut])
def get_matches(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    matches = (
        db.query(Match)
        .filter_by(candidate_id=profile.id)
        .order_by(Match.score_total.desc())
        .limit(50)
        .all()
    )
    result = []
    for m in matches:
        out = MatchOut.model_validate(m)
        out.job_title = m.job.title
        out.company_name = m.job.company_name
        out.application_link = m.job.application_link
        result.append(out)
    return result


# ---------------------------------------------------------------------------
# AI Tools
# ---------------------------------------------------------------------------

@router.post("/resume/optimize")
def optimize(payload: ResumeOptimizeRequest,
             user: User = Depends(require_candidate),
             db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    if not profile.raw_resume_text:
        raise HTTPException(status_code=400, detail="No resume text on file")
    optimized = optimize_resume(profile.raw_resume_text, payload.job_description)
    return {"optimized_resume": optimized}


@router.post("/outreach")
def outreach(payload: OutreachRequest,
             user: User = Depends(require_candidate),
             db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    msg = generate_outreach_message(
        profile.full_name, profile.summary or "", payload.job_title, payload.company_name
    )
    return {"message": msg}


@router.post("/cover-letter")
def cover_letter(payload: CoverLetterRequest,
                 user: User = Depends(require_candidate),
                 db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    letter = generate_cover_letter(
        profile.full_name, profile.summary or "",
        payload.job_title, payload.company_name, payload.job_description
    )
    return {"cover_letter": letter}


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    return db.query(Notification).filter_by(user_id=user.id).order_by(
        Notification.created_at.desc()
    ).limit(30).all()


@router.post("/apply/{job_id}")
def generate_application(job_id: int,
                          user: User = Depends(require_candidate),
                          db: Session = Depends(get_db)):
    """Generate full application package for a specific job."""
    from app.services.application_agent import generate_full_application_package
    from app.models.job import Job
    profile = _get_or_404(user, db)
    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if not profile.raw_resume_text and not profile.skills:
        raise HTTPException(400, "Complete your profile first")
    return generate_full_application_package(profile, job)


@router.get("/apply/{job_id}/resume.pdf")
def download_resume_pdf(job_id: int,
                         user: User = Depends(require_candidate),
                         db: Session = Depends(get_db)):
    """Generate tailored resume as a downloadable PDF."""
    from app.services.application_agent import generate_tailored_resume
    from app.services.pdf_generator import generate_resume_pdf
    from app.models.job import Job
    profile = _get_or_404(user, db)
    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")
    resume_text = generate_tailored_resume(profile, job)
    pdf_bytes = generate_resume_pdf(resume_text, profile.full_name)
    filename = f"{profile.full_name.replace(' ', '_')}_{job.company_name.replace(' ', '_')}_Resume.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/search-jobs")
async def search_jobs(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    """Run multi-source job aggregator — searches 5 free APIs concurrently."""
    from app.services.job_aggregator import aggregate_jobs_for_candidate
    profile = _get_or_404(user, db)
    result = await aggregate_jobs_for_candidate(profile, db)
    return {
        "jobs_added": result["jobs_saved"],
        "jobs_skipped": result["jobs_skipped"],
        "queries_used": result["queries_used"],
        "sources": result["sources"],
        "message": f"Searched {len(result['sources'])} sources with {len(result['queries_used'])} queries → {result['total_fetched']} jobs found, {result['jobs_saved']} new.",
    }


@router.patch("/notifications/{notif_id}/read")
def mark_read(notif_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter_by(id=notif_id, user_id=user.id).first()
    if not n:
        raise HTTPException(404, "Not found")
    n.is_read = True
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _embed_and_match(profile_id: int, db: Session):
    """Generate embedding for profile then run matching engine."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        profile = db.query(CandidateProfile).get(profile_id)
        if not profile:
            return
        # Build text representation for embedding
        text = f"{profile.full_name} {profile.summary or ''} " \
               f"Skills: {', '.join(profile.skills or [])} " \
               f"Roles: {', '.join(profile.preferred_roles or [])}"
        try:
            profile.embedding = get_embedding(text)
            db.commit()
        except Exception:
            pass  # embedding optional

        matches = run_matching_for_candidate(profile, db)
        for m in matches:
            if not m.notified_candidate and m.score_total >= 0.5:
                notify_candidate(profile, m.job, m.score_total, db)
                m.notified_candidate = True
                # Fire-and-forget email (best effort)
                try:
                    import httpx as _httpx
                    from app.services.email_service import _template, BREVO_API_URL
                    from app.core.config import settings as _s
                    pct = int(m.score_total * 100)
                    body = f"<p>Hi <strong>{profile.full_name}</strong>, you matched <strong>{pct}%</strong> with <strong>{m.job.title}</strong> at {m.job.company_name}.</p>"
                    _httpx.post(BREVO_API_URL, json={
                        "sender": {"name": _s.BREVO_SENDER_NAME, "email": _s.BREVO_SENDER_EMAIL},
                        "to": [{"email": profile.user.email, "name": profile.full_name}],
                        "subject": f"You matched {pct}% with {m.job.title}",
                        "htmlContent": _template("New Job Match! 🎯", body),
                    }, headers={"api-key": _s.BREVO_API_KEY, "content-type": "application/json"}, timeout=10)
                except Exception:
                    pass
        db.commit()
    finally:
        db.close()
