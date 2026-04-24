from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class MatchOut(BaseModel):
    id: int
    candidate_id: int
    job_id: int
    score_total: float
    score_skill: float
    score_experience: float
    score_role: float
    score_location: float
    score_semantic: float
    matched_skills: List[str]
    missing_skills: List[str]
    created_at: datetime

    # Joined fields (populated by service layer)
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    application_link: Optional[str] = None
    candidate_name: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
