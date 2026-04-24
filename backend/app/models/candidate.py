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

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="candidate_profile")
    matches = relationship("Match", back_populates="candidate", foreign_keys="Match.candidate_id")
