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
    filename = (file.filename or "").lower()

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

    analysis = trust_profile.get("analysis", {})
    structured["projects"] = analysis.get("projects", [])

    profile = trust_profile.get("profile", {})
    structured["headline"] = profile.get("headline", "")
    structured["summary"] = profile.get("bio", structured.get("summary", ""))
    structured["verified_skills"] = profile.get("verified_skills", [])
    structured["strength_tags"] = profile.get("strength_tags", [])

    return structured
