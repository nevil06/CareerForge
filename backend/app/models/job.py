from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class JobSource(str, enum.Enum):
    internal = "internal"
    external = "external"


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(Enum(JobSource), default=JobSource.internal)

    company_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    company_name = Column(String(255), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(Text)
    required_skills = Column(JSON, default=list)
    experience_level = Column(String(50))
    experience_years_min = Column(Float, default=0)
    location = Column(String(255))
    salary_min = Column(Float)
    salary_max = Column(Float)
    application_link = Column(String(500))

    is_active = Column(Boolean, default=True)
    embedding = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    matches = relationship("Match", back_populates="job", foreign_keys="Match.job_id")
