from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class LearningRoadmap(Base):
    __tablename__ = "learning_roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidate_profiles.id"), nullable=False)

    target_role = Column(String(255))
    level = Column(String(50))           # Beginner / Intermediate
    skill_gaps = Column(JSON, default=list)
    roadmap = Column(JSON, default=list)  # Full chapters JSON
    total_score_possible = Column(Integer, default=0)
    total_points_earned = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    quiz_attempts = relationship("QuizAttempt", back_populates="roadmap", cascade="all, delete-orphan")
    project_submissions = relationship("ProjectSubmission", back_populates="roadmap", cascade="all, delete-orphan")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("learning_roadmaps.id"), nullable=False)
    chapter_id = Column(String(100), nullable=False)
    score = Column(Float, default=0)    # 0-100
    passed = Column(Boolean, default=False)
    points_awarded = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    roadmap = relationship("LearningRoadmap", back_populates="quiz_attempts")


class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, ForeignKey("learning_roadmaps.id"), nullable=False)
    chapter_id = Column(String(100), nullable=False)
    github_link = Column(String(512))
    status = Column(String(20), default="pending")   # pending / PASS / FAIL
    score = Column(Integer, default=0)
    feedback = Column(Text)
    points_awarded = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    roadmap = relationship("LearningRoadmap", back_populates="project_submissions")
