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
# Resume Improver (Interview Wizard)
# ---------------------------------------------------------------------------

INTERVIEW_BUILDER_PROMPT = """You are a STRICT senior technical recruiter conducting a verification interview for CareerForge.
A candidate with a low Trust Score has answered 4 questions. You must evaluate them with NO LENIENCY.

## YOUR MANDATE
You are NOT here to be kind or encouraging. You are here to verify if this person has genuine engineering ability.
Do NOT inflate scores. Do NOT assume competence from vague answers. Do NOT give benefit of the doubt.
The score you assign here is a statement of actual verified ability, NOT potential.

## SCORING RUBRIC (0-100) — BE STRICT

### Strong indicators (each adds points):
- Mentions a SPECIFIC technology by name with context (e.g. "FastAPI with async SQLAlchemy", not just "Python") → +5 per valid one, max +25
- Describes a REAL architectural decision or tradeoff (e.g. "I chose Redis over Postgres for caching because...") → +10
- Mentions deployment, CI/CD, testing, or production usage → +10
- Describes a non-trivial project with clear scope (backend + frontend + DB, or ML pipeline, etc.) → +10
- Provides a GitHub link that matches the described skills → +15

### Weak indicators (each DEDUCTS or caps score):
- Vague answer like "I made a website", "I used Python", "I know React" → cap score at 35
- Answer is clearly copied/generic/buzzword-heavy with no specifics → cap score at 25
- Cannot describe a project they "built from scratch" with real technical details → -15
- Answers are shorter than 2 meaningful sentences → -10 per question
- No GitHub/portfolio and no specific project mentioned → cap score at 40
- Mentions only basic tutorials, "I made a to-do app", or "I learned from YouTube" → cap score at 30

### Score thresholds:
- 70-100: Real engineer, unlock platform access
- 50-69: Has some knowledge but not enough — give specific roadmap
- 0-49: Weak/junior/vague — give direct honest feedback and detailed roadmap

## CRITICAL RULES:
1. is_weak = true if careerforge_score < 70
2. Do NOT generate a full profile (headline/bio/projects) if is_weak = true. Leave them empty/null.
3. If is_weak = false (score >= 70), generate a professional profile ONLY from what they explicitly stated. Do not invent or embellish.
4. The roadmap must always be filled in — it should be actionable and specific to their actual answers.
5. Be skeptical. Most candidates overstate their abilities.

## OUTPUT FORMAT (STRICT JSON ONLY — no extra text)
{{
  "is_weak": true or false,
  "careerforge_score": integer between 0 and 100,
  "trust_level": "High" or "Medium" or "Low",
  "headline": "string or empty string if is_weak",
  "bio": "string or empty string if is_weak",
  "skills": ["only technologies they explicitly named"],
  "projects": [
    {{
      "name": "Project name from their answer",
      "description": "Description using ONLY what they said, no embellishment",
      "technologies": ["Only what they listed"]
    }}
  ],
  "roadmap": {{
    "direct_message": "Honest, blunt assessment of why they scored this way. Reference their actual answers.",
    "action_steps": ["Concrete specific step 1", "Concrete specific step 2", "Concrete specific step 3"]
  }}
}}

--- CANDIDATE ANSWERS ---
Q1 (Complex Technical Problem): {complex_problem}
Q2 (Project Built From Scratch): {project_from_scratch}
Q3 (Core Languages & Frameworks): {core_languages}
Q4 (GitHub / Portfolio): {github_link}

--- VERIFIED GITHUB DATA (fetched live from GitHub API) ---
{github_data}

IMPORTANT: Cross-reference the candidate's answers against the actual GitHub repo data above.
- If they claim a project exists but no matching repo is found → penalise heavily (-15).
- If their stated languages DO match repo languages → award the GitHub bonus (+15).
- If GitHub repos are all forks with no original work → penalise (-10).
- If GitHub repos are small/empty (size < 10kb) → treat as low-effort (-5 each).
- If repos are not found or github_found is false → do NOT give the GitHub bonus.

Now evaluate strictly. Remember: a false positive (letting a weak candidate in) harms real engineers waiting for opportunities.
"""

def build_profile_from_interview(answers: dict, github_data: dict | None = None) -> dict:
    prompt = INTERVIEW_BUILDER_PROMPT.format(
        complex_problem=answers.get("complex_problem", "").strip() or "Not answered",
        project_from_scratch=answers.get("project_from_scratch", "").strip() or "Not answered",
        core_languages=answers.get("core_languages", "").strip() or "Not answered",
        github_link=answers.get("github_link", "").strip() or "None provided",
        github_data=json.dumps(github_data, indent=2) if github_data else "No GitHub data available. Do NOT award GitHub bonus."
    )

    resp = _chat([
        {"role": "system", "content": "You are a strict JSON-only API. Output only valid JSON. No markdown, no explanation."},
        {"role": "user", "content": prompt}
    ], model=settings.GLM_CODER_MODEL, temperature=0.1)  # Low temp = consistent, not creative

    return _extract_json(resp)


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


