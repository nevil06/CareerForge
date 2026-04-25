# CareerForge — Codebase Analysis Report
> Generated: 2026-04-25 | Analyzed by: Antigravity

---

## 1. Executive Summary

CareerForge is a **two-sided AI hiring platform** connecting candidates and companies. Candidates upload resumes, receive AI-powered career tools, and get automatically matched to jobs. Companies post jobs and see ranked candidate matches. The platform is built on a FastAPI + MySQL backend, a Next.js 14 frontend, and Supabase for authentication.

**Codebase health: Good** — well-structured, clearly separated layers, comprehensive AI feature set. A few areas need attention (see §11).

---

## 2. System Architecture

```mermaid
graph TB
    subgraph Browser["Browser (Next.js 14)"]
        LandingPage["Landing Page"]
        Auth["Auth Pages\n(Supabase signUp/signIn)"]
        CandidateUI["Candidate UI\nDashboard · Profile · Jobs\nAI Tools · Learn · Apply"]
        CompanyUI["Company UI\nDashboard · Jobs · Notifications"]
    end

    subgraph Supabase["Supabase (External)"]
        SupabaseAuth["Auth Service\n(JWT RS256/ES256)"]
        JWKS["JWKS Endpoint\n/.well-known/jwks.json"]
    end

    subgraph Backend["FastAPI Backend (port 8000)"]
        DEPS["deps.py\nJWT verify + User upsert"]
        CandAPI["candidates.py\n/api/candidates/*"]
        JobAPI["jobs.py\n/api/jobs/*"]
        CompAPI["company.py\n/api/company/*"]
        LearnAPI["learning.py\n/api/learn/*"]

        subgraph Services["Services Layer"]
            AIService["ai_service.py\nGLM-5.1 + Embedding-3"]
            MatchSvc["matching_service.py\nWeighted + Semantic"]
            ResumeParser["resume_parser.py\nPDF/DOCX → JSON"]
            AppAgent["application_agent.py\nCover Letter + Cold Email"]
            InterviewPrep["interview_prep.py\nQ&A Generator"]
            JobAgg["job_aggregator.py\nJSearch + Adzuna"]
            GHVerifier["github_verifier.py\nRepo Extraction"]
            EmailSvc["email_service.py\nBrevo HTML Email"]
            PDFGen["pdf_generator.py\nReportLab PDF"]
        end
    end

    subgraph DB["MySQL 8.0"]
        Users["users"]
        Candidates["candidate_profiles"]
        Jobs["jobs"]
        Matches["matches"]
        Notifications["notifications"]
        JobInteractions["job_interactions"]
        LearningRoadmaps["learning_roadmaps"]
        QuizAttempts["quiz_attempts"]
        ProjectSubs["project_submissions"]
    end

    subgraph External["External APIs"]
        ZhipuAI["ZhipuAI GLM-5.1\nconsole.zhipuai.cn"]
        Brevo["Brevo Email\napp.brevo.com"]
        JSearch["JSearch API\nRapidAPI"]
        Adzuna["Adzuna API\n(optional)"]
        GitHub["GitHub REST API\napi.github.com"]
    end

    Browser -->|"Axios + Bearer JWT"| Backend
    Auth -->|"signUp / signIn"| SupabaseAuth
    SupabaseAuth -->|"JWT token"| Browser
    DEPS -->|"Fetch JWKS"| JWKS
    Backend --> DB
    AIService --> ZhipuAI
    EmailSvc --> Brevo
    JobAgg --> JSearch
    JobAgg --> Adzuna
    GHVerifier --> GitHub
    AIService --> GitHub
```

---

## 3. Data Model (ERD)

