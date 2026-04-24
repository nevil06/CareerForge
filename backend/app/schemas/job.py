from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.job import JobSource


class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None
    required_skills: List[str] = []
    experience_level: Optional[str] = None
    experience_years_min: float = 0
    location: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    application_link: Optional[str] = None


class JobOut(JobCreate):
    id: int
    company_name: str
    source: JobSource
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
