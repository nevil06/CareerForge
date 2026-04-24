from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class AgentRequest(BaseModel):
    action: str                          # generate_roadmap | generate_quiz | evaluate_quiz | generate_project | verify_project
    user_interests: Optional[str] = ""
    skills: Optional[List[str]] = []
    current_score: Optional[float] = 0
    chapter_id: Optional[str] = ""
    chapter_title: Optional[str] = ""
    concepts: Optional[List[str]] = []
    quiz_score: Optional[float] = 0
    github_link: Optional[str] = ""
    verification_rules: Optional[dict] = {}


class RoadmapOut(BaseModel):
    id: int
    candidate_id: int
    target_role: Optional[str]
    level: Optional[str]
    skill_gaps: Optional[List[Any]] = []
    roadmap: Optional[List[Any]] = []
    total_score_possible: int = 0
    total_points_earned: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class QuizAttemptOut(BaseModel):
    id: int
    roadmap_id: int
    chapter_id: str
    score: float
    passed: bool
    points_awarded: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectSubmissionOut(BaseModel):
    id: int
    roadmap_id: int
    chapter_id: str
    github_link: Optional[str]
    status: str
    score: int
    feedback: Optional[str]
    points_awarded: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