```mermaid
erDiagram
    users {
        int id PK
        string email UK
        string hashed_password
        enum role "candidate|company"
        bool is_active
    }

    candidate_profiles {
        int id PK
        int user_id FK
        string full_name
        string phone
        string location
        text summary
        json skills
        float experience_years
        json experiences
        json education
        json preferred_roles
        json languages
        text raw_resume_text
        json embedding
        float careerforge_score
        string trust_level
        string headline
        string github_username
        json missing_proof
        json projects
        json verified_skills
        json strength_tags
        json roadmap
        json improvement_tips
        datetime created_at
        datetime updated_at
    }

    jobs {
        int id PK
        int company_user_id FK
        enum source "internal|external"
        string company_name
        string title
        text description
        json required_skills
        string experience_level
        float experience_years_min
        string location
        float salary_min
        float salary_max
        string application_link
        bool is_active
        json embedding
        datetime created_at
    }

    matches {
        int id PK
        int candidate_id FK
        int job_id FK
        float score_total
        float score_skill
        float score_experience
        float score_role
        float score_location
        float score_semantic
        json matched_skills
        json missing_skills
        bool notified_candidate
    }

    notifications {
        int id PK
        int user_id FK
        string title
        text message
        bool is_read
        datetime created_at
    }

    job_interactions {
        int id PK
        int user_id FK
        int job_id FK
        datetime visited_at
        json interview_prep
        datetime prep_generated_at
    }

    learning_roadmaps {
        int id PK
        int candidate_id FK
        string target_role
        string level
        json skill_gaps
        json roadmap
        int total_score_possible
        int total_points_earned
    }

    quiz_attempts {
        int id PK
        int roadmap_id FK
        string chapter_id
        float score
        bool passed
        int points_awarded
    }

    project_submissions {
        int id PK
        int roadmap_id FK
        string chapter_id
        string github_link
        string status
        float score
        text feedback
        int points_awarded
    }

    users ||--o| candidate_profiles : "has"
    users ||--o{ jobs : "posts"
    users ||--o{ notifications : "receives"
    users ||--o{ job_interactions : "tracks"
    candidate_profiles ||--o{ matches : "has"
    jobs ||--o{ matches : "has"
    jobs ||--o{ job_interactions : "has"
    candidate_profiles ||--o| learning_roadmaps : "has"
    learning_roadmaps ||--o{ quiz_attempts : "has"
    learning_roadmaps ||--o{ project_submissions : "has"
```

---

## 4. Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Supabase
    participant Backend
    participant MySQL

    Browser->>Supabase: signUp(email, password, role metadata)
    Supabase-->>Browser: JWT access_token + session

    Browser->>Supabase: signInWithPassword(email, password)
    Supabase-->>Browser: JWT access_token + user_metadata.role

    Note over Browser: Store token in Zustand (useAuthStore)<br/>Attach to all Axios requests as Bearer

    Browser->>Backend: GET /api/candidates/profile<br/>Authorization: Bearer jwt
    Backend->>Supabase: GET /auth/v1/.well-known/jwks.json (cached)
    Supabase-->>Backend: JWKS public keys
    Backend->>Backend: Verify JWT signature<br/>Extract email + role from payload
    Backend->>MySQL: SELECT * FROM users WHERE email=?
    alt User not found
        Backend->>MySQL: INSERT user (email, role, hashed_password="supabase-managed")
    end
    MySQL-->>Backend: User record
    Backend-->>Browser: Profile data (200) or 204 No Content
```

> **Key insight**: There are no custom `/api/auth/login` or `/api/auth/register` endpoints. Auth is fully delegated to Supabase. The backend acts as a JWT verifier only, and auto-provisions local user rows on first request for FK integrity.

---

## 5. Resume Upload & Parsing Flow

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant API as /resume/upload
    participant Parser as resume_parser.py
    participant GLM as ZhipuAI GLM-5.1
    participant BG as Background Task
    participant Embed as Embedding-3
    participant Match as matching_service
    participant Email as Brevo

    UI->>API: POST /api/candidates/resume/upload (multipart)
    API->>Parser: parse_uploaded_resume(file)
    Parser->>Parser: Extract text (PyMuPDF for PDF, python-docx for DOCX)
    Parser->>GLM: Chat completion: "Extract structured JSON from resume text"
    GLM-->>Parser: JSON {skills, experiences, education, preferred_roles, ...}
    Parser-->>API: Parsed dict
    API->>API: Upsert CandidateProfile in MySQL
    API-->>UI: CandidateProfileOut (201)

    Note over API,Email: Background task runs asynchronously

    API->>BG: _embed_and_match(profile_id)
    BG->>Embed: get_embedding(name + summary + skills + roles)
    Embed-->>BG: float[] vector
    BG->>Match: run_matching_for_candidate(profile, db)
    Match->>Match: Compute weighted score vs top-25 active jobs
    Match->>Match: Blend with cosine similarity if embeddings exist
    Match-->>BG: List[Match] with score >= 0.3
    BG->>BG: notify_candidate() for matches >= 0.5
    BG->>Email: Send HTML digest email via Brevo
```

