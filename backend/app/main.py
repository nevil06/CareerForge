from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api import candidates, jobs, company

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Carrier-Forge", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(candidates.router)
app.include_router(jobs.router)
app.include_router(company.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}
