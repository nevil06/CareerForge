"""
Resume Parser — extracts raw text from PDF / DOCX, then calls AI service.
"""
import io
import re as _re
import asyncio
from fastapi import UploadFile
import fitz  # pymupdf
from docx import Document
from app.services.ai_service import parse_resume as ai_parse_resume, generate_trust_profile
from app.services.github_verifier import verify_candidate_github


# ── URL extraction helpers ────────────────────────────────────────────────────
# Catches both full URLs (https://github.com/user) and bare ones (github.com/user)
_URL_RE = _re.compile(
    r'(?:https?://)?(?:www\.)?'
    r'(?:github\.com|linkedin\.com|gitlab\.com|bitbucket\.org)'
    r'/[^\s\]\[<>"\'(),;:]{2,}',
    _re.IGNORECASE
)

def _scan_urls(text: str) -> list[str]:
    """Regex scan for profile/portfolio URLs anywhere in text."""
    return [m.group(0).rstrip(".,;)>\"'") for m in _URL_RE.finditer(text)]


# ── PDF extractor ─────────────────────────────────────────────────────────────

def extract_text_from_pdf(data: bytes) -> str:
    """
    Three-strategy PDF extraction so no link is missed regardless of how
    the resume was generated (Canva, Overleaf, Google Docs, Word→PDF, etc.):

    1. Proper PDF annotation links — `get_links()` filtered to kind=2 (LINK_URI)
    2. Regex scan on each page's visible text (bare `github.com/user` patterns)
    3. Regex scan on full concatenated text (catches split-across-page edge cases)
    """
    doc = fitz.open(stream=data, filetype="pdf")
    pages_text: list[str] = []
    all_urls: set[str] = set()

    for page in doc:
        page_text = page.get_text()
        pages_text.append(page_text)

        # Strategy 1: annotation links (kind=2 = external URI)
        for link in page.get_links():
            if link.get("kind") == 2:
                uri = link.get("uri", "").strip()
                if uri:
                    all_urls.add(uri)

        # Strategy 2: regex over this page's visible text
        for url in _scan_urls(page_text):
            all_urls.add(url)

    full_text = "\n".join(pages_text)

    # Strategy 3: regex over the full document text
    for url in _scan_urls(full_text):
        all_urls.add(url)

    if all_urls:
        full_text += "\n\n--- EMBEDDED LINKS ---\n" + "\n".join(sorted(all_urls))

    return full_text


# ── DOCX extractor ────────────────────────────────────────────────────────────

def extract_text_from_docx(data: bytes) -> str:
    """
    Two-strategy DOCX extraction:

    1. Document relationship table (rel._target) — stores href behind hyperlinked text
    2. Regex scan on paragraph text — catches bare-typed URLs
    """
    doc = Document(io.BytesIO(data))
    paragraphs_text = [p.text for p in doc.paragraphs]
    full_text = "\n".join(paragraphs_text)

    all_urls: set[str] = set()

    # Strategy 1: relationship hyperlinks
    try:
        for rel in doc.part.rels.values():
            if "hyperlink" in rel.reltype:
                try:
                    target = rel._target or str(rel.target_ref)
                    if target and target.startswith("http"):
                        all_urls.add(target.strip())
                except Exception:
                    pass
    except Exception:
        pass

    # Strategy 2: regex over visible text
    for url in _scan_urls(full_text):
        all_urls.add(url)

    if all_urls:
        full_text += "\n\n--- EMBEDDED LINKS ---\n" + "\n".join(sorted(all_urls))

    return full_text


# ── Main async entry point ────────────────────────────────────────────────────

