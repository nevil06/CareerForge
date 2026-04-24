import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base, engine
from app.models.user import User
from app.models.candidate import CandidateProfile
from app.models.company import CompanyProfile
from app.models.job import Job
from app.models.match import Match
from app.models.notification import Notification

def reset_database():
    print("WARNING: This will drop all tables and delete all data.")
    confirm = input("Are you sure you want to proceed? (y/n): ")
    
    if confirm.lower() == 'y':
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        print("Recreating all tables with the latest schema...")
        Base.metadata.create_all(bind=engine)
        
        print("Database has been successfully reset! You are ready to start fresh.")
    else:
        print("Database reset aborted.")

if __name__ == "__main__":
    reset_database()
