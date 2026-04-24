import sys
import os
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base, engine
from sqlalchemy import text

# Import ALL models so metadata is fully populated
from app.models.user import User
from app.models.candidate import CandidateProfile
from app.models.company import CompanyProfile
from app.models.job import Job
from app.models.match import Match
from app.models.notification import Notification
from app.models.learning import LearningRoadmap, QuizAttempt, ProjectSubmission


def reset_database():
    print("WARNING: This will drop all tables and delete all data.")
    confirm = input("Are you sure you want to proceed? (y/n): ")

    if confirm.lower() != 'y':
        print("Database reset aborted.")
        return

    print("Dropping all tables using raw SQL (bypasses metadata locks)...")

    # Drop order matters — children first, then parents
    DROP_ORDER = [
        "project_submissions",
        "quiz_attempts",
        "learning_roadmaps",
        "matches",
        "notifications",
        "jobs",
        "candidate_profiles",
        "company_profiles",
        "users",
    ]

    with engine.connect() as conn:
        # Disable FK checks so drops don't fail on constraints
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))

        for table in DROP_ORDER:
            for attempt in range(3):
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS `{table}`;"))
                    print(f"  ✓ Dropped {table}")
                    break
                except Exception as e:
                    if attempt < 2:
                        print(f"  ⚠ Retrying {table} in 2s... ({e})")
                        time.sleep(2)
                    else:
                        print(f"  ✗ Failed to drop {table}: {e}")

        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()

    print("\nRecreating all tables with latest schema...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database reset complete — ready for fresh start.")


if __name__ == "__main__":
    reset_database()
