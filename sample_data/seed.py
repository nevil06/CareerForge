"""
Seed script — populates the DB with sample candidates, companies and jobs.
Run: python sample_data/seed.py  (from backend folder with venv active)
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

from app.core.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.candidate import CandidateProfile
from app.models.job import Job, JobSource
from app.core.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ── Users ──────────────────────────────────────────────────────────────────
users_data = [
    dict(email="alice@example.com",      role=UserRole.candidate),
    dict(email="bob@example.com",        role=UserRole.candidate),
    dict(email="techcorp@example.com",   role=UserRole.company),
    dict(email="startupxyz@example.com", role=UserRole.company),
]
for u in users_data:
    if not db.query(User).filter_by(email=u["email"]).first():
        db.add(User(hashed_password=hash_password("password123"), **u))
db.commit()

alice  = db.query(User).filter_by(email="alice@example.com").first()
bob    = db.query(User).filter_by(email="bob@example.com").first()
corp   = db.query(User).filter_by(email="techcorp@example.com").first()
start  = db.query(User).filter_by(email="startupxyz@example.com").first()

# ── Candidate Profiles ─────────────────────────────────────────────────────
if not db.query(CandidateProfile).filter_by(user_id=alice.id).first():
    db.add(CandidateProfile(
        user_id=alice.id, full_name="Alice Chen",
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
        user_id=bob.id, full_name="Bob Martinez",
        location="New York, US",
        summary="Data scientist specialising in ML pipelines and NLP.",
        skills=["Python", "PyTorch", "scikit-learn", "SQL", "Spark", "TensorFlow"],
        experience_years=3,
        preferred_roles=["Data Scientist", "ML Engineer"],
        experiences=[{"title": "Data Scientist", "company": "DataCo", "duration": "3 years", "description": "NLP models"}],
        education=[{"degree": "M.Sc. Data Science", "institution": "NYU", "year": "2021"}],
    ))

# ── Jobs ───────────────────────────────────────────────────────────────────
jobs_data = [
    dict(company_user_id=corp.id, company_name="TechCorp", source=JobSource.internal,
         title="Backend Engineer",
         description="Build scalable REST APIs with Python and FastAPI. Work with PostgreSQL and Docker in a cloud-native environment.",
         required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
         experience_years_min=3, location="San Francisco, US",
         salary_min=120000, salary_max=160000),

    dict(company_user_id=corp.id, company_name="TechCorp", source=JobSource.internal,
         title="ML Engineer",
         description="Deploy and monitor ML models at scale. Build data pipelines and work with PyTorch.",
         required_skills=["Python", "PyTorch", "Docker", "AWS", "SQL"],
         experience_years_min=2, location="Remote",
         salary_min=130000, salary_max=170000),

    dict(company_user_id=start.id, company_name="StartupXYZ", source=JobSource.internal,
         title="Full Stack Developer",
         description="Build product features end-to-end using React and Node.js. Fast-paced startup environment.",
         required_skills=["React", "Node.js", "TypeScript", "PostgreSQL"],
         experience_years_min=2, location="New York, US",
         salary_min=100000, salary_max=140000),

    dict(company_user_id=start.id, company_name="StartupXYZ", source=JobSource.internal,
         title="Data Scientist",
         description="Analyse user behaviour data and build recommendation models using Python and scikit-learn.",
         required_skills=["Python", "scikit-learn", "SQL", "Pandas", "Spark"],
         experience_years_min=2, location="Remote",
         salary_min=110000, salary_max=150000),

    dict(company_name="Google", source=JobSource.external,
         title="Software Engineer III",
         description="Work on large-scale distributed systems. Strong CS fundamentals required.",
         required_skills=["Python", "Go", "Distributed Systems", "SQL"],
         experience_years_min=4, location="Mountain View, US",
         application_link="https://careers.google.com"),

    dict(company_name="Stripe", source=JobSource.external,
         title="Backend Engineer",
         description="Build payment infrastructure used by millions. Python and AWS experience preferred.",
         required_skills=["Python", "AWS", "PostgreSQL", "Docker", "Redis"],
         experience_years_min=3, location="Remote",
         application_link="https://stripe.com/jobs"),

    dict(company_name="Hugging Face", source=JobSource.external,
         title="ML Research Engineer",
         description="Work on open-source ML models and transformers library.",
         required_skills=["Python", "PyTorch", "Transformers", "CUDA", "NLP"],
         experience_years_min=3, location="Remote",
         application_link="https://huggingface.co/jobs"),

    dict(company_name="Vercel", source=JobSource.external,
         title="Frontend Engineer",
         description="Build the future of web development tooling with React and Next.js.",
         required_skills=["React", "Next.js", "TypeScript", "CSS", "Node.js"],
         experience_years_min=2, location="Remote",
         application_link="https://vercel.com/careers"),
]

added = 0
for jd in jobs_data:
    if not db.query(Job).filter_by(title=jd["title"], company_name=jd["company_name"]).first():
        db.add(Job(**jd))
        added += 1

db.commit()
db.close()

print(f"✅ Seed complete — {added} jobs added.")
print("   Accounts (password: password123):")
print("   - alice@example.com      (candidate)")
print("   - bob@example.com        (candidate)")
print("   - techcorp@example.com   (company)")
print("   - startupxyz@example.com (company)")
