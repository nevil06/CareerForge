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
    skills: Optional[List[str]] = []
    experience_years: float = 0
    experiences: Optional[List[ExperienceItem]] = []
    education: Optional[List[EducationItem]] = []
    preferred_roles: Optional[List[str]] = []
    languages: Optional[List[str]] = []
    
    # Trust Engine Profile
    careerforge_score: Optional[float] = 0
    trust_level: Optional[str] = "Low"
    headline: Optional[str] = None
    github_username: Optional[str] = None
    missing_proof: Optional[List[Any]] = []
    projects: Optional[List[Any]] = []
    verified_skills: Optional[List[Any]] = []
    strength_tags: Optional[List[str]] = []
    roadmap: Optional[dict] = {}

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

class ResumeInterviewAnswers(BaseModel):
    complex_problem: str
    project_from_scratch: str
    core_languages: str
    github_link: Optional[str] = None