---

## 6. Matching Engine Deep Dive

```mermaid
flowchart TD
    Input["Candidate Profile + Job"]

    Input --> SkillScore
    Input --> ExpScore
    Input --> RoleScore
    Input --> LocScore

    SkillScore["Skill Score x 0.5\nJaccard overlap of skills"]
    ExpScore["Experience Score x 0.2\ncandidate_years / required_years\ncapped at 1.0"]
    RoleScore["Role Score x 0.2\nKeyword match: preferred_roles vs job title"]
    LocScore["Location Score x 0.1\nExact=1.0, Same country=0.5,\nRemote=1.0, No match=0.0"]

    SkillScore --> BaseScore["Base Score\n= 0.5 x skill + 0.2 x exp + 0.2 x role + 0.1 x loc"]
    ExpScore --> BaseScore
    RoleScore --> BaseScore
    LocScore --> BaseScore

    BaseScore --> HasEmbeddings{"Both embeddings\navailable?"}
    HasEmbeddings -->|"Yes"| SemanticBlend["Final = 0.8 x Base + 0.2 x Cosine similarity"]
    HasEmbeddings -->|"No"| FinalScore["Final = Base Score"]
    SemanticBlend --> FinalScore

    FinalScore --> Threshold{"score >= 0.3?"}
    Threshold -->|"Yes"| SaveMatch["Save/Update Match row"]
    Threshold -->|"No"| Drop["Skip"]

    SaveMatch --> NotifyThreshold{"score >= 0.5?"}
    NotifyThreshold -->|"Yes"| Notify["In-app notification\n+ Brevo email digest"]
    NotifyThreshold -->|"No"| Done["Done"]
```

---

## 7. AI Application Package Flow

```mermaid
sequenceDiagram
    participant UI as Job Action Hub (Frontend)
    participant API as /apply/{job_id}
    participant AppAgent as application_agent.py
    participant GH as github_verifier.py
    participant GLM as ZhipuAI GLM-5.1
    participant ResumeGen as ai_service.py

    UI->>API: POST /api/candidates/apply/{job_id}\n{github_username?, portfolio_url?}

    alt No GitHub username
        API->>AppAgent: generate_full_application_package(profile, job)
        AppAgent->>GLM: Generate cold_email + cover_letter + summary
        GLM-->>AppAgent: {cold_email, cover_letter, summary}
        AppAgent-->>API: result
        API-->>UI: {cold_email, cover_letter, summary}
    else With GitHub username
        API->>GH: fetch_github_enrichment(username)
        GH-->>API: {repos, READMEs, languages, ...}

        Note over API: Run concurrently in ThreadPoolExecutor

        API->>AppAgent: generate_application_package(profile, job, github_data)
        AppAgent->>GLM: Generate cold_email + cover_letter + summary

        API->>ResumeGen: generate_professional_html_resume(profile, github_data, ...)
        ResumeGen->>GLM: Generate ATS-optimised HTML resume

        AppAgent-->>API: {cold_email, cover_letter, summary}
        ResumeGen-->>API: HTML string

        API-->>UI: {cold_email, cover_letter, summary, resume_html, repos_used}
    end
```

---

## 8. Learning Agent State Machine

