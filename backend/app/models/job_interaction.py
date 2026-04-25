from sqlalchemy import Column, Integer, ForeignKey, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class JobInteraction(Base):
    """Tracks a candidate's interaction with a job — visit state + cached interview prep."""
    __tablename__ = "job_interactions"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_user_job_interaction"),
    )

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id         = Column(Integer, ForeignKey("jobs.id",  ondelete="CASCADE"), nullable=False, index=True)
    visited_at     = Column(DateTime(timezone=True), server_default=func.now())
    interview_prep = Column(JSON, nullable=True)          # cached AI-generated prep
    prep_generated_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    job  = relationship("Job",  foreign_keys=[job_id])
