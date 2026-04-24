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

TRUST_ENGINE_PROMPT = """You are "CareerForge AI", a balanced Resume Analysis and Profile Generation Agent.

Your purpose is to generate a TRUSTED profile score and improvement guidance from a candidate's resume.

## SCORING PHILOSOPHY
- Give credit for real experience, education, and listed projects — even without GitHub
- GitHub data is a BONUS signal, not required to score well
- A solid resume with real job history, named technologies, and clear projects = 70-85 score
- Only score < 50 if the resume is vague, empty, or has zero verifiable content

## SCORING GUIDE (0-100)

### Adds score:
- Real job experience with named companies and tech used → +10 to +20 per role (max +35)
- Named technologies with context (e.g. "Built REST APIs with FastAPI") → +5 per tech (max +25)
- Education (CS/Engineering degree or relevant certification) → +10
- GitHub repos that match claimed skills → +15 bonus
- Projects described with scope, problem, and outcome → +10 per project (max +20)
- Skills list with more than 5 specific technologies → +5

### Reduces score:
- Claims skills with zero evidence anywhere (no job, no project, no GitHub) → -5 per unsupported claim
- All GitHub repos are forks with no commits → -10
- Resume has less than 100 words of actual content → cap at 30
- Everything is vague buzzwords with no specifics → cap at 40

### Score ranges:
- 85-100: Senior / Strong — verified depth across skills, projects, and experience
- 70-84: Solid — good candidate with real background, minor gaps
- 50-69: Moderate — some experience, needs more verifiable proof
- 30-49: Weak — mostly claims, little evidence
- 0-29: Very weak — almost no verifiable content

## OUTPUT FORMAT (STRICT JSON ONLY)
{{
  "analysis": {{
    "projects": [
      {{
        "name": "",
        "status": "verified_strong | verified_partial | weak | unverified",
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
  "improvement_tips": {{
    "quote": "One encouraging sentence specifically about this candidate's profile — what stands out and the ONE most impactful thing they can do to move forward.",
    "action_steps": ["Specific tip 1", "Specific tip 2", "Specific tip 3"]
  }},
  "roadmap": {{
    "direct_message": "Only fill this if careerforge_score < 70. Honest but encouraging explanation of why score is low.",
    "action_steps": ["Step 1", "Step 2", "Step 3"]
  }},
  "summary": ""
}}

RULES:
- ALWAYS fill improvement_tips for EVERY profile regardless of score
- Only fill roadmap.direct_message if careerforge_score < 70
- profile.headline/bio/verified_skills MUST be filled for score >= 70
- Be fair: a real developer who lists their experience clearly should score >= 70

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
A candidate with a low Trust Score has answered 4 questions. Evaluate them fairly — not harshly, not generously.

## YOUR MANDATE
You are a fair technical reviewer. Your job is to judge genuine capability from the answers.
Give the candidate the benefit of the doubt on partially specific answers.
Reward effort and real experience. Penalise only clearly empty or dishonest answers.

## SCORING RUBRIC (0-100) — BALANCED

### Award points for:
- Names a specific technology with some context (e.g. "Python with FastAPI", "React with hooks") → +8 per valid one, max +30
- Describes a real project with a problem and solution, even if explained simply → +15
- Shows awareness of how components connect (frontend + backend, or DB + API, etc.) → +10
- Mentions any deployment, hosting, or real-world usage → +10
- GitHub repos provided that match their described skills → +15
- Gives honest, detailed answers even without GitHub → +5

### Deduct or cap only for genuinely empty responses:
- Entire answer is 1 vague sentence with zero technical content → -10 per question
- Claims to have built something but cannot describe it at all → -10
- All GitHub repos are forks with zero commits of their own → -10
- Answer is clearly AI-generated filler with no personal context → cap at 30

### Score thresholds:
- 70-100: Capable candidate — unlock platform access
- 50-69: Promising but needs more specifics — give a helpful roadmap
- 30-49: Early stage — give an encouraging but honest roadmap
- 0-29: No real content in answers — give a direct but kind roadmap

## CRITICAL RULES:
1. is_weak = true if careerforge_score < 70
2. If is_weak = false (score >= 70), generate a professional profile from what they stated. You may reasonably infer skills from context.
3. If is_weak = true, leave headline/bio/projects empty — only fill roadmap.
4. The roadmap message must be encouraging but specific. Reference their actual answers.
5. Do NOT penalise someone for not having a GitHub if their answers are genuinely detailed.

## OUTPUT FORMAT (STRICT JSON ONLY — no extra text)
{{
  "is_weak": true or false,
  "careerforge_score": integer between 0 and 100,
  "trust_level": "High" or "Medium" or "Low",
  "headline": "string or empty string if is_weak",
  "bio": "string or empty string if is_weak",
  "skills": ["technologies they named or clearly implied"],
  "projects": [
    {{
      "name": "Project name from their answer",
      "description": "Description based on what they said",
      "technologies": ["tech they mentioned"]
    }}
  ],
  "roadmap": {{
    "direct_message": "Encouraging but honest 1-2 sentence assessment referencing their answers.",
    "action_steps": ["Specific step 1", "Specific step 2", "Specific step 3"]
  }}
}}

--- CANDIDATE ANSWERS ---
Q1 (Complex Technical Problem): {complex_problem}
Q2 (Project Built From Scratch): {project_from_scratch}
Q3 (Core Languages & Frameworks): {core_languages}
Q4 (GitHub / Portfolio): {github_link}

--- VERIFIED GITHUB DATA (fetched live from GitHub API) ---
{github_data}

Cross-reference answers with GitHub data where available:
- Languages match → award GitHub bonus (+15)
- All forks, no original work → small deduction (-10)
- GitHub not provided but answers are detailed → do NOT penalise
- Repos are small but show genuine work → neutral (no bonus, no penalty)

Be fair. A real developer who explains their work clearly deserves to be recognised.
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
- Generate EXACTLY 10 questions
- Test REAL understanding, not just definitions
- 4 options per question, only 1 correct
- Mix of practical ("Which of these would you use to...") and conceptual questions
- Vary difficulty: 3 easy, 5 medium, 2 hard

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
    """Pure logic — no AI call needed. Pass threshold = 80%."""
    passed = quiz_score >= 80
    return {
        "status": "PASS" if passed else "FAIL",
        "next_step": "generate_project" if passed else "retry_quiz",
        "message": (
            f"Excellent! You scored {quiz_score:.0f}%. You've unlocked the project challenge."
            if passed else
            f"You scored {quiz_score:.0f}%. You need 80% to pass (8/10 correct). Review the concepts and try again."
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


# ---------------------------------------------------------------------------
# Professional HTML Resume Builder
# ---------------------------------------------------------------------------

async def fetch_github_enrichment(github_input: str) -> dict:
    """
    Fetch deep GitHub enrichment for resume generation:
    - Profile (bio, location, blog)
    - All public non-fork repos (up to 12)
    - Per repo: real language breakdown + README snippet
    github_input can be a username OR a github.com URL.
    """
    import httpx, re as _re, asyncio as _asyncio

    # Accept either "nevil06" or "github.com/nevil06" or "https://github.com/nevil06"
    match = _re.search(r"(?:github\.com/)?([A-Za-z0-9_.-]+)/?$", github_input.strip())
    if not match:
        return {}
    username = match.group(1)

    GH_HEADERS = {"Accept": "application/vnd.github+json", "User-Agent": "CareerForge/1.0"}
    result = {"username": username}

    async def _get_repo_detail(client: httpx.AsyncClient, repo: dict) -> dict:
        """Fetch language breakdown + README for a single repo."""
        owner = username
        name  = repo["name"]
        langs, readme = {}, ""
        try:
            lr = await client.get(f"https://api.github.com/repos/{owner}/{name}/languages",
                                  headers=GH_HEADERS)
            if lr.status_code == 200:
                langs = lr.json()  # {"Python": 5432, "JavaScript": 1234}

            rr = await client.get(f"https://api.github.com/repos/{owner}/{name}/readme",
                                  headers={"Accept": "application/vnd.github.raw",
                                           "User-Agent": "CareerForge/1.0"})
            if rr.status_code == 200:
                readme = rr.text[:1200]  # first 1200 chars of README
        except Exception:
            pass
        return {
            "name":        name,
            "description": repo.get("description") or "",
            "url":         repo["html_url"],
            "stars":       repo.get("stargazers_count", 0),
            "primary_language": repo.get("language") or "",
            "languages":   list(langs.keys()),           # real language list
            "readme":      readme,
        }

    try:
        async with httpx.AsyncClient(timeout=15) as gh:
            # Profile
            p = await gh.get(f"https://api.github.com/users/{username}", headers=GH_HEADERS)
            if p.status_code != 200:
                return {}
            d = p.json()
            result.update({
                "name":         d.get("name", ""),
                "bio":          d.get("bio", ""),
                "location":     d.get("location", ""),
                "blog":         d.get("blog", ""),
                "public_repos": d.get("public_repos", 0),
                "followers":    d.get("followers", 0),
                "github_url":   f"https://github.com/{username}",
            })

            # All public non-fork repos (sorted by pushed date, cap at 12)
            r = await gh.get(
                f"https://api.github.com/users/{username}/repos",
                params={"sort": "pushed", "per_page": 15, "type": "public"},
                headers=GH_HEADERS,
            )
            if r.status_code != 200:
                return result

            raw_repos = [repo for repo in r.json() if not repo.get("fork")][:12]

            # Fetch language + README for each repo concurrently
            tasks = [_get_repo_detail(gh, repo) for repo in raw_repos]
            detailed = await _asyncio.gather(*tasks)
            result["repos"] = list(detailed)

    except Exception as e:
        print(f"[github_enrich] {e}")
    return result



async def fetch_portfolio_content(portfolio_url: str) -> str:
    """Scrape portfolio homepage and return readable text."""
    import httpx
    from html.parser import HTMLParser

    class _TextEx(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts, self._skip = [], False
        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style", "nav", "footer"): self._skip = True
        def handle_endtag(self, tag):
            if tag in ("script", "style", "nav", "footer"): self._skip = False
        def handle_data(self, data):
            if not self._skip and data.strip(): self.parts.append(data.strip())

    if not portfolio_url.startswith("http"):
        portfolio_url = "https://" + portfolio_url
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as c:
            resp = await c.get(portfolio_url, headers={"User-Agent": "Mozilla/5.0"})
            if resp.status_code == 200:
                ex = _TextEx(); ex.feed(resp.text)
                return " ".join(" ".join(ex.parts).split())[:3000]
    except Exception as e:
        print(f"[portfolio_scrape] {e}")
    return ""


def generate_professional_html_resume(
    profile: dict,
    github_data: dict,
    portfolio_text: str,
    job_description: str,
    job_title: str,
    company_name: str,
) -> str:
    """
    Generate a master-level professional HTML resume.
    The output is optimised to score 85+ when re-analysed by the CareerForge trust engine.
    Trust engine awards points for:
      +10-20 per work role with named company and tech used
      +5 per named technology with explicit usage context (max +25)
      +15 for GitHub repos with real project descriptions
      +10 for CS/Engineering degree
      +5 for certifications, hackathons, open-source
    """
    repos = github_data.get("repos", [])  # new rich format with languages + readme
    repo_details = ""
    for r in repos:
        langs = ", ".join(r.get("languages", [r.get("primary_language", "")])) or "Unknown"
        readme_excerpt = r.get("readme", "")[:500].strip()
        repo_details += (
            f"\n  ── REPO: {r['name']} ──\n"
            f"  GitHub URL: {r['url']}\n"
            f"  Description: {r.get('description') or '(no description)'}\n"
            f"  Languages: {langs}\n"
            f"  Stars: {r.get('stars', 0)}\n"
        )
        if readme_excerpt:
            repo_details += f"  README excerpt:\n    {readme_excerpt[:400]}\n"

    gh_block = f"""
