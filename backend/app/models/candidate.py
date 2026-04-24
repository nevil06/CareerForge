from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    location = Column(String(255))
    summary = Column(Text)

    skills = Column(JSON, default=list)
    experience_years = Column(Float, default=0)
    experiences = Column(JSON, default=list)
    education = Column(JSON, default=list)
    preferred_roles = Column(JSON, default=list)
    languages = Column(JSON, default=list)

    raw_resume_text = Column(Text)
    embedding = Column(JSON)

    # Trust Engine Profile
    careerforge_score = Column(Float, default=0)
    trust_level = Column(String(50), default="Low")
    headline = Column(String(255))
    github_username = Column(String(255))
    missing_proof = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    verified_skills = Column(JSON, default=list)
    strength_tags = Column(JSON, default=list)
    roadmap = Column(JSON, default=dict)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="candidate_profile")
    matches = relationship("Match", back_populates="candidate", foreign_keys="Match.candidate_id")
