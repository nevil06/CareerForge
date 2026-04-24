"""
AI Application Agent
====================
Given a candidate profile + job, generates:
1. Tailored resume (rewritten for the specific job)
2. Cold outreach email (to recruiter/hiring manager)
3. Cover letter (formal, 3 paragraphs)
4. Application summary (key talking points)

All powered by GLM-5.1 via Z.AI
"""
from app.services.ai_service import _chat
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.core.config import settings


def _profile_text(candidate: CandidateProfile) -> str:
    exps = "\n".join(
        f"- {e.get('title')} at {e.get('company')} ({e.get('duration')}): {e.get('description')}"
        for e in (candidate.experiences or [])
    )
    edu = "\n".join(
        f"- {e.get('degree')} from {e.get('institution')} ({e.get('year')})"
        for e in (candidate.education or [])
    )
    return f"""
Name: {candidate.full_name}
Location: {candidate.location or 'Not specified'}
Summary: {candidate.summary or ''}
Skills: {', '.join(candidate.skills or [])}
Experience ({candidate.experience_years} years):
{exps or 'Not provided'}
Education:
{edu or 'Not provided'}
Preferred Roles: {', '.join(candidate.preferred_roles or [])}
""".strip()


def _job_text(job: Job) -> str:
    return f"""
Job Title: {job.title}
Company: {job.company_name}
Location: {job.location or 'Not specified'}
Required Skills: {', '.join(job.required_skills or [])}
Experience Required: {job.experience_years_min or 0}+ years
Description: {(job.description or '')[:1500]}
""".strip()


# ---------------------------------------------------------------------------
# 1. Tailored Resume
# ---------------------------------------------------------------------------

def generate_tailored_resume(candidate: CandidateProfile, job: Job) -> str:
    prompt = f"""You are an expert resume writer.
Rewrite the candidate's resume specifically tailored for the job below.
Rules:
- Keep all facts truthful — only rephrase, reorder, and emphasise relevant experience
- Lead with the most relevant skills and experience for this role
- Use strong action verbs and quantify achievements where possible
- Format as clean plain text with clear sections: Summary, Skills, Experience, Education
- Keep it concise (1 page equivalent)

=== JOB ===
{_job_text(job)}

=== CANDIDATE PROFILE ===
{_profile_text(candidate)}

Return ONLY the resume text, no commentary."""

    return _chat([{"role": "user", "content": prompt}],
                 model=settings.GLM_CODER_MODEL, temperature=0.4)


# ---------------------------------------------------------------------------
# 2. Cold Outreach Email
# ---------------------------------------------------------------------------

def generate_cold_email(candidate: CandidateProfile, job: Job,
                         recruiter_name: str = "") -> str:
    greeting = f"Hi {recruiter_name}," if recruiter_name else "Hi,"
    prompt = f"""Write a compelling cold outreach email from {candidate.full_name} to a recruiter at {job.company_name} for the {job.title} role.

Rules:
- Start with: {greeting}
- Max 150 words — short, punchy, human
- Mention 2-3 specific skills that match the job
- Show genuine interest in the company/role
- End with a clear call to action (schedule a call)
- Do NOT use generic phrases like "I am writing to express my interest"
- Tone: confident, warm, professional

=== JOB ===
{_job_text(job)}

=== CANDIDATE ===
{_profile_text(candidate)}

Return ONLY the email body (no subject line)."""

    return _chat([{"role": "user", "content": prompt}], temperature=0.6)


# ---------------------------------------------------------------------------
# 3. Cover Letter
# ---------------------------------------------------------------------------

def generate_cover_letter_for_job(candidate: CandidateProfile, job: Job) -> str:
    prompt = f"""Write a professional cover letter for {candidate.full_name} applying to {job.title} at {job.company_name}.

Structure:
- Paragraph 1: Hook — why this specific company/role excites them
- Paragraph 2: Evidence — 2-3 concrete achievements that match the job requirements
- Paragraph 3: Close — enthusiasm + call to action

Rules:
- Max 250 words
- Specific to this job, not generic
- Reference actual skills from the job description
- Professional but not stiff

=== JOB ===
{_job_text(job)}

=== CANDIDATE ===
{_profile_text(candidate)}

Return ONLY the cover letter text."""

    return _chat([{"role": "user", "content": prompt}], temperature=0.5)


# ---------------------------------------------------------------------------
# 4. Application Summary (talking points)
# ---------------------------------------------------------------------------

def generate_application_summary(candidate: CandidateProfile, job: Job) -> dict:
    prompt = f"""Analyse this candidate's fit for the job and return a JSON object with:
{{
  "match_summary": "2-sentence summary of why they are a good fit",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "skill_gaps": ["gap 1", "gap 2"],
  "talking_points": ["point 1", "point 2", "point 3"],
  "suggested_subject_line": "email subject line"
}}

=== JOB ===
{_job_text(job)}

=== CANDIDATE ===
{_profile_text(candidate)}

Return ONLY valid JSON."""

    import json, re
    content = _chat([{"role": "user", "content": prompt}], temperature=0.3)
    try:
        content = re.sub(r"```(?:json)?", "", content).strip()
        return json.loads(content)
    except Exception:
        return {
            "match_summary": "Strong candidate for this role.",
            "key_strengths": candidate.skills[:3] if candidate.skills else [],
            "skill_gaps": [],
            "talking_points": [],
            "suggested_subject_line": f"Application for {job.title} — {candidate.full_name}",
        }


# ---------------------------------------------------------------------------
# Full package
# ---------------------------------------------------------------------------

def extract_recruiter_name(job: Job) -> str:
    """Try to extract recruiter or hiring manager name from job description."""
    if not job.description:
        return ""
    prompt = f"""Look at this job posting and extract the recruiter or hiring manager's first name if mentioned.
Return ONLY the first name as a plain string, or empty string "" if not found.
Examples: "Sarah", "John", ""

Job posting:
{job.description[:1000]}"""
    try:
        name = _chat([{"role": "user", "content": prompt}], temperature=0.1).strip()
        # Validate — should be a short name, not a sentence
        if name and len(name) < 30 and name != '""' and name != "''":
            return name.strip('"\'')
    except Exception:
        pass
    return ""


def generate_full_application_package(candidate: CandidateProfile, job: Job,
                                        recruiter_name: str = "") -> dict:
    """Generate all application materials in one call."""
    # Auto-detect recruiter name if not provided
    if not recruiter_name:
        recruiter_name = extract_recruiter_name(job)

    return {
        "recruiter_name": recruiter_name,  # return it so frontend can show it
        "tailored_resume": generate_tailored_resume(candidate, job),
        "cold_email": generate_cold_email(candidate, job, recruiter_name),
        "cover_letter": generate_cover_letter_for_job(candidate, job),
        "summary": generate_application_summary(candidate, job),
    }
