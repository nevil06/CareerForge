from sqlalchemy import Column, Integer, Float, JSON, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)

    # Scoring breakdown
    score_total = Column(Float, nullable=False)       # 0.0 – 1.0
    score_skill = Column(Float, default=0.0)
    score_experience = Column(Float, default=0.0)
    score_role = Column(Float, default=0.0)
    score_location = Column(Float, default=0.0)
    score_semantic = Column(Float, default=0.0)       # embedding cosine sim

    matched_skills = Column(JSON, default=list)       # skills that overlapped
    missing_skills = Column(JSON, default=list)

    # Status flags
    notified_candidate = Column(Boolean, default=False)
    notified_company = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    candidate = relationship("CandidateProfile", back_populates="matches", foreign_keys=[candidate_id])
    job = relationship("Job", back_populates="matches", foreign_keys=[job_id])