# ---------------------------------------------------------------------------
# CareerForge Agent — Learning Engine
# ---------------------------------------------------------------------------

_AGENT_SYSTEM = "You are a strict JSON-only API. Output ONLY valid JSON. No markdown, no explanation, no extra text."

def agent_generate_roadmap(interests: str, skills: list[str], current_score: float) -> dict:
    prompt = f"""Generate a complete learning roadmap for a candidate.

User interests: {interests}
Current skills: {', '.join(skills) if skills else 'None stated'}
Current CareerForge score: {current_score}/100

Rules:
- Identify the single best target_role from interests + skills
- Identify skill_gaps (what they need to learn to reach that role)
- Level = "Beginner" if score < 50, else "Intermediate"
- Create 3-5 levels, each with 2-4 chapters
- First chapter status = "unlocked", all others = "locked"
- Chapters must follow logical learning order
- learning_points: 5-10 per chapter
- project_points: 15-25 per chapter
- free_resources: YouTube/docs links only (real URLs)
- estimated_time: realistic (e.g. "2-3 hours")

Return STRICT JSON:
{{
  "target_role": "",
  "level": "",
  "skill_gaps": [],
  "total_score_possible": 0,
  "roadmap": [
    {{
      "level_name": "",
      "chapters": [
        {{
          "id": "",
          "title": "",
          "concepts": [],
          "free_resources": ["URL1", "URL2"],
          "estimated_time": "",
          "learning_points": 5,
          "quiz_required": true,
          "project_required": true,
          "project_points": 20,
          "status": "unlocked"
        }}
      ]
    }}
  ]
}}"""
    resp = _chat([
        {"role": "system", "content": _AGENT_SYSTEM},
        {"role": "user", "content": prompt}
    ], model=settings.GLM_CODER_MODEL, temperature=0.2)
    return _extract_json(resp)


def agent_generate_quiz(chapter_id: str, chapter_title: str, concepts: list[str]) -> dict:
    prompt = f"""Generate a quiz for a learning chapter.

Chapter ID: {chapter_id}
Chapter Title: {chapter_title}
Concepts covered: {', '.join(concepts)}

Rules:
- 5-8 questions
- Test REAL understanding, not just definitions
- 4 options per question, only 1 correct
- Questions should be practical ("Which of these would you use to...")

Return STRICT JSON:
{{
  "chapter_id": "{chapter_id}",
  "questions": [
    {{
      "id": "q1",
      "question": "",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A"
    }}
  ]
}}"""
    resp = _chat([
        {"role": "system", "content": _AGENT_SYSTEM},
        {"role": "user", "content": prompt}
    ], model=settings.GLM_CODER_MODEL, temperature=0.3)
    return _extract_json(resp)


def agent_evaluate_quiz(quiz_score: float) -> dict:
    """Pure logic — no AI call needed."""
    passed = quiz_score >= 70
    return {
        "status": "PASS" if passed else "FAIL",
        "next_step": "generate_project" if passed else "retry_quiz",
        "message": (
            f"Great work! You scored {quiz_score:.0f}%. You've unlocked the project challenge."
            if passed else
            f"You scored {quiz_score:.0f}%. You need 70% to unlock the project. Review the concepts and try again."
        )
    }


def agent_generate_project(chapter_id: str, chapter_title: str, concepts: list[str], level: str) -> dict:
    prompt = f"""Generate a real-world portfolio project for a candidate after completing a learning chapter.

Chapter ID: {chapter_id}
Chapter Title: {chapter_title}
Concepts learned: {', '.join(concepts)}
Candidate level: {level}

Rules:
- Project must directly apply the chapter concepts
- Must be achievable solo in 1-3 days
- Must be portfolio-worthy (not a tutorial clone or to-do app)
- Tech stack must match the chapter's domain
- verification_rules: list files that MUST exist in the GitHub repo

Return STRICT JSON:
{{
  "chapter_id": "{chapter_id}",
  "project": {{
    "id": "",
    "title": "",
    "problem_statement": "",
    "features": ["Feature 1", "Feature 2", "Feature 3"],
    "tech_stack": ["Tech1", "Tech2"],
    "difficulty": "{level}",
    "expected_output": "",
    "points": 20,
    "verification_rules": {{
      "required_files": ["README.md", "requirements.txt"],
      "required_keywords": ["keyword1", "keyword2"]
    }}
  }}
}}"""
    resp = _chat([
        {"role": "system", "content": _AGENT_SYSTEM},
        {"role": "user", "content": prompt}
    ], model=settings.GLM_CODER_MODEL, temperature=0.3)
    return _extract_json(resp)


