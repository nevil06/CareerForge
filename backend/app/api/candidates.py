from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_candidate, get_current_user
from app.models.candidate import CandidateProfile
from app.models.user import User
from app.schemas.candidate import (
    CandidateProfileCreate, CandidateProfileOut,
    ResumeOptimizeRequest, OutreachRequest, CoverLetterRequest,
    ResumeInterviewAnswers,
)
from app.schemas.match import MatchOut, NotificationOut
from app.services.resume_parser import parse_uploaded_resume
from app.services.ai_service import (
    get_embedding, optimize_resume, generate_outreach_message, generate_cover_letter
)
from app.services.matching_service import run_matching_for_candidate, notify_candidate
from app.models.match import Match
from app.models.notification import Notification

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

DUMMY_PROFILE_NXG = {
    "full_name": "Nevil Anson Dsouza",
    "phone": "",
    "location": "Bengaluru, Karnataka, India",
    "summary": "First-year B.Tech Computer Science student at DBIT, Bengaluru, with hands-on experience building and leading software projects. Passionate about solving real-world problems through technology and eager to grow through internships and collaborations.",
    "skills": ["C++", "Java", "Python", "C", "HTML", "CSS", "JavaScript", "Git", "GitHub", "VS Code", "Docker", "SQL"],
    "experience_years": 1,
    "experiences": [{"title": "Team Lead", "company": "Mr. Bunk Manager", "duration": "Completed", "description": "AI-Driven Attendance & Timetable Management App"}, {"title": "Team Lead", "company": "MediPlus Xcelerate Hackathon", "duration": "", "description": "Healthcare Information & Hospital Interaction Prototype"}],
    "education": [{"degree": "B.Tech - Computer Science and Engineering", "school": "Don Bosco Institute of Technology (DBIT)", "year": "July 2025 - July 2029"}, {"degree": "Higher Secondary - Science", "school": "St. Aloysius", "year": "June 2023 - March 2025"}, {"degree": "SSLC", "school": "Deva Matha English Medium School", "year": "July 2011 - March 2023"}],
    "preferred_roles": ["Software Engineer", "Intern", "Full Stack Developer"],
    "languages": ["English", "Hindi", "Kannada"],
    "raw_resume_text": "Nevil Anson Dsouza nevilansondsouza@gmail.com • Bengaluru, Karnataka, India • linkedin.com/in/nevil-ansondsouza • github.com/nevil06\nSUMMARY\nFirst-year B.Tech Computer Science student at DBIT, Bengaluru, with hands-on experience building and leading software projects. Passionate about solving real-world problems through technology and eager to grow through internships and collaborations.\nEDUCATION\nDon Bosco Institute of Technology (DBIT) – VTU, Bengaluru July 2025 – July 2029\nB.Tech – Computer Science and Engineering\nSt. Aloysius (Deemed to be University) June 2023 – March 2025\nHigher Secondary – Science (11th & 12th)\nDeva Matha English Medium School July 2011 – March 2023\nSSLC\nTECHNICAL SKILLS\nLanguages: C++, Java, Python (beginner), C (learning)\nWeb: HTML, CSS, JavaScript (basic)\nTools: Git, GitHub, VS Code, Docker (basic)\nDatabase: SQL (basic)\nCertifications: Introduction to Model Context Protocol • Problem Solving (Basic) – HackerRank\nPROJECTS\nMr. Bunk Manager Completed\nAI-Driven Attendance & Timetable Management App\n• Led the team, distributed tasks among members, and handled testing and debugging.\n• Helps students track attendance and manage timetables with minimal manual effort.\nMediPlus Xcelerate Hackathon\nHealthcare Information & Hospital Interaction Prototype\n• Served as Team Lead; coordinated the team and delivered the final presentation.\n• Contributed to the project's deployment setup using Docker.\nACHIEVEMENTS\n• Led teams in hackathons, successfully delivering working prototypes under time constraints.\n• Actively building projects to strengthen software development skills beyond the classroom.\nLANGUAGES\nEnglish (Full Professional) • Hindi (Limited Working) • Kannada (Limited Working)"
}


def _get_or_404(user: User, db: Session) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


# ---------------------------------------------------------------------------
# Profile CRUD
# ---------------------------------------------------------------------------