```mermaid
stateDiagram-v2
    [*] --> ProfileRequired : Upload Resume First

    ProfileRequired --> RoadmapGeneration : POST /api/learn/agent\naction=generate_roadmap

    RoadmapGeneration --> ChapterUnlocked : Roadmap stored in DB\n(LearningRoadmap row)

    ChapterUnlocked --> QuizGenerated : action=generate_quiz\n(chapter_id, concepts)

    QuizGenerated --> QuizEvaluated : action=evaluate_quiz\n(quiz_score 0-100)

    QuizEvaluated --> ChapterUnlocked : PASS (>=80%)\n+8 points awarded\nNext chapter unlocked

    QuizEvaluated --> QuizGenerated : FAIL (<80%)\nRetry quiz

    ChapterUnlocked --> ProjectGenerated : action=generate_project\n(chapter_id, concepts)

    ProjectGenerated --> ProjectVerified : action=verify_project\n(github_link)

    ProjectVerified --> ChapterUnlocked : PASS\n+N points\ncareerforge_score +2\nNext chapter unlocked

    ProjectVerified --> ProjectGenerated : FAIL\nReview and retry
```

---

## 9. Frontend Page Map

```mermaid
graph LR
    Landing["/ (Landing Page)"]

    subgraph Auth
        Login["/auth/login\nLogin + Register\n(Supabase)"]
    end

    subgraph Candidate["Candidate Routes"]
        CDash["/candidate/dashboard\nMatch cards + Stats"]
        CProfile["/candidate/profile\nResume upload + Manual edit"]
        CJobs["/candidate/jobs\nBrowse all jobs"]
        CApply["/candidate/apply\nJob Action Hub"]
        CAI["/candidate/ai-tools\nOptimize, Outreach, Cover Letter, Pro Resume"]
        CLearn["/candidate/learn\nLearning Agent + Roadmap"]
        CNotif["/candidate/notifications"]
    end

    subgraph Company["Company Routes"]
        CompDash["/company/dashboard\nJobs + Candidate Matches"]
        CompJobs["/company/jobs\nPost / Manage Jobs"]
        CompNotif["/company/notifications"]
        CompCand["/company/candidates\nCandidate viewer"]
    end

    Landing --> Login
    Login -->|role=candidate| CDash
    Login -->|role=company| CompDash
    CDash --> CJobs
    CDash --> CProfile
    CJobs --> CApply
    CAI --- CApply
```

---

## 10. Key Design Decisions

| Decision | Implementation | Rationale |
|---|---|---|
| **Auth delegation** | Supabase JWT — no custom auth endpoints | Offloads token lifecycle, email verification, and security complexity |
| **User upsert on first API call** | `deps.py` auto-creates local user row | Decouples Supabase user lifecycle from MySQL FK constraints |
| **Background tasks for embedding** | FastAPI `BackgroundTasks` | Keeps resume upload response fast; embedding is non-blocking |
| **JWKS caching** | Module-level `_jwks` global | Avoids fetching JWKS on every request (one HTTP call total) |
| **Embedding blend** | `0.8 × heuristic + 0.2 × semantic` | Heuristic is fast and deterministic; semantic adds quality when available |
| **Demo user shortcut** | `nxgextra@gmail.com` hardcoded returns | Allows demo without real resume/GLM calls |
| **Job limit cap** | `job_limit=25`, `candidate_limit=25` | Prevents O(N²) matching explosion on large datasets |
| **`extra="allow"` on ApplyPayload** | Accepts arbitrary extra fields | Prevents Pydantic validation error when frontend sends extra keys |

---

## 11. Issues & Recommendations

### 🔴 Critical

| # | Issue | Location | Fix |
|---|---|---|---|
| 1 | **Duplicate route `/search-jobs`** | `candidates.py` lines 463 & 670 | Remove the second definition; FastAPI silently uses the first |
| 2 | **Duplicate route `/apply/{job_id}`** | `candidates.py` lines 372 (async) & 615 (sync) | Remove the sync version at line 615; the async one is newer and more capable |
| 3 | **JWKS race condition** | `deps.py` — `_jwks` global mutable, no lock | Use `threading.Lock()` or `functools.lru_cache` |
| 4 | **DB session in background task** | `_embed_and_match()` — `SessionLocal()` called in thread | Currently safe (try/finally), but consider a context manager pattern |

### 🟡 Medium

