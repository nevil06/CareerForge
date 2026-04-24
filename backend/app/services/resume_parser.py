"""
Resume Parser — extracts raw text from PDF / DOCX, then calls AI service.
"""
import io
from fastapi import UploadFile
import fitz  # pymupdf
from docx import Document
from app.services.ai_service import parse_resume as ai_parse_resume


def extract_text_from_pdf(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def extract_text_from_docx(data: bytes) -> str:
    doc = Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)


async def parse_uploaded_resume(file: UploadFile) -> dict:
    """Read uploaded file, extract text, call GLM to parse into structured dict."""
    data = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(data)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(data)
    else:
        text = data.decode("utf-8", errors="ignore")

    structured = ai_parse_resume(text)
    structured["raw_resume_text"] = text
    return structured