=== GITHUB PROFILE (@{github_data.get('username','')}) ===
Name: {github_data.get('name','')}
Bio: {github_data.get('bio','')}
Location: {github_data.get('location','')}
Blog/Portfolio: {github_data.get('blog','')}
GitHub URL: {github_data.get('github_url','')}
Public Repositories: {github_data.get('public_repos',0)}

=== ALL PUBLIC REPOSITORIES (use every single one in the Projects section) ==={repo_details}
""" if github_data else ""

    portfolio_block = f"\n=== PORTFOLIO WEBSITE CONTENT (extract skills/projects from this) ===\n{portfolio_text[:2500]}\n" if portfolio_text else ""

    exp_text = "\n".join(
        f"  Role: {e.get('title')} | Company: {e.get('company')} | Duration: {e.get('duration')}\n"
        f"  Details: {e.get('description','')}"
        for e in (profile.get("experiences") or [])
    )
    edu_text = "\n".join(
        f"  {e.get('degree')} — {e.get('institution')} | {e.get('year','')}"
        for e in (profile.get("education") or [])
    )
    skills_list = ", ".join((profile.get("skills") or [])[:25])

    prompt = f"""You are a world-class resume writer building a MASTER-LEVEL HTML resume grounded 100% in real data.
CRITICAL RULE: Do NOT invent companies, projects, or technologies. ONLY enhance and rephrase what is actually in the data below.
You MAY expand sparse descriptions using context clues (repo name + language), but every repo URL must appear as-is.

