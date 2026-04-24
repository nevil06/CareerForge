from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        conn.execute(text('ALTER TABLE candidate_profiles ADD COLUMN improvement_tips JSON;'))
        conn.commit()
        print('Column improvement_tips added successfully.')
    except Exception as e:
        if "Duplicate column name" in str(e):
            print('Column improvement_tips already exists — skipping.')
        else:
            raise
