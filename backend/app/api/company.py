"""Company dashboard endpoints — stats, notifications, candidate search."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_company
from app.models.user import User
from app.models.job import Job
from app.models.match import Match
from app.models.notification import Notification
from app.schemas.match import NotificationOut

router = APIRouter(prefix="/api/company", tags=["company"])


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


@router.get("/notifications", response_model=list[NotificationOut])
def notifications(user: User = Depends(require_company), db: Session = Depends(get_db)):
    return db.query(Notification).filter_by(user_id=user.id).order_by(
        Notification.created_at.desc()
    ).limit(30).all()