=== CANDIDATE PROFILE ===
Full Name: {profile.get('full_name','')}
Email: {profile.get('email','')} | Phone: {profile.get('phone','')} | Location: {profile.get('location','')}
Experience: {profile.get('experience_years',0)} year(s)
Professional Summary: {(profile.get('headline') or profile.get('summary',''))[:400]}
Skills from Profile: {skills_list}

Work Experience:
{exp_text}

Education:
{edu_text}
{gh_block}{portfolio_block}
=== TARGET JOB ===
Role: {job_title} at {company_name}
Job Description:
{job_description[:2500]}

=== WRITING RULES ===

SUMMARY (3-4 sentences):
- Start with exact title + years of experience from the profile
- Name 3-5 technologies FROM THE GITHUB REPOS ABOVE (use real languages found there)
- Add one quantified or impact statement derived from the real data
- End with alignment to the target role

SKILLS — extract ALL real technologies from:
  a) Profile skills list  b) GitHub repo languages  c) README content  d) Portfolio text
  Group as: Languages | Frameworks & Libraries | Databases | DevOps & Tools
  Each skill = individual chip/badge — NEVER comma text

WORK EXPERIENCE — for each role write 3-5 STAR bullets:
  - Name specific technologies actually used
  - Quantify impact where data exists
  - Weave target job keywords naturally

