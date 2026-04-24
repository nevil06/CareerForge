import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.user import User
from app.models.candidate import CandidateProfile

def check_db():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        profiles = db.query(CandidateProfile).all()
        
        print("--- DATABASE DIAGNOSTICS ---")
        print(f"Total Users in DB: {len(users)}")
        for u in users:
            print(f"  - User ID: {u.id}, Email: {u.email}")
            
        print(f"\nTotal Candidate Profiles in DB: {len(profiles)}")
        for p in profiles:
            print(f"  - Profile ID: {p.id}, User ID: {p.user_id}, Name: {p.full_name}, Score: {p.careerforge_score}")
            
        print("\nIf these numbers are 0, the database was wiped (or you are connecting to a different database instance).")
    except Exception as e:
        print(f"Database connection error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