async def parse_uploaded_resume(file: UploadFile) -> dict:
    """
    Read uploaded file, extract text, then run AI parse + GitHub fetch
    CONCURRENTLY before running the Trust Engine.

    Timeline (before):  [AI parse] → [GH fetch] → [Trust Engine]  ~15-20s
    Timeline (after):   [AI parse]
                        [GH fetch]  ← parallel                      ~8-10s
                            ↓
                        [Trust Engine]
    """
    data = await file.read()
    filename = (file.filename or "").lower().strip()

    # ── Demo bypass: return pre-built high-score profiles ─────────────────
    _DEMO_PROFILES = {
        "nevil-dummy": {
            "full_name": "Nevil Shah",
            "email": "nevil@example.com",
            "phone": "+91 9876543210",
            "location": "Ahmedabad, Gujarat",
            "summary": "Fullstack developer with 3 years of experience building scalable web applications using React, Next.js, FastAPI and PostgreSQL. Passionate about clean architecture and shipping great products.",
            "skills": ["Python", "FastAPI", "React", "Next.js", "TypeScript", "PostgreSQL", "Docker", "REST APIs", "Git", "Tailwind CSS"],
            "experience_years": 3,
            "experiences": [
                {"title": "Fullstack Developer", "company": "TechVenture Pvt. Ltd.", "duration": "2022 – Present", "description": "Built REST APIs with FastAPI, designed React dashboards, managed PostgreSQL schemas, deployed on AWS EC2."},
                {"title": "Junior Developer", "company": "Startup Hub", "duration": "2021 – 2022", "description": "Developed internal tools in Django, integrated third-party payment APIs, wrote unit tests."}
            ],
            "education": [{"degree": "B.E. Computer Engineering", "institution": "Gujarat Technological University", "year": "2021"}],
            "preferred_roles": ["Fullstack Developer", "Backend Engineer", "Python Developer"],
            "languages": ["English", "Hindi", "Gujarati"],
            "github_username": "nevil-dev",
            "careerforge_score": 78,
            "trust_level": "High",
            "headline": "Fullstack Developer — Python · React · FastAPI",
            "verified_skills": ["Python", "FastAPI", "React", "Next.js", "PostgreSQL", "Docker"],
            "strength_tags": ["API Design", "Fullstack", "Cloud Deployment", "Clean Code"],
            "projects": [
                {"name": "CareerForge Web App", "status": "verified_strong", "confidence_score": 90, "ownership": "strong", "notes": "Fullstack project built with Next.js + FastAPI"},
                {"name": "Task Manager API", "status": "verified_partial", "confidence_score": 75, "ownership": "strong", "notes": "REST API with JWT auth and PostgreSQL"}
            ],
            "missing_proof": [],
            "roadmap": {},
            "improvement_tips": {
                "quote": "You have solid fullstack skills and real project experience — adding a live deployed URL for your main project would push your score into the 85+ range.",
                "action_steps": [
                    "Deploy your CareerForge or Task Manager project on Railway or Vercel and link it in your resume.",
                    "Add a well-written README with architecture overview and setup instructions to your main GitHub repo.",
                    "Include a brief section on system design decisions (why FastAPI over Django, why PostgreSQL over MongoDB) to show depth."
                ]
            },
            "raw_resume_text": "Demo profile — Nevil Dummy",
        },
        "satish-v": {
            "full_name": "Satish Verma",
            "email": "satish.v@example.com",
            "phone": "+91 9988776655",
            "location": "Bangalore, Karnataka",
            "summary": "Backend engineer with 4+ years specialising in Python microservices, Kafka-based event pipelines, and cloud infrastructure on AWS. Strong track record of building high-throughput APIs in fintech.",
            "skills": ["Python", "Django", "FastAPI", "Kafka", "Redis", "AWS", "PostgreSQL", "Docker", "Kubernetes", "CI/CD", "Linux"],
            "experience_years": 4,
            "experiences": [
                {"title": "Senior Backend Engineer", "company": "FinPay Technologies", "duration": "2021 – Present", "description": "Architected Kafka-based event pipeline processing 2M events/day. Led migration from monolith to microservices. Owned PostgreSQL schema design and query optimisation."},
                {"title": "Backend Developer", "company": "CloudSoft Solutions", "duration": "2019 – 2021", "description": "Built Django REST APIs for e-commerce platform, integrated payment gateways, implemented Redis caching layer."}
            ],
            "education": [{"degree": "B.Tech Computer Science", "institution": "VTU Bangalore", "year": "2019"}],
            "preferred_roles": ["Backend Engineer", "Python Developer", "Platform Engineer"],
            "languages": ["English", "Hindi", "Kannada"],
            "github_username": "satish-v-dev",
            "careerforge_score": 84,
            "trust_level": "High",
            "headline": "Senior Backend Engineer — Python · Kafka · AWS · Microservices",
            "verified_skills": ["Python", "FastAPI", "Django", "Kafka", "Redis", "AWS", "PostgreSQL", "Docker", "Kubernetes"],
            "strength_tags": ["Microservices", "Event-Driven Architecture", "High Throughput", "Fintech", "Cloud Infrastructure"],
            "projects": [
                {"name": "Kafka Event Pipeline", "status": "verified_strong", "confidence_score": 92, "ownership": "strong", "notes": "2M events/day, built at FinPay"},
                {"name": "E-commerce API Platform", "status": "verified_strong", "confidence_score": 85, "ownership": "strong", "notes": "Django + Redis + payment gateway integration"}
            ],
            "missing_proof": [],
            "roadmap": {},
            "improvement_tips": {
                "quote": "Your backend depth is impressive — a public GitHub repo showcasing the Kafka pipeline with documentation would make this profile exceptional.",
                "action_steps": [
                    "Create a public GitHub repo with a simplified version of your Kafka event pipeline architecture as a portfolio showcase.",
                    "Write a Medium or Dev.to article about your monolith-to-microservices migration — it demonstrates leadership beyond code.",
                    "Add AWS certifications (e.g. AWS Solutions Architect Associate) to formally back your cloud expertise."
                ]
            },
            "raw_resume_text": "Demo profile — Satish V",
        },
    }

    # Match on filename stem (without extension, case-insensitive)
    stem = filename
    for ext in (".pdf", ".docx", ".doc", ".txt"):
        if stem.endswith(ext):
            stem = stem[: -len(ext)]
    stem = stem.strip()

    if stem in _DEMO_PROFILES:
        return _DEMO_PROFILES[stem]
    # ── End demo bypass ───────────────────────────────────────────────────

    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(data)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(data)
    else:
        text = data.decode("utf-8", errors="ignore")

    # Step 1 & 2: AI parse + GitHub fetch run IN PARALLEL
    loop = asyncio.get_event_loop()
    structured, github_data = await asyncio.gather(
        loop.run_in_executor(None, ai_parse_resume, text),
        verify_candidate_github(text),
    )

    # Step 3: Trust Engine (needs both results above)
    trust_profile = await loop.run_in_executor(None, generate_trust_profile, text, github_data)

    # Step 4: Merge
    structured["raw_resume_text"] = text
    structured["github_username"] = github_data.get("username")
    structured["careerforge_score"] = trust_profile.get("careerforge_score", 0)
    structured["trust_level"] = trust_profile.get("trust_level", "Low")
    structured["missing_proof"] = trust_profile.get("missing_proof", [])
    structured["roadmap"] = trust_profile.get("roadmap", {})
    structured["improvement_tips"] = trust_profile.get("improvement_tips", {})

    analysis = trust_profile.get("analysis", {})
    structured["projects"] = analysis.get("projects", [])

    profile = trust_profile.get("profile", {})
    structured["headline"] = profile.get("headline", "")
    structured["summary"] = profile.get("bio", structured.get("summary", ""))
    structured["verified_skills"] = profile.get("verified_skills", [])
    structured["strength_tags"] = profile.get("strength_tags", [])

    return structured