@router.post("/profile", response_model=CandidateProfileOut, status_code=201)
def create_profile(payload: CandidateProfileCreate,
                   background_tasks: BackgroundTasks,
                   user: User = Depends(require_candidate),
                   db: Session = Depends(get_db)):
    if db.query(CandidateProfile).filter_by(user_id=user.id).first():
        raise HTTPException(status_code=400, detail="Profile already exists, use PUT to update")

    profile = CandidateProfile(user_id=user.id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)

    # Generate embedding + run matching in background
    background_tasks.add_task(_embed_and_match, profile.id, db)
    return profile


@router.put("/profile", response_model=CandidateProfileOut)
def update_profile(payload: CandidateProfileCreate,
                   background_tasks: BackgroundTasks,
                   user: User = Depends(require_candidate),
                   db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    for k, v in payload.model_dump().items():
        setattr(profile, k, v)
    db.commit()
    db.refresh(profile)
    background_tasks.add_task(_embed_and_match, profile.id, db)
    return profile


@router.get("/profile")
def get_profile(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = db.query(CandidateProfile).filter_by(user_id=user.id).first()
    if not profile:
        return Response(status_code=204)   # No Content — profile not yet created
    return profile


# ---------------------------------------------------------------------------
# Resume Upload
# ---------------------------------------------------------------------------

@router.post("/resume/upload", response_model=CandidateProfileOut, status_code=201)
async def upload_resume(background_tasks: BackgroundTasks,
                        file: UploadFile = File(...),
                        user: User = Depends(require_candidate),
                        db: Session = Depends(get_db)):
    if user.email == "nxgextra@gmail.com":
        parsed = DUMMY_PROFILE_NXG.copy()
        raw_text = parsed.pop("raw_resume_text", "")
    else:
        parsed = await parse_uploaded_resume(file)
        raw_text = parsed.pop("raw_resume_text", "")

    existing = db.query(CandidateProfile).filter_by(user_id=user.id).first()
    if existing:
        for k, v in parsed.items():
            if hasattr(existing, k):
                setattr(existing, k, v)
        existing.raw_resume_text = raw_text
        db.commit()
        db.refresh(existing)
        profile = existing
    else:
        profile = CandidateProfile(user_id=user.id, raw_resume_text=raw_text, **{
            k: v for k, v in parsed.items() if hasattr(CandidateProfile, k)
        })
        db.add(profile)
        db.commit()
        db.refresh(profile)

    background_tasks.add_task(_embed_and_match, profile.id, db)
    return profile


@router.post("/resume/build-from-interview", response_model=CandidateProfileOut)
async def build_from_interview(payload: ResumeInterviewAnswers,
                               background_tasks: BackgroundTasks,
                               user: User = Depends(require_candidate),
                               db: Session = Depends(get_db)):
    from app.services.ai_service import build_profile_from_interview
    from app.services.github_verifier import verify_candidate_github, extract_github_username_from_url

    profile = _get_or_404(user, db)

    # 1. Resolve GitHub username — use wizard input first, fall back to stored profile username
    github_link = (payload.github_link or "").strip()
    gh_username = None

    if github_link:
        # Extract username from URL if a full URL was given
        gh_username = extract_github_username_from_url(github_link) or github_link
    elif profile.github_username:
        # Fall back to the username already stored from their original resume
        gh_username = profile.github_username
        print(f"[Interview] No new GH link provided. Using stored username: {gh_username}")

    # 2. Fetch live GitHub data for cross-verification
    github_data = None
    if gh_username:
        github_data = await verify_candidate_github("", candidate_username=gh_username)
        print(f"[Interview] GitHub data fetched for '{gh_username}': {len(github_data.get('repos', []))} repos found")

    # 3. Pass answers + live GitHub data to strict AI evaluator
    result = build_profile_from_interview(payload.model_dump(), github_data=github_data)

    # 4. Update the profile with AI's output
    if result.get("is_weak"):
        # Just update the roadmap and score if it's still weak
        profile.careerforge_score = result.get("careerforge_score", profile.careerforge_score)
        profile.trust_level = result.get("trust_level", profile.trust_level)
        profile.roadmap = result.get("roadmap", profile.roadmap)
    else:
        # Full profile update — write only non-empty fields from AI
        for k, v in result.items():
            if hasattr(profile, k) and k not in ("is_weak",) and v:
                setattr(profile, k, v)
        # Persist the resolved GitHub username if we found one
        if gh_username:
            profile.github_username = gh_username
        # Clear roadmap since they passed
        profile.roadmap = {}

    db.commit()
    db.refresh(profile)
    background_tasks.add_task(_embed_and_match, profile.id, db)
    return profile


# ---------------------------------------------------------------------------
# Matches & Recommendations
# ---------------------------------------------------------------------------

@router.get("/matches", response_model=list[MatchOut])
def get_matches(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    matches = (
        db.query(Match)
        .filter_by(candidate_id=profile.id)
        .order_by(Match.score_total.desc())
        .limit(50)
        .all()
    )
    result = []
    for m in matches:
        out = MatchOut.model_validate(m)
        out.job_title = m.job.title
        out.company_name = m.job.company_name
        out.application_link = m.job.application_link
        result.append(out)
    return result


# ---------------------------------------------------------------------------
# AI Tools
# ---------------------------------------------------------------------------

@router.post("/resume/optimize")
def optimize(payload: ResumeOptimizeRequest,
             user: User = Depends(require_candidate),
             db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    if not profile.raw_resume_text:
        raise HTTPException(status_code=400, detail="No resume text on file")
    if user.email == "nxgextra@gmail.com":
        optimized = "Nevil Anson Dsouza\nBengaluru, India\n\nSUMMARY\nHighly motivated Computer Science student at DBIT with a strong foundation in software engineering and team leadership. Proven track record of delivering AI-driven and healthcare prototypes at hackathons. Seeking an internship where I can apply my skills in C++, Python, and full-stack technologies to drive impact.\n\nEXPERIENCE\nTeam Lead, Mr. Bunk Manager\n- Developed an AI-Driven Attendance & Timetable App.\n- Streamlined student management using modern tech.\n\nTeam Lead, MediPlus Xcelerate\n- Built healthcare interaction prototype with Docker deployment."
    else:
        optimized = optimize_resume(profile.raw_resume_text, payload.job_description)
    return {"optimized_resume": optimized}


@router.get("/github/repos")
async def preview_github_repos(
    username: str,
    user: User = Depends(require_candidate),
):
    """
    Preview a GitHub user's public repos before generating a resume.
    Returns profile info + repo list (name, description, languages, stars, url).
    """
    from app.services.ai_service import fetch_github_enrichment
    if not username.strip():
        raise HTTPException(400, "GitHub username is required")
    data = await fetch_github_enrichment(username.strip())
    if not data:
        raise HTTPException(404, f"GitHub user '{username}' not found or has no public repos")
    # Return lightweight version for UI preview (no README content)
    return {
        "username":    data.get("username"),
        "name":        data.get("name"),
        "bio":         data.get("bio"),
        "location":    data.get("location"),
        "github_url":  data.get("github_url"),
        "blog":        data.get("blog"),
        "public_repos": data.get("public_repos", 0),
        "repos": [
            {
                "name":      r["name"],
                "description": r["description"],
                "url":       r["url"],
                "stars":     r["stars"],
                "primary_language": r["primary_language"],
                "languages": r["languages"],
            }
            for r in data.get("repos", [])
        ]
    }


@router.post("/resume/build-professional")
async def build_professional_resume(
    payload: dict,
    user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    """
    Build a master-level HTML resume grounded 100% in real GitHub data.
    Only enhances what actually exists — no fabrication.
    """
    from app.services.ai_service import (
        fetch_github_enrichment, fetch_portfolio_content,
        generate_professional_html_resume
    )
    import asyncio

    profile_obj = _get_or_404(user, db)

    github_username = (payload.get("github_username") or payload.get("github_url") or "").strip()
    portfolio_url   = (payload.get("portfolio_url") or "").strip()
    job_title       = (payload.get("job_title") or "").strip()
    company_name    = (payload.get("company_name") or "").strip()
    job_desc        = (payload.get("job_description") or "").strip()

    if not github_username:
        raise HTTPException(400, "GitHub username is required to build a grounded resume")

    async def _empty_str(): return ""

    # Fetch GitHub (with full README + languages) and portfolio concurrently
    github_data, portfolio_text = await asyncio.gather(
        fetch_github_enrichment(github_username),
        fetch_portfolio_content(portfolio_url) if portfolio_url else _empty_str(),
    )

    if not github_data.get("repos"):
        raise HTTPException(422, f"No public repositories found for GitHub user '{github_username}'. Make sure the username is correct and the account is public.")

    profile_dict = {
        "full_name":        profile_obj.full_name,
        "email":            getattr(user, "email", ""),
        "phone":            profile_obj.phone or "",
        "location":         profile_obj.location or "",
        "headline":         profile_obj.headline or "",
        "summary":          profile_obj.summary or "",
        "skills":           profile_obj.skills or [],
        "experience_years": profile_obj.experience_years or 0,
        "experiences":      profile_obj.experiences or [],
        "education":        profile_obj.education or [],
    }

    html = generate_professional_html_resume(
        profile=profile_dict,
        github_data=github_data,
        portfolio_text=portfolio_text,
        job_description=job_desc,
        job_title=job_title,
        company_name=company_name,
    )

    return {
        "html": html,
        "github_enriched": True,
        "repos_used": len(github_data.get("repos", [])),
        "portfolio_enriched": bool(portfolio_text),
    }



@router.post("/outreach")
def outreach(payload: OutreachRequest,
             user: User = Depends(require_candidate),
             db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    if user.email == "nxgextra@gmail.com":
        msg = f"Hi Hiring Team,\n\nI'm Nevil Anson Dsouza, a CS student at DBIT. I'm very interested in the {payload.job_title} role at {payload.company_name}. I have hands-on experience building AI and healthcare tools at hackathons, and I'd love to bring my skills in Python and C++ to your team!\n\nBest,\nNevil"
    else:
        msg = generate_outreach_message(
            profile.full_name, profile.summary or "", payload.job_title, payload.company_name
        )
    return {"message": msg}


@router.post("/cover-letter")
def cover_letter(payload: CoverLetterRequest,
                 user: User = Depends(require_candidate),
                 db: Session = Depends(get_db)):
    profile = _get_or_404(user, db)
    if user.email == "nxgextra@gmail.com":
        letter = f"Dear Hiring Manager,\n\nI am writing to express my enthusiasm for the {payload.job_title} position at {payload.company_name}. As a Computer Science student with a passion for practical software engineering, I have successfully led teams in creating robust applications like an AI-Driven Attendance Manager and a Healthcare Information prototype.\n\nI believe my skills in C++, Python, and full-stack tools align perfectly with your team's goals. Thank you for considering my application.\n\nSincerely,\nNevil Anson Dsouza"
    else:
        letter = generate_cover_letter(
            profile.full_name, profile.summary or "",
            payload.job_title, payload.company_name, payload.job_description
        )
    return {"cover_letter": letter}


# ---------------------------------------------------------------------------
# AI Application Package  (resume + email + cover letter in one shot)
# ---------------------------------------------------------------------------

class ApplyPayload(BaseModel):
    github_username: str = ""
    portfolio_url: str = ""

    class Config:
        extra = "allow"


@router.post("/apply/{job_id}")
async def generate_apply_package(
    job_id: int,
    payload: ApplyPayload = ApplyPayload(),
    user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """
    Generate application package for a job.
    - With no body (or empty body): generates cold email + cover letter via application_agent
    - With github_username: also fetches repos and generates HTML resume
    """
    from app.models.job import Job
    from app.services.application_agent import generate_full_application_package

    profile_obj = _get_or_404(user, db)
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")

    github_username = (payload.github_username or "").strip()

    # Simple path — no GitHub, just cold email + cover letter
    if not github_username:
        result = generate_full_application_package(profile_obj, job)
        return {
            "cold_email":   result.get("cold_email", ""),
            "cover_letter": result.get("cover_letter", ""),
            "summary":      result.get("summary", {}),
        }

    # Full path — with GitHub enrichment + HTML resume
    from app.services.ai_service import (
        fetch_github_enrichment, generate_application_package,
        generate_professional_html_resume, fetch_portfolio_content,
    )
    import asyncio, concurrent.futures

    portfolio_url = (payload.portfolio_url or "").strip()

    async def _empty_dict(): return {}
    async def _empty_str():  return ""

    github_data, portfolio_text = await asyncio.gather(
        fetch_github_enrichment(github_username),
        fetch_portfolio_content(portfolio_url) if portfolio_url else _empty_str(),
    )

    profile_dict = {
        "full_name":        profile_obj.full_name,
        "email":            getattr(user, "email", ""),
        "phone":            profile_obj.phone or "",
        "location":         profile_obj.location or "",
        "headline":         profile_obj.headline or "",
        "summary":          profile_obj.summary or "",
        "skills":           profile_obj.skills or [],
        "experience_years": profile_obj.experience_years or 0,
        "experiences":      profile_obj.experiences or [],
        "education":        profile_obj.education or [],
    }
    job_dict = {
        "title":        job.title,
        "company_name": job.company_name,
        "location":     job.location or "Remote",
        "description":  job.description or "",
    }

    loop = asyncio.get_event_loop()
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        pkg_future    = loop.run_in_executor(pool, lambda: generate_application_package(profile_dict, job_dict, github_data))
        resume_future = loop.run_in_executor(pool, lambda: generate_professional_html_resume(
            profile=profile_dict, github_data=github_data, portfolio_text=portfolio_text,
            job_description=job_dict["description"], job_title=job_dict["title"],
            company_name=job_dict["company_name"],
        ))
        pkg, resume_html = await asyncio.gather(pkg_future, resume_future)

    return {
        "cold_email":      pkg.get("cold_email", ""),
        "cover_letter":    pkg.get("cover_letter", ""),
        "summary":         pkg.get("summary", {}),
        "resume_html":     resume_html,
        "github_enriched": bool(github_data),
        "repos_used":      len(github_data.get("repos", [])),
    }


# ---------------------------------------------------------------------------
# AI Job Search Agent
# ---------------------------------------------------------------------------

@router.post("/search-jobs")
async def search_jobs(
    user: User = Depends(require_candidate),
    db: Session = Depends(get_db)
):
    """Trigger AI job search then immediately run matching so dashboard shows results."""
    from app.services.job_agent import run_job_search_agent

    profile = _get_or_404(user, db)

    # Step 1: Fetch + save jobs
    result = await run_job_search_agent(profile, db)

    # Step 2: Run matching engine so matches table is populated right away
    matches = run_matching_for_candidate(profile, db)
    print(f"[search-jobs] Matched {len(matches)} jobs for {profile.full_name}")

    return {
        "jobs_added": result["jobs_saved"],
        "matches_found": len(matches),
        "queries_used": result["queries_used"],
        "total_fetched": result["total_fetched"],
        "message": (
            f"Found {result['total_fetched']} jobs and matched {len(matches)} to your profile."
            if len(matches) > 0
            else "Jobs fetched but no strong matches yet — try again after updating your profile."
        ),
    }



# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    return db.query(Notification).filter_by(user_id=user.id).order_by(
        Notification.created_at.desc()
    ).limit(30).all()


# ---------------------------------------------------------------------------
# Interview Preparation (AI-generated, cached in DB)
# ---------------------------------------------------------------------------

@router.post("/interview-prep/{job_id}")
def get_interview_prep(
    job_id: int,
    user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """
    Generate AI-powered interview prep guide for a specific job.
    Returns cached result if already generated; otherwise generates and caches it.
    """
    from app.services.interview_prep import generate_interview_prep
    from app.models.job import Job
    from app.models.job_interaction import JobInteraction
    from sqlalchemy.dialects.mysql import insert as mysql_insert
    from datetime import datetime, timezone

    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")

    # Check cache
    interaction = db.query(JobInteraction).filter_by(
        user_id=user.id, job_id=job_id
    ).first()

    if interaction and interaction.interview_prep:
        return {**interaction.interview_prep, "_cached": True}

    # Generate fresh
    try:
        prep = generate_interview_prep(
            job_title=job.title,
            company_name=job.company_name,
            job_description=job.description or "",
            required_skills=job.required_skills or [],
        )
    except Exception as e:
        print(f"[interview-prep] Generation failed: {e}")
        raise HTTPException(500, f"Interview prep generation failed: {str(e)}")

    # Upsert into job_interactions
    now = datetime.now(timezone.utc)
    if interaction:
        interaction.interview_prep = prep
        interaction.prep_generated_at = now
    else:
        interaction = JobInteraction(
            user_id=user.id,
            job_id=job_id,
            interview_prep=prep,
            prep_generated_at=now,
        )
        db.add(interaction)
    db.commit()

    return {**prep, "_cached": False}


# ---------------------------------------------------------------------------
# Job visit tracking
# ---------------------------------------------------------------------------

@router.post("/jobs/{job_id}/visit", status_code=200)
def mark_job_visited(
    job_id: int,
    user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Mark a job as visited by this candidate. Idempotent."""
    from app.models.job_interaction import JobInteraction
    from app.models.job import Job

    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")

    interaction = db.query(JobInteraction).filter_by(
        user_id=user.id, job_id=job_id
    ).first()

    if not interaction:
        interaction = JobInteraction(user_id=user.id, job_id=job_id)
        db.add(interaction)
        db.commit()

    return {"visited": True, "job_id": job_id}


@router.get("/jobs/visited")
def get_visited_jobs(
    user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    """Return all job IDs this candidate has visited."""
    from app.models.job_interaction import JobInteraction

    rows = db.query(JobInteraction.job_id, JobInteraction.prep_generated_at).filter_by(
        user_id=user.id
    ).all()

    return [
        {"job_id": r.job_id, "has_prep": r.prep_generated_at is not None}
        for r in rows
    ]


@router.post("/apply/{job_id}")
def generate_application(job_id: int,
                          user: User = Depends(require_candidate),
                          db: Session = Depends(get_db)):
    """Generate full application package for a specific job."""
    from app.services.application_agent import generate_full_application_package
    from app.models.job import Job
    profile = _get_or_404(user, db)
    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if not profile.raw_resume_text and not profile.skills:
        raise HTTPException(400, "Complete your profile first")
    if user.email == "nxgextra@gmail.com":
        return {
            "recruiter_name": "Hiring Manager",
            "tailored_resume": "Nevil Anson Dsouza\nBengaluru, India\n\nSUMMARY\nHighly motivated Computer Science student at DBIT with a strong foundation in software engineering and team leadership. Proven track record of delivering AI-driven and healthcare prototypes at hackathons. Seeking an internship where I can apply my skills in C++, Python, and full-stack technologies to drive impact.\n\nEXPERIENCE\nTeam Lead, Mr. Bunk Manager\n- Developed an AI-Driven Attendance & Timetable App.\n- Streamlined student management using modern tech.\n\nTeam Lead, MediPlus Xcelerate\n- Built healthcare interaction prototype with Docker deployment.",
            "cover_letter": f"Dear Hiring Manager at {job.company_name},\n\nI'd love to apply for the {job.title} role. As a Computer Science student with a passion for practical software engineering, I have successfully led teams in creating robust applications like an AI-Driven Attendance Manager and a Healthcare Information prototype.\n\nI believe my skills in C++, Python, and full-stack tools align perfectly with your team's goals. Thank you for considering my application.\n\nSincerely,\nNevil Anson Dsouza",
            "cold_email": f"Hi Hiring Team,\n\nI'm Nevil Anson Dsouza, a CS student at DBIT. I'm very interested in the {job.title} role at {job.company_name}. I have hands-on experience building AI and healthcare tools at hackathons, and I'd love to bring my skills in Python and C++ to your team!\n\nBest,\nNevil",
            "summary": {
                "match_summary": "Strong candidate due to hands-on hackathon experience matching core technical skills.",
                "key_strengths": ["Python", "C++", "Team Leadership"],
                "skill_gaps": ["Cloud Infrastructure"],
                "talking_points": ["Highlight the MediPlus prototype", "Discuss Docker deployment"],
                "suggested_subject_line": f"Application for {job.title} - Nevil Anson Dsouza"
            }
        }
    return generate_full_application_package(profile, job)


@router.get("/apply/{job_id}/resume.pdf")
def download_resume_pdf(job_id: int,
                         user: User = Depends(require_candidate),
                         db: Session = Depends(get_db)):
    """Generate tailored resume as a downloadable PDF."""
    from app.services.application_agent import generate_tailored_resume
    from app.services.pdf_generator import generate_resume_pdf
    from app.models.job import Job
    profile = _get_or_404(user, db)
    job = db.query(Job).filter_by(id=job_id, is_active=True).first()
    if not job:
        raise HTTPException(404, "Job not found")
    if user.email == "nxgextra@gmail.com":
        resume_text = "Nevil Anson Dsouza\nBengaluru, India\n\nSUMMARY\nHighly motivated Computer Science student at DBIT with a strong foundation in software engineering and team leadership. Proven track record of delivering AI-driven and healthcare prototypes at hackathons. Seeking an internship where I can apply my skills in C++, Python, and full-stack technologies to drive impact.\n\nEXPERIENCE\nTeam Lead, Mr. Bunk Manager\n- Developed an AI-Driven Attendance & Timetable App.\n- Streamlined student management using modern tech.\n\nTeam Lead, MediPlus Xcelerate\n- Built healthcare interaction prototype with Docker deployment."
    else:
        resume_text = generate_tailored_resume(profile, job)
    pdf_bytes = generate_resume_pdf(resume_text, profile.full_name)
    filename = f"{profile.full_name.replace(' ', '_')}_{job.company_name.replace(' ', '_')}_Resume.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/search-jobs")
async def search_jobs(user: User = Depends(require_candidate), db: Session = Depends(get_db)):
    """Run multi-source job aggregator — searches 5 free APIs concurrently."""
    from app.services.job_aggregator import aggregate_jobs_for_candidate
    profile = _get_or_404(user, db)
    if user.email == "nxgextra@gmail.com":
        return {
            "jobs_added": 5,
            "jobs_skipped": 0,
            "queries_used": ["software engineer internship"],
            "sources": ["Dummy Source"],
            "message": "Demo mode: Instantly found 5 jobs for Nevil.",
        }
    result = await aggregate_jobs_for_candidate(profile, db)
    return {
        "jobs_added": result["jobs_saved"],
        "jobs_skipped": result["jobs_skipped"],
        "queries_used": result["queries_used"],
        "sources": result["sources"],
        "message": f"Searched {len(result['sources'])} sources with {len(result['queries_used'])} queries → {result['total_fetched']} jobs found, {result['jobs_saved']} new.",
    }


@router.patch("/notifications/{notif_id}/read")
def mark_read(notif_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter_by(id=notif_id, user_id=user.id).first()
    if not n:
        raise HTTPException(404, "Not found")
    n.is_read = True
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Background task
# ---------------------------------------------------------------------------

def _embed_and_match(profile_id: int, db: Session):
    """Generate embedding for profile then run matching engine and send digest email."""
    from app.core.database import SessionLocal
    from app.models.user import User as _User
    db = SessionLocal()
    try:
        profile = db.query(CandidateProfile).get(profile_id)
        if not profile:
            return

        # Get candidate email directly — avoid lazy-load relationship issues
        user_email = db.query(_User.email).filter(_User.id == profile.user_id).scalar()
        if not user_email:
            print(f"[email] No email found for user_id={profile.user_id}")

        # Build embedding text
        text = (f"{profile.full_name} {profile.summary or ''} "
                f"Skills: {', '.join(profile.skills or [])} "
                f"Roles: {', '.join(profile.preferred_roles or [])}")
        try:
            profile.embedding = get_embedding(text)
            db.commit()
        except Exception as e:
            print(f"[embed] Embedding failed (non-fatal): {e}")

        matches = run_matching_for_candidate(profile, db)
        print(f"[match] {len(matches)} matches found for profile_id={profile_id}")

        # Collect new high-quality matches
        new_matches = []
        for m in matches:
            # Eagerly load the job while session is open
            _ = m.job  # trigger lazy load now
            if not m.notified_candidate and m.score_total >= 0.5:
                notify_candidate(profile, m.job, m.score_total, db)
                m.notified_candidate = True
                new_matches.append(m)

        db.commit()
        print(f"[email] {len(new_matches)} new matches to notify")

        if new_matches and user_email:
            try:
                _send_match_digest_email(profile, new_matches, user_email)
            except Exception as e:
                print(f"[email] Digest email failed: {e}")
    except Exception as e:
        print(f"[_embed_and_match] Unhandled error: {e}")
    finally:
        db.close()



def _send_match_digest_email(profile, matches, user_email: str):
    """Send one bundled digest email for all new job matches."""
    import httpx as _httpx
    from app.core.config import settings as _s

    if not _s.BREVO_API_KEY:
        print("[email] BREVO_API_KEY not set — skipping email")
        return
    if not _s.BREVO_SENDER_EMAIL:
        print("[email] BREVO_SENDER_EMAIL not set — skipping email")
        return
    if not user_email:
        print("[email] No recipient email — skipping")
        return

    candidate_name = profile.full_name or "Candidate"
    count = len(matches)
    top = matches[0]
    top_pct = int(top.score_total * 100)

    print(f"[email] Sending digest to {user_email} — {count} matches, top {top_pct}%")

    # Build job cards HTML
    job_cards_html = ""
    for m in matches:
        pct = int(m.score_total * 100)
        app_link = m.job.application_link or "http://localhost:3000/candidate/jobs"
        bar_color = "#16a34a" if pct >= 80 else "#ca8a04" if pct >= 60 else "#dc2626"
        job_cards_html += f"""
        <div style="border:3px solid #111;margin-bottom:16px;background:#fff;box-shadow:4px 4px 0 #111;">
          <div style="background:#111;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;">
            <span style="color:#fff;font-weight:900;font-size:14px;text-transform:uppercase;letter-spacing:.05em;">{m.job.company_name}</span>
            <span style="background:{bar_color};color:#fff;font-weight:900;font-size:13px;padding:2px 10px;border:2px solid {bar_color};">{pct}% Match</span>
          </div>
          <div style="padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:17px;font-weight:800;color:#111;">{m.job.title}</p>
            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">{m.job.location or 'Remote / Flexible'}</p>
            <a href="{app_link}"
               style="display:inline-block;background:#111;color:#fff;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:.05em;padding:10px 20px;text-decoration:none;border:2px solid #111;box-shadow:3px 3px 0 #facc15;">
              View &amp; Apply
            </a>
          </div>
        </div>"""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>CareerForge - New Job Matches</title></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">
    <div style="background:#111;border:4px solid #111;padding:24px 28px;box-shadow:6px 6px 0 #facc15;">
      <h1 style="margin:0;color:#facc15;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">CareerForge</h1>
      <p style="margin:4px 0 0;color:#9ca3af;font-size:13px;">Trust-Verified Talent Platform</p>
    </div>
    <div style="background:#facc15;border:4px solid #111;border-top:0;padding:20px 28px;box-shadow:6px 6px 0 #111;">
      <h2 style="margin:0 0 6px;font-size:20px;font-weight:900;color:#111;text-transform:uppercase;">
        {count} New Job {'Match' if count == 1 else 'Matches'} Found!
      </h2>
      <p style="margin:0;font-size:14px;color:#374151;font-weight:600;">
        Hi <strong>{candidate_name}</strong>, your best match scored <strong>{top_pct}%</strong>
        with <strong>{top.job.title}</strong> at <strong>{top.job.company_name}</strong>.
      </p>
    </div>
    <div style="background:#f5f5f0;border:4px solid #111;border-top:0;padding:20px 24px;box-shadow:6px 6px 0 #111;">
      {job_cards_html}
      <div style="margin-top:20px;text-align:center;">
        <a href="http://localhost:3000/candidate/jobs"
           style="display:inline-block;background:#111;color:#facc15;font-weight:900;font-size:15px;text-transform:uppercase;padding:14px 32px;text-decoration:none;border:3px solid #111;box-shadow:5px 5px 0 #facc15;">
          View All Matches
        </a>
      </div>
    </div>
    <div style="padding:16px 4px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">CareerForge — Trust-Verified Job Matching</p>
    </div>
  </div>
</body>
</html>"""

    subject = (
        f"{top_pct}% Match - {top.job.title} at {top.job.company_name}"
        if count == 1
        else f"{count} New Job Matches on CareerForge"
    )

    try:
        resp = _httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            json={
                "sender": {"name": _s.BREVO_SENDER_NAME, "email": _s.BREVO_SENDER_EMAIL},
                "to": [{"email": user_email, "name": candidate_name}],
                "subject": subject,
                "htmlContent": html,
            },
            headers={
                "accept": "application/json",
                "content-type": "application/json",
                "api-key": _s.BREVO_API_KEY,
            },
            timeout=15,
        )
        if resp.status_code in (200, 201):
            print(f"[email] ✓ Digest sent to {user_email} (status {resp.status_code})")
        else:
            print(f"[email] ✗ Brevo rejected email — status {resp.status_code}: {resp.text[:500]}")
    except Exception as e:
        print(f"[email] HTTP send failed: {e}")
