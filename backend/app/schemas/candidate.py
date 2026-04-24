from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    year: str = ""


class CandidateProfileCreate(BaseModel):
    full_name: str
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    experience_years: float = 0
    experiences: List[ExperienceItem] = []
    education: List[EducationItem] = []
    preferred_roles: List[str] = []
    languages: List[str] = []


class CandidateProfileOut(CandidateProfileCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ResumeOptimizeRequest(BaseModel):
    job_description: str


class OutreachRequest(BaseModel):
    job_title: str
    company_name: str


class CoverLetterRequest(BaseModel):
    job_title: str
    company_name: str
    job_description: str
