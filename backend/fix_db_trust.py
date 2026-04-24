from sqlalchemy import text
from app.core.database import engine

def apply_migrations():
    print("Applying Trust Engine database migrations...")
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN careerforge_score FLOAT DEFAULT 0;"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN trust_level VARCHAR(50) DEFAULT 'Low';"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN headline VARCHAR(255);"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN github_username VARCHAR(255);"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN missing_proof JSON;"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN projects JSON;"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN verified_skills JSON;"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN strength_tags JSON;"))
            conn.execute(text("ALTER TABLE candidate_profiles ADD COLUMN roadmap JSON;"))
            print("Successfully added new columns to candidate_profiles.")
        except Exception as e:
            # Columns might already exist, ignore errors like Duplicate Column
            print(f"Migration completed or columns already exist: {e}")

if __name__ == "__main__":
    apply_migrations()
