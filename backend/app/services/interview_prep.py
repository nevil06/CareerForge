"""
Interview Preparation Generator
Generates a structured interview prep guide using the job description and company name.
"""
import json
import re
from openai import OpenAI
from app.core.config import settings

client = OpenAI(
    api_key=settings.ZHIPU_API_KEY,
    base_url="https://api.z.ai/api/coding/paas/v4",
)

_SYSTEM = "You are a strict JSON-only API. Output ONLY valid JSON. No markdown, no explanation."


def _chat(messages: list[dict], temperature: float = 0.3) -> str:
    resp = client.chat.completions.create(
        model=settings.GLM_CODER_MODEL,
        messages=messages,
        temperature=temperature,
    )
    return resp.choices[0].message.content.strip()


def _extract_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?", "", text).strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in response:\n{text}")
    return json.loads(match.group())


def generate_interview_prep(
    job_title: str,
    company_name: str,
    job_description: str,
    required_skills: list[str],
) -> dict:
    """
    Generate a structured interview prep guide for a specific job.
    Returns: process_overview, rounds, likely_questions, prep_tips,
             topics_to_study, company_culture, red_flags
    """
    skills_text = ", ".join(required_skills[:20]) if required_skills else "Not specified"

    prompt = f"""You are an expert career coach and technical recruiter.
Generate a comprehensive interview preparation guide for the job below.

Role: {job_title}
Company: {company_name}
Required Skills: {skills_text}
Job Description:
{job_description[:2800]}

Return STRICT JSON with EXACTLY these keys:
{{
  "process_overview": "2-3 sentence summary of the typical hiring process for this role at {company_name}",
  "rounds": [
    {{
      "name": "Round name",
      "format": "Phone / Video / Onsite / Take-home",
      "duration": "e.g. 30-45 min",
      "focus": "What this round evaluates"
    }}
  ],
  "likely_questions": [
    {{
      "question": "The interview question",
      "category": "Behavioural",
      "tip": "One-line answer strategy"
    }}
  ],
  "prep_tips": [
    "Actionable tip 1",
    "Actionable tip 2",
    "Actionable tip 3",
    "Actionable tip 4",
    "Actionable tip 5"
  ],
  "topics_to_study": [
    {{
      "topic": "Topic name",
      "why": "Why it matters for this role",
      "resource": "Free URL or book"
    }}
  ],
  "company_culture": "What {company_name} values in candidates — work style, mindset, values",
  "red_flags": [
    "Common mistake for this role",
    "Another common mistake"
  ]
}}

RULES:
- Generate 8-10 likely_questions: mix Behavioural (3-4), Technical (3-4), System Design or Culture Fit (1-2)
- category must be exactly one of: Behavioural, Technical, System Design, Culture Fit
- rounds: 3-5 based on seniority implied in the description
- Output ONLY valid JSON."""

    resp = _chat(
        [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )
    return _extract_json(resp)