PROJECTS — THIS IS THE MOST CRITICAL SECTION:
  Include EVERY repository from the GitHub data above. For each one:
  1. Project name as bold heading — MUST be a clickable <a href="EXACT_REPO_URL"> link
  2. 2-3 sentences describing what it does — based on description + README excerpt + language
     (you may enhance sparse descriptions but stay truthful to the tech stack)
  3. Tech Stack: [list real languages from the Languages field above]
  4. One bullet: what problem it solves or its impact
  NEVER skip a repo. NEVER change the GitHub URL. NEVER add a project not in the data.

EDUCATION:
  Include all degrees + any hackathon wins, certifications, or achievements in the data

=== DESIGN ===
1. Complete self-contained HTML, ALL CSS in <style>
2. In <head>, include this EXACT <link> tag BEFORE the <style> block:
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
3. In <style>, set body {{ font-family: 'Inter', sans-serif; }}
4. Header: #0f172a bg, name white 2.5rem weight-900, contact row with <a> links for email/GitHub/portfolio
5. Body: white, section headings #4f46e5 with 3px bottom border
6. Skills: chips — #eef2ff bg, #4f46e5 border & text, flex wrap gap-2
7. Project links: bold, #4f46e5 color, underline
8. @media print {{ * {{ -webkit-print-color-adjust: exact !important; }} @page {{ margin: 0.5in; }} }}
9. Valid complete HTML, starts with <!DOCTYPE html>, fits 1-2 printed pages