| # | Issue | Location | Recommendation |
|---|---|---|---|
| 5 | **`auth.py` not registered** | `app/api/auth.py` exists but never imported in `main.py` | Remove file or add an explanation comment |
| 6 | **CORS wildcard** | `main.py` — `allow_origins=["*"]` | Switch to `settings.ALLOWED_ORIGINS` (already defined in config) |
| 7 | **Hardcoded demo email** | 9 occurrences of `nxgextra@gmail.com` in `candidates.py` | Move to `settings.DEMO_USER_EMAIL` |
| 8 | **No pagination on job list** | `GET /api/jobs` | Add `skip` + `limit` query params |

### 🟢 Improvements

| # | Suggestion | Benefit |
|---|---|---|
| 9 | Configure Alembic migrations (already in `requirements.txt`) | Safe schema changes without dropping tables |
| 10 | Add response models to all endpoints | Better Swagger docs and type safety |
| 11 | Rate-limit GLM API calls | Prevent cost runaway if users spam AI endpoints |
| 12 | Cache `fetch_github_enrichment` results (1h TTL) | GitHub API rate limit protection |
| 13 | Frontend: loading skeletons + error boundaries | Better UX during slow AI calls (6–15s) |

---

## 12. Dependency Overview

### Backend (`requirements.txt`)

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | 0.111.0 | Web framework |
| `uvicorn` | 0.29.0 | ASGI server |
| `sqlalchemy` | 2.0.30 | ORM |
| `alembic` | 1.13.1 | Migrations (installed, not configured) |
| `pymysql` | 1.1.1 | MySQL driver |
| `pydantic` | 2.7.1 | Schema validation |
| `pydantic-settings` | 2.2.1 | Config from `.env` |
| `python-jose` | 3.3.0 | JWT verification |
| `httpx` | 0.27.0 | Async HTTP (Supabase JWKS, Brevo, GitHub) |
| `openai` | 1.30.1 | ZhipuAI client (OpenAI-compatible API) |
| `pymupdf` | 1.25.5 | PDF text extraction |
| `python-docx` | 1.1.2 | DOCX text extraction |
| `scikit-learn` | 1.6.1 | Cosine similarity |
| `numpy` | 2.2.6 | Vector math |
| `reportlab` | 4.2.2 | PDF generation |
| `jinja2` | 3.1.4 | Email HTML templates |
| `bcrypt` | 4.0.1 | Password hashing (legacy — unused with Supabase) |

### Frontend (key packages)

| Package | Purpose |
|---|---|
| `next` 14 | React framework + file-based routing |
| `@supabase/supabase-js` | Auth client |
| `axios` | HTTP client with JWT interceptor |
| `zustand` | Global auth state store |
| `react-hook-form` + `zod` | Form validation |
| `lucide-react` | Icon library |
| `tailwindcss` | Utility CSS |

---

## 13. Performance Characteristics

| Operation | Typical Latency | Notes |
|---|---|---|
| Resume upload → response | ~200ms | Parser async; embedding/matching runs in background |
| GLM chat completion | 2–8s | Depends on ZhipuAI server load |
| Embedding generation | 1–3s | Single API call |
| Matching (25 jobs) | <50ms | Pure Python, in-memory |
| GitHub enrichment | 1–4s | Multiple REST calls per repo |
| Application package (no GitHub) | 4–10s | One GLM call |
| Application package (with GitHub) | 6–15s | Two concurrent GLM calls + GitHub fetch |
| Interview prep (cached) | <10ms | Pure DB read |
| Interview prep (fresh) | 5–12s | GLM call, then cached in `job_interactions` |

---

## 14. Security Notes

- ✅ JWT verified against Supabase JWKS (RS256/ES256)
- ✅ Role-based route guards: `require_candidate` / `require_company`
- ✅ No secrets in frontend code (all via env vars)
- ✅ Input validation via Pydantic v2 on all endpoints
- ⚠️ `allow_origins=["*"]` should be restricted in production
- ⚠️ No rate limiting on AI endpoints — cost exposure risk
- ⚠️ No input sanitization on `job_description` before GLM prompt injection (low risk in current context)
- ℹ️ `hashed_password="supabase-managed"` for Supabase users — correct pattern, just undocumented
