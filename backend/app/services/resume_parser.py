"""
Resume Parser — extracts raw text from PDF / DOCX, then calls AI service.
"""
import io
from fastapi import UploadFile
import fitz  # pymupdf
from docx import Document
from app.services.ai_service import parse_resume as ai_parse_resume, generate_trust_profile
from app.services.github_verifier import verify_candidate_github

def extract_text_from_pdf(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)

def extract_text_from_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)

async def parse_uploaded_resume(file: UploadFile) -> dict:
    """Read uploaded file, extract text, and run the CareerForge Trust Engine."""
    data = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(data)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(data)
    else:
        text = data.decode("utf-8", errors="ignore")

    # Step 1: Base extraction (Name, Email, Phone, basic structure)
    structured = ai_parse_resume(text)
    
    # Step 2: Fetch actual GitHub data
    github_data = await verify_candidate_github(text)
    
    # Step 3: Run the Trust + Profile Engine
    trust_profile = generate_trust_profile(text, github_data)
    
    # Step 4: Merge results
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
