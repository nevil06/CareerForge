"""
Seed script — populates the DB with sample candidates and jobs for demo purposes.
Run: python sample_data/seed.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.user import User, UserRole
from backend.app.models.candidate import CandidateProfile
from backend.app.models.job import Job, JobSource
from backend.app.core.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ---- Users ----
users = [
    User(email="alice@example.com", hashed_password=hash_password("password"), role=UserRole.candidate),
    User(email="bob@example.com",   hashed_password=hash_password("password"), role=UserRole.candidate),
    User(email="techcorp@example.com", hashed_password=hash_password("password"), role=UserRole.company),
]
for u in users:
    if not db.query(User).filter_by(email=u.email).first():
        db.add(u)
db.commit()

alice = db.query(User).filter_by(email="alice@example.com").first()
bob   = db.query(User).filter_by(email="bob@example.com").first()
corp  = db.query(User).filter_by(email="techcorp@example.com").first()

# ---- Candidate Profiles ----
if not db.query(CandidateProfile).filter_by(user_id=alice.id).first():
    db.add(CandidateProfile(
        user_id=alice.id,
        full_name="Alice Chen",
        location="San Francisco, US",
        summary="Full-stack engineer with 5 years of experience in Python and React.",
        skills=["Python", "FastAPI", "React", "PostgreSQL", "Docker", "AWS"],
        experience_years=5,
        preferred_roles=["Backend Engineer", "Full Stack Engineer"],
        experiences=[{"title": "Senior Engineer", "company": "StartupX", "duration": "3 years", "description": "Built REST APIs"}],
        education=[{"degree": "B.Sc. Computer Science", "institution": "UC Berkeley", "year": "2018"}],
    ))

if not db.query(CandidateProfile).filter_by(user_id=bob.id).first():
    db.add(CandidateProfile(
        user_id=bob.id,
        full_name="Bob Martinez",
        location="New York, US",
        summary="Data scientist specialising in ML pipelines and NLP.",
        skills=["Python", "PyTorch", "scikit-learn", "SQL", "Spark"],
        experience_years=3,
        preferred_roles=["Data Scientist", "ML Engineer"],
        experiences=[{"title": "Data Scientist", "company": "DataCo", "duration": "3 years", "description": "NLP models"}],
        education=[{"degree": "M.Sc. Data Science", "institution": "NYU", "year": "2021"}],
    ))

# ---- Jobs ----
jobs = [
    Job(company_user_id=corp.id, company_name="TechCorp", source=JobSource.internal,
        title="Backend Engineer", description="Build scalable APIs with Python and FastAPI.",
        required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        experience_years_min=3, location="San Francisco, US",
        salary_min=120000, salary_max=160000),
    Job(company_user_id=corp.id, company_name="TechCorp", source=JobSource.internal,
        title="ML Engineer", description="Deploy ML models at scale.",
        required_skills=["Python", "PyTorch", "Docker", "AWS"],
        experience_years_min=2, location="Remote"),
    Job(company_name="OpenAI", source=JobSource.external,
        title="Research Engineer", description="LLM research and fine-tuning.",
        required_skills=["Python", "PyTorch", "CUDA", "Transformers"],
        experience_years_min=4, location="San Francisco, US",
        application_link="https://openai.com/careers"),
]
for j in jobs:
    if not db.query(Job).filter_by(title=j.title, company_name=j.company_name).first():
        db.add(j)

db.commit()
db.close()
print("✅ Seed data inserted successfully.")