Output ONLY raw HTML. No fences. No explanation. Start with <!DOCTYPE html>"""


    html = _chat([{"role": "user", "content": prompt}], temperature=0.35)
    html = re.sub(r"^```(?:html)?\n?", "", html.strip())
    html = re.sub(r"\n?```$", "", html.strip())

    # Guarantee Google Fonts loads — inject <link> tags if the model omitted them.
    # This is the only reliable way to load web fonts inside a sandboxed iframe
    # (sandboxed iframes block @import but honour <link> tags in the document head).
    FONT_LINKS = (
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">'
    )
    if "fonts.googleapis.com" not in html:
        # Inject before closing </head>
        html = html.replace("</head>", f"  {FONT_LINKS}\n</head>", 1)
        # If model skipped <head> entirely, inject after <html> opening tag
        if FONT_LINKS not in html:
            html = html.replace("<html>", f"<html>\n<head>{FONT_LINKS}</head>", 1)

    return html


# ---------------------------------------------------------------------------
# AI Application Package Generator
# ---------------------------------------------------------------------------

def generate_application_package(profile: dict, job: dict, github_data: dict) -> dict:
    """One GLM call → match analysis + cold email + cover letter."""
    repos_text = "\n".join(
        f"  - {r['name']} ({', '.join(r.get('languages', [r.get('primary_language','')]))[:60]}): {r.get('description','')}"
        for r in github_data.get("repos", [])
    ) or "  (none)"

    exp_text = "\n".join(
        f"  {e.get('title')} at {e.get('company')} ({e.get('duration')}): {e.get('description','')[:120]}"
        for e in (profile.get("experiences") or [])
    ) or "  (none)"

    prompt = f"""You are an expert career coach. Given candidate + job data, return strict JSON with EXACTLY these 3 keys.

CANDIDATE:
Name: {profile.get('full_name','')}
Skills: {', '.join((profile.get('skills') or [])[:20])}
Experience ({profile.get('experience_years',0)} yrs):
{exp_text}
GitHub Projects:
{repos_text}
Bio: {(profile.get('headline') or profile.get('summary',''))[:250]}

JOB:
Title: {job.get('title','')} at {job.get('company_name','')} ({job.get('location','Remote')})
Description: {(job.get('description') or '')[:2000]}

Return ONLY this JSON (no markdown):
{{
  "summary": {{
    "match_summary": "2-3 sentence honest assessment of fit for this specific role",
    "key_strengths": ["strength referencing real skill/project", "strength 2", "strength 3"],
    "skill_gaps": ["honest gap if any — empty list if none"],
    "suggested_subject_line": "Compelling email subject line for this application"
  }},
  "cold_email": "150-200 word plain text cold email. Reference candidate name, 1-2 specific GitHub projects by name, and 1-2 job requirements. Professional tone. End with contact info placeholder.",
  "cover_letter": "3 paragraph plain text cover letter. Para 1: enthusiasm + fit. Para 2: specific experience matching JD. Para 3: CTA. Reference GitHub projects naturally."
}}"""

    raw = _chat([{"role": "user", "content": prompt}], temperature=0.4)
    return _extract_json(raw)


