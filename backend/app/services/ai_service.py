"""
AI Service — Z.AI via OpenAI-compatible endpoint
Base URL : https://api.z.ai/api/coding/paas/v4
SDK      : openai (standard)
Models   : glm-4-flash (chat/code), embedding-3 (embeddings)
"""
import json
import re
import math
from openai import OpenAI
from app.core.config import settings

client = OpenAI(
    api_key=settings.ZHIPU_API_KEY,
    base_url="https://api.z.ai/api/coding/paas/v4",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _chat(messages: list[dict], model: str = None, temperature: float = 0.3) -> str:
    model = model or settings.GLM_MODEL
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    return resp.choices[0].message.content.strip()


def _extract_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in model response:\n{text}")
    return json.loads(match.group())


# ---------------------------------------------------------------------------
# Resume Parsing
# ---------------------------------------------------------------------------

RESUME_PARSE_PROMPT = """You are an expert HR data extractor.
Given the raw resume text below, extract a structured JSON profile with these exact keys:
{{
  "full_name": "",
  "email": "",
  "phone": "",
  "location": "",
  "summary": "",
  "skills": [],
  "experience_years": 0,
  "experiences": [{{"title": "", "company": "", "duration": "", "description": ""}}],
  "education": [{{"degree": "", "institution": "", "year": ""}}],
  "preferred_roles": [],
  "languages": []
}}
Return ONLY valid JSON, no markdown fences.

Resume text:
{resume_text}"""

TRUST_ENGINE_PROMPT = """You are "CareerForge AI", an advanced Resume Analysis, Verification, and Profile Generation Agent.

Your purpose is to build a TRUSTED professional profile from a user's resume by analyzing their raw resume text alongside verified GitHub repository data.

 CORE PRINCIPLE:
- Never assume claims are true
- Verification is ALWAYS confidence-based
- If proof is missing or invalid → mark it clearly
- Do NOT fabricate achievements

## INPUT
You will receive:
- Parsed resume JSON / text
- Verified GitHub data (repos, languages, activity)

## RULES
1. Link Validation & GitHub Verification: Use the provided GitHub data. If a repo matches a project, check if they own it or if it's a fork. High commits/activity = strong signal. Empty/fork = weak signal.
2. Skill Authenticity: Map skills to the GitHub languages provided. If they claim "React" but their GitHub has 0 JavaScript/TypeScript repos, that's LOW confidence.
3. CareerForge Score (0-100): Weighted calculation based on verified projects and skill authenticity.
4. Profile Generation: Generate a headline, bio, and strength tags based ONLY on verified/high-confidence data. Do NOT include unverified weak projects.
5. Missing Proof: If they claim a project but no GitHub data supports it, add a message asking for the link. If no GitHub username was found at all, add a message asking for it.
6. Roadmap Generation: IF `careerforge_score` < 70 OR `trust_level` == "Low", generate a `roadmap` object containing a `direct_message` (bluntly explaining why their score is low) and `action_steps` (3-4 specific technical things to build/do to improve).

## OUTPUT FORMAT (STRICT JSON ONLY)
{{
  "analysis": {{
    "projects": [
      {{
        "name": "",
        "status": "verified_strong | verified_partial | weak | invalid_link | unverified",
        "confidence_score": 0,
        "ownership": "strong | partial | none",
        "notes": ""
      }}
    ],
    "skills": [
      {{
        "name": "",
        "confidence": "high | medium | low",
        "evidence": ""
      }}
    ]
  }},
  "careerforge_score": 0,
  "trust_level": "High | Medium | Low",
  "profile": {{
    "headline": "",
    "bio": "",
    "verified_skills": [],
    "highlight_projects": [],
    "strength_tags": []
  }},
  "missing_proof": [
    {{
      "type": "project | github | link",
      "name": "",
      "message": ""
    }}
  ],
  "roadmap": {{
    "direct_message": "",
    "action_steps": [""]
  }},
  "summary": ""
}}

--- RESUME CONTENT ---
{resume_text}

--- VERIFIED GITHUB DATA ---
{github_data}
"""

def parse_resume(resume_text: str) -> dict:
    prompt = RESUME_PARSE_PROMPT.format(resume_text=resume_text[:6000])
    content = _chat([{"role": "user", "content": prompt}], temperature=0.1)
    return _extract_json(content)

def generate_trust_profile(resume_text: str, github_data: dict) -> dict:
    prompt = TRUST_ENGINE_PROMPT.format(
        resume_text=resume_text[:4000],
        github_data=json.dumps(github_data, indent=2)
    )
    content = _chat([{"role": "user", "content": prompt}], temperature=0.2)
    return _extract_json(content)


# ---------------------------------------------------------------------------
# Resume Optimization
# ---------------------------------------------------------------------------

def optimize_resume(resume_text: str, job_description: str) -> str:
    prompt = f"""You are a professional resume writer.
Rewrite the candidate's resume to better match the job description below.
Keep it truthful — only rephrase and reorder, do not invent experience.
Return the optimized resume as plain text.

--- JOB DESCRIPTION ---
{job_description[:2000]}

--- ORIGINAL RESUME ---
{resume_text[:4000]}"""
    return _chat([{"role": "user", "content": prompt}], model=settings.GLM_CODER_MODEL)


# ---------------------------------------------------------------------------
# Outreach & Cover Letter
# ---------------------------------------------------------------------------

def generate_outreach_message(candidate_name: str, candidate_summary: str,
                               job_title: str, company_name: str) -> str:
    prompt = f"""Write a concise, professional outreach message (150 words max) from {candidate_name} to a recruiter at {company_name}
for the role of {job_title}.
Candidate summary: {candidate_summary}
Tone: confident, friendly, not generic."""
    return _chat([{"role": "user", "content": prompt}])


def generate_cover_letter(candidate_name: str, candidate_summary: str,
                           job_title: str, company_name: str,
                           job_description: str) -> str:
    prompt = f"""Write a professional cover letter (3 short paragraphs) for {candidate_name} applying to {job_title} at {company_name}.
Candidate summary: {candidate_summary}
Job description excerpt: {job_description[:1500]}"""
    return _chat([{"role": "user", "content": prompt}])


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

def get_embedding(text: str) -> list[float] | None:
    """Returns embedding vector or None if model unavailable."""
    try:
        resp = client.embeddings.create(
            model=settings.GLM_EMBEDDING_MODEL,
            input=text[:2048],
        )
        return resp.data[0].embedding
    except Exception:
        return None  # embeddings optional — matching works without them


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
