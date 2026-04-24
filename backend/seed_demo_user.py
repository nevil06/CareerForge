import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.match import Match
from app.core.security import hash_password
from app.api.candidates import DUMMY_PROFILE_NXG

def seed_demo():
    db = SessionLocal()
    try:
        # 1. Create or update user
        email = "nxgextra@gmail.com"
        user = db.query(User).filter_by(email=email).first()
        if not user:
            print(f"Creating demo user {email}...")
            user = User(
                email=email,
                hashed_password=hash_password("mithun"),
                role="candidate",
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            print(f"Demo user {email} already exists.")
            # Ensure password is correct
            user.hashed_password = hash_password("mithun")
            db.commit()

        # 2. Create Candidate Profile
        profile = db.query(CandidateProfile).filter_by(user_id=user.id).first()
        if not profile:
            print("Creating dummy candidate profile...")
            # We copy DUMMY_PROFILE_NXG, remove 'raw_resume_text' since it's added separately or matches the model
            profile_data = DUMMY_PROFILE_NXG.copy()
            raw_text = profile_data.pop("raw_resume_text", "")
            
            profile = CandidateProfile(
                user_id=user.id,
                raw_resume_text=raw_text,
                **profile_data
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        else:
            print("Candidate profile already exists.")

        # 3. Create a couple of realistic dummy jobs for the demo
        dummy_jobs = [
            {
                "title": "Software Engineering Intern", 
                "company_name": "Razorpay", 
                "location": "Bengaluru", 
                "is_active": True,
                "description": "We are looking for a passionate Software Engineering Intern to join our core payments team. You will work on building scalable microservices in Python. Experience with Git, Docker, and REST APIs is highly valued. You will collaborate with senior engineers to optimize our transaction pipeline and reduce latency."
            },
            {
                "title": "Backend Developer Intern", 
                "company_name": "CRED", 
                "location": "Bengaluru", 
                "is_active": True,
                "description": "Join CRED to build high-performance backend systems. The ideal candidate has strong fundamentals in C++, Java or Python, and understands basic database architecture (SQL). You will help build and test our rewards API and work closely with product managers to deliver features."
            },
            {
                "title": "SDE Intern", 
                "company_name": "Flipkart", 
                "location": "Bengaluru", 
                "is_active": True,
                "description": "Flipkart is seeking an SDE intern to join the search and discovery team. As an intern, you will contribute to our robust e-commerce platform. Familiarity with HTML, CSS, JavaScript, and backend logic is required. You will be actively involved in debugging, testing, and writing clean, scalable code."
            }
        ]
        
        job_ids = []
        for jdata in dummy_jobs:
            job = db.query(Job).filter_by(title=jdata["title"], company_name=jdata["company_name"]).first()
            if not job:
                job_args = jdata.copy()
                job = Job(**job_args)
                db.add(job)
                db.commit()
                db.refresh(job)
            job_ids.append(job.id)

        # 4. Create Match records for the demo user
        print("Creating dummy job matches...")
        for j_id in job_ids:
            match = db.query(Match).filter_by(candidate_id=profile.id, job_id=j_id).first()
            if not match:
                match = Match(
                    candidate_id=profile.id,
                    job_id=j_id,
                    score_total=0.95,
                    score_skill=0.90,
                    score_experience=1.0,
                    missing_skills=["Cloud"]
                )
                db.add(match)
        db.commit()

        print("✅ Demo user 'nxgextra@gmail.com' (password: mithun) successfully seeded!")
        print("✅ All slow AI operations and API calls are now bypassed for this user.")

    except Exception as e:
        print(f"Error seeding demo user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo()
