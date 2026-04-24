from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CompanyProfile(Base):
    __tablename__ = "company_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    company_name = Column(String(255), nullable=False)
    industry = Column(String(255))
    size = Column(String(50))          # "1-10", "11-50", "51-200", "201-500", "500+"
    website = Column(String(500))
    location = Column(String(255))
    description = Column(Text)
    logo_url = Column(String(500))

    # What they look for
    hiring_roles = Column(JSON, default=list)     # ["Backend Engineer", "ML Engineer"]
    required_skills = Column(JSON, default=list)  # ["Python", "React"]
    culture_tags = Column(JSON, default=list)     # ["remote-friendly", "fast-paced"]

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
