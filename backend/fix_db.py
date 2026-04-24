from app.core.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('ALTER TABLE candidate_profiles ADD COLUMN languages JSON;'))
    conn.commit()
    print('Column added successfully.')