async def agent_verify_project(github_link: str, verification_rules: dict, chapter_title: str) -> dict:
    """
    Verify a submitted GitHub project:
    1. Fetch repo metadata + file tree via GitHub API
    2. Check required_files and required_keywords
    3. AI qualitative review
    """
    import httpx, re as _re

    # Extract owner/repo from link
    match = _re.search(r"github\.com/([^/]+)/([^/\s?#]+)", github_link)
    if not match:
        return {
            "status": "FAIL",
            "score": 0,
            "feedback": "Invalid GitHub repository URL. Please provide a direct link to your repository.",
            "award_points": 0
        }

    owner, repo = match.group(1), match.group(2).rstrip(".git")
    required_files = verification_rules.get("required_files", [])
    required_keywords = verification_rules.get("required_keywords", [])

    # Fetch repo tree and README from GitHub
    repo_data = {}
    file_names = []
    readme_content = ""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Repo metadata
            r = await client.get(f"https://api.github.com/repos/{owner}/{repo}",
                                  headers={"Accept": "application/vnd.github+json"})
            if r.status_code == 404:
                return {"status": "FAIL", "score": 0,
                        "feedback": "Repository not found. Make sure it's public.", "award_points": 0}
            repo_data = r.json()

            # File tree (flat, top-level)
            t = await client.get(f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1",
                                  headers={"Accept": "application/vnd.github+json"})
            if t.status_code == 200:
                file_names = [item["path"] for item in t.json().get("tree", [])]

            # README content
            rdm = await client.get(f"https://api.github.com/repos/{owner}/{repo}/readme",
                                    headers={"Accept": "application/vnd.github.raw"})
            if rdm.status_code == 200:
                readme_content = rdm.text[:3000]
    except Exception as e:
        return {"status": "FAIL", "score": 0,
                "feedback": f"Could not reach GitHub: {e}", "award_points": 0}

    # Check required files
    missing_files = [f for f in required_files
                     if not any(f.lower() in fn.lower() for fn in file_names)]

    # Check required keywords in file names + readme
    all_text = " ".join(file_names) + " " + readme_content
    missing_keywords = [k for k in required_keywords
                        if k.lower() not in all_text.lower()]

    # Base checks failed → immediate FAIL
    if missing_files:
        return {
            "status": "FAIL",
            "score": 20,
            "feedback": f"Missing required files: {', '.join(missing_files)}. Please add them to your repository.",
            "award_points": 0
        }

    # AI qualitative review
    repo_summary = (
        f"Repo: {owner}/{repo}\n"
        f"Description: {repo_data.get('description', 'No description')}\n"
        f"Stars: {repo_data.get('stargazers_count', 0)}, Forks: {repo_data.get('forks_count', 0)}\n"
        f"Language: {repo_data.get('language', 'Unknown')}\n"
        f"Files found: {', '.join(file_names[:30])}\n"
        f"README excerpt: {readme_content[:1500]}"
    )

    review_prompt = f"""You are reviewing a GitHub project submission for a CareerForge learning chapter.

Chapter: {chapter_title}
Required keywords (must be present): {required_keywords}
Missing keywords: {missing_keywords}

Repository data:
{repo_summary}

Evaluate:
1. Does the project actually implement the chapter's concepts? (most important)
2. Is the README descriptive?
3. Is it original work (not a tutorial clone)?
4. Are the missing keywords a problem?

Return STRICT JSON:
{{
  "status": "PASS" or "FAIL",
  "score": integer 0-100,
  "feedback": "Specific, constructive 2-3 sentence feedback referencing what you found.",
  "award_points": 20
}}

RULES:
- award_points = 20 ONLY if status = "PASS"
- award_points = 0 if status = "FAIL"
- Be strict — a README-only repo with no real code = FAIL"""

    resp = _chat([
        {"role": "system", "content": _AGENT_SYSTEM},
        {"role": "user", "content": review_prompt}
    ], model=settings.GLM_CODER_MODEL, temperature=0.1)
    result = _extract_json(resp)
    # Enforce award_points rule
    if result.get("status") != "PASS":
        result["award_points"] = 0
    return result

