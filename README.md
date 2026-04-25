# ⚡ CareerForge

An intelligent two-sided hiring platform powered by **ZhipuAI GLM-5.1**, **Supabase Auth**, and **Brevo** email.
Candidates upload resumes, get AI-powered career tools, and companies post jobs — the AI engine matches them automatically.

---

## Tech Stack

| Layer      | Technology                                                    |
|------------|---------------------------------------------------------------|
| Backend    | Python 3.13 · FastAPI · SQLAlchemy 2                         |
| Frontend   | Next.js 14 · Tailwind CSS · Zustand · React Hook Form        |
| Database   | MySQL 8.0 (local / Docker)                                   |
| AI         | ZhipuAI GLM-5.1 · Embedding-3 · OpenAI-compatible client    |
| Auth       | Supabase Auth (JWT RS256/ES256 + JWKS verification)          |
| Email      | Brevo Transactional HTTP API                                 |
| Job Data   | JSearch API (via RapidAPI) · Adzuna (optional)               |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Next.js Frontend (port 3000)            │
│                                                              │
│  Landing · Auth · Candidate Dashboard · Company Dashboard    │
│  AI Tools · Job Browser · Learning Agent · Profile           │
└───────────────────────────┬──────────────────────────────────┘
                            │  REST API (Axios + Supabase JWT)
┌───────────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend (port 8000)                  │
│                                                              │
│  /api/candidates   /api/jobs   /api/company   /api/learn     │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │Resume Parser│  │  Matching   │  │   AI Service        │  │
│  │ PDF / DOCX  │  │   Engine    │  │ GLM-5.1 + Embedding │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │Job Aggregator│  │ App Agent    │  │ Learning Agent    │   │
│  │JSearch+Adzuna│  │ Cover Letter │  │ Roadmap + Coach   │   │
│  └──────────────┘  └──────────────┘  └───────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                 Brevo Email Notifications             │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │     MySQL 8.0             │
              │  (auto-created tables)    │
              └───────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   Supabase Auth (external) │
              │   JWKS verified JWT        │
              └───────────────────────────┘
```

---

## Authentication Flow

CareerForge uses **Supabase Auth** as the identity provider:

1. **Registration / Login** — handled client-side via `@supabase/supabase-js` (`signUp`, `signInWithPassword`).
2. **Role storage** — the user's role (`candidate` | `company`) is stored in Supabase `user_metadata` at sign-up.
3. **API calls** — every Axios request attaches the Supabase JWT from the active session (`Authorization: Bearer <token>`).
4. **Backend verification** — `deps.py` fetches the project's JWKS from Supabase, verifies the RS256/ES256 token, and auto-upserts the user into the local MySQL `users` table so foreign keys work.

> **No custom `/api/auth/login` or `/api/auth/register` endpoints are used.** Auth is fully delegated to Supabase.

---

## Match Score Formula

```
Score = 0.5 × Skill Match        (Jaccard overlap)
      + 0.2 × Experience Match   (years vs requirement)
      + 0.2 × Role Similarity    (keyword overlap)
      + 0.1 × Location Match     (city / remote / country)

When embeddings are available:
  Final = 0.8 × Score + 0.2 × GLM Embedding-3 cosine similarity
```

---

## Docker Setup (Recommended)

The easiest way to run CareerForge is using Docker Compose. This automatically spins up the frontend, backend, and MySQL database without needing to install Python, Node.js, or MySQL locally.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Docker Compose (Linux).

### Step 1 — Configure Environment Variables

Create a `.env` file in the **project root** (`CareerForge/`) with:

```env
# MySQL
MYSQL_ROOT_PASSWORD=your_secure_password

# Backend secrets
SECRET_KEY=a-long-random-string-for-jwt-signing
ZHIPU_API_KEY=your-zhipuai-key

# Brevo transactional email
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=your-verified@email.com
BREVO_SENDER_NAME=CareerForge

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Optional: external job search
JSEARCH_API_KEY=your-rapidapi-jsearch-key
JOB_API_APP_ID=your-adzuna-app-id
JOB_API_KEY=your-adzuna-api-key
```

Also create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 2 — Start the Containers

```bash
docker-compose up --build -d
```

### Step 3 — Access the Application

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

> **Note**: MySQL table `carrier_forge` is auto-created, and all SQLAlchemy tables are created on first backend startup. No migrations needed.

Useful commands:
```bash
docker-compose logs -f       # stream all logs
docker-compose logs backend  # backend only
docker-compose down          # stop everything
docker-compose down -v       # stop + wipe database volume
```

---

## Manual Local Setup

### Prerequisites

| Tool    | Version | Notes                              |
|---------|---------|------------------------------------|
| Python  | 3.13    | Windows native (not WSL)           |
| Node.js | 18+     |                                    |
| MySQL   | 8.0     | Already installed                  |

> ⚠️ **Run everything from Windows PowerShell or CMD — not WSL.**

---

### Step 1 — Create the MySQL Database

Open **MySQL Command Line Client** (or Workbench) and run:

```sql
CREATE DATABASE carrier_forge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

---

### Step 2 — Backend Setup

```powershell
cd D:\Projects\CareerForge\backend

python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
```

---

### Step 3 — Configure Backend Environment

Copy the example and fill in your values:

```powershell
copy .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/carrier_forge
SECRET_KEY=any-long-random-string

ZHIPU_API_KEY=your-zhipuai-key

BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=your-verified@email.com
BREVO_SENDER_NAME=CareerForge

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Optional
JSEARCH_API_KEY=your-rapidapi-jsearch-key
JOB_API_APP_ID=
JOB_API_KEY=
```

---

### Step 4 — Start the Backend

```powershell
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

✅ API: http://localhost:8000  
✅ Swagger UI: http://localhost:8000/docs

Tables are **auto-created** on first startup — no migrations needed.

---

### Step 5 — Frontend Setup

Open a **second PowerShell window**:

```powershell
cd D:\Projects\CareerForge\frontend

npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```powershell
npm run dev
```

✅ App running at: http://localhost:3000

---

### Step 6 — Seed Sample Data (optional)

```powershell
cd D:\Projects\CareerForge\backend
venv\Scripts\activate
python seed_demo_user.py
```

---

## WSL Users

If developing from WSL, your MySQL and Node are on Windows so `localhost` won't work.

**Find your Windows host IP from WSL:**
```bash
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
```

Set `DATABASE_URL` in `.env` to use that IP instead of `localhost`.

```bash
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable              | Required | Description                                                         |
|-----------------------|----------|---------------------------------------------------------------------|
| `DATABASE_URL`        | ✅       | MySQL connection string (`mysql+pymysql://...`)                     |
| `SECRET_KEY`          | ✅       | Signing secret for internal use (any long random string)            |
| `ZHIPU_API_KEY`       | ✅       | ZhipuAI key — [console.zhipuai.cn](https://console.zhipuai.cn)     |
| `BREVO_API_KEY`       | ✅       | Brevo API key — [app.brevo.com](https://app.brevo.com) → API Keys  |
| `BREVO_SENDER_EMAIL`  | ✅       | Verified sender in Brevo → Senders & IP                            |
| `BREVO_SENDER_NAME`   | ➖       | Display name (default: `CareerForge`)                               |
| `SUPABASE_URL`        | ✅       | Your Supabase project URL (`https://xxxx.supabase.co`)              |
| `SUPABASE_JWT_SECRET` | ✅       | Found in Supabase → Project Settings → API → JWT Secret             |
| `JSEARCH_API_KEY`     | ➖       | RapidAPI key for JSearch (real job listings)                        |
| `JOB_API_APP_ID`      | ➖       | Adzuna App ID (legacy job search fallback)                          |
| `JOB_API_KEY`         | ➖       | Adzuna API key                                                      |

### Frontend (`frontend/.env.local`)

| Variable                       | Required | Description                              |
|--------------------------------|----------|------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`     | ✅       | Your Supabase project URL                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| ✅       | Supabase anon (public) key               |
| `NEXT_PUBLIC_API_URL`          | ✅       | Backend base URL (default: `http://localhost:8000`) |

---

## API Endpoints

> All endpoints (except `/health`) require `Authorization: Bearer <supabase_token>`.

### Candidates

| Method | Endpoint                                    | Description                                     |
|--------|---------------------------------------------|-------------------------------------------------|
| POST   | `/api/candidates/profile`                   | Create profile manually                         |
| PUT    | `/api/candidates/profile`                   | Update profile                                  |
| GET    | `/api/candidates/profile`                   | Get own profile                                 |
| POST   | `/api/candidates/resume/upload`             | Upload PDF/DOCX → AI parsing → profile update   |
| POST   | `/api/candidates/resume/build-from-interview` | Build profile from structured interview data  |
| POST   | `/api/candidates/resume/build-professional` | GitHub-grounded ATS resume (HTML output)        |
| POST   | `/api/candidates/resume/optimize`           | Tailor resume to a job description              |
| POST   | `/api/candidates/outreach`                  | Generate cold outreach message                  |
| POST   | `/api/candidates/cover-letter`              | Generate cover letter                           |
| POST   | `/api/candidates/apply/{job_id}`            | Generate full application package               |
| POST   | `/api/candidates/interview-prep/{job_id}`   | Generate interview Q&A for a job                |
| GET    | `/api/candidates/matches`                   | Ranked job matches for this candidate           |
| GET    | `/api/candidates/notifications`             | In-app notification feed                        |
| PATCH  | `/api/candidates/notifications/{id}/read`   | Mark notification as read                       |
| GET    | `/api/candidates/github/repos`              | Fetch GitHub repos for a username               |
| POST   | `/api/candidates/jobs/{job_id}/visit`       | Record a job view                               |
| GET    | `/api/candidates/jobs/visited`              | Get visited job history                         |

### Jobs

| Method | Endpoint           | Description                                  |
|--------|--------------------|----------------------------------------------|
| GET    | `/api/jobs`        | List / search jobs (with optional filters)   |
| GET    | `/api/jobs/{id}`   | Get a single job                             |
| POST   | `/api/jobs`        | Post a new job (company only)                |
| PUT    | `/api/jobs/{id}`   | Update job (company only)                    |
| DELETE | `/api/jobs/{id}`   | Deactivate job (company only)                |
| GET    | `/api/jobs/{id}/matches` | Matched candidates for a job           |

### Company

| Method | Endpoint                              | Description                  |
|--------|---------------------------------------|------------------------------|
| GET    | `/api/company/dashboard`              | Stats + active job list      |
| GET    | `/api/company/notifications`          | In-app notification feed     |

### Learning Agent

| Method | Endpoint              | Description                                        |
|--------|-----------------------|----------------------------------------------------|
| POST   | `/api/learn/agent`    | Send a message to the learning / career coach agent|
| GET    | `/api/learn/roadmap`  | Get the candidate's personalized learning roadmap   |

### System

| Method | Endpoint    | Description          |
|--------|-------------|----------------------|
| GET    | `/health`   | Health check         |

---

## Key Features

- **Resume parsing** — Upload PDF or DOCX; GLM-5.1 extracts structured JSON (skills, experience, education, preferred roles)
- **Professional Resume Builder** — GitHub-grounded resume generator: pulls real repo data + READMEs → produces an ATS-optimised HTML resume
- **Dual matching** — Candidate→Jobs and Company→Candidates triggered automatically on every new profile or job post
- **AI tools** — Resume optimizer, cold outreach messages, cover letters, full application packages, interview prep Q&A
- **Semantic matching** — GLM Embedding-3 cosine similarity blended into match scores
- **Learning agent** — Conversational AI career coach with personalized roadmap generation
- **Email notifications** — Brevo sends branded HTML emails on strong matches (≥50%)
- **In-app notifications** — Persistent notification feed for both roles
- **External jobs** — JSearch (RapidAPI) for real internet job listings; Adzuna as fallback

---

## Project Structure

```
CareerForge/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── candidates.py        # All candidate routes + background tasks
│   │   │   ├── jobs.py              # Job CRUD + match triggering
│   │   │   ├── company.py           # Company dashboard + notifications
│   │   │   ├── learning.py          # Learning agent + roadmap
│   │   │   └── deps.py              # Supabase JWT verification + user upsert
│   │   ├── core/
│   │   │   ├── config.py            # All settings via pydantic-settings
│   │   │   ├── database.py          # SQLAlchemy engine + session factory
│   │   │   └── security.py          # JWT helpers + bcrypt
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── candidate.py
│   │   │   ├── job.py
│   │   │   ├── match.py
│   │   │   ├── job_interaction.py   # Job view/visit tracking
│   │   │   ├── learning.py          # Learning roadmap + sessions
│   │   │   └── notification.py
│   │   ├── schemas/                 # Pydantic v2 request/response schemas
│   │   │   ├── user.py
│   │   │   ├── candidate.py
│   │   │   ├── job.py
│   │   │   ├── match.py
│   │   │   └── learning.py
│   │   ├── services/
│   │   │   ├── ai_service.py        # ZhipuAI GLM-5.1 chat + Embedding-3
│   │   │   ├── matching_service.py  # Weighted scoring engine
│   │   │   ├── resume_parser.py     # PDF/DOCX → text → GLM structured parse
│   │   │   ├── application_agent.py # Cover letter + application package agent
│   │   │   ├── interview_prep.py    # Interview Q&A generator
│   │   │   ├── job_agent.py         # Job search + aggregation agent
│   │   │   ├── job_aggregator.py    # JSearch + Adzuna fetching + dedup
│   │   │   ├── job_fetcher.py       # Low-level job API client
│   │   │   ├── github_verifier.py   # GitHub repo data extraction
│   │   │   ├── pdf_generator.py     # PDF export from HTML resume
│   │   │   └── email_service.py     # Brevo HTML email notifications
│   │   └── main.py                  # FastAPI app + CORS + router registration
│   ├── .env                         # Your local secrets (git-ignored)
│   ├── .env.example                 # Template — copy to .env
│   ├── requirements.txt
│   ├── seed_demo_user.py            # Seed a demo candidate user
│   ├── fix_db_trust.py              # One-off: backfill trust score columns
│   └── check_db.py                  # DB connectivity diagnostic
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                          # Landing page
│       │   ├── auth/login/page.tsx               # Login / register (Supabase)
│       │   ├── candidate/
│       │   │   ├── dashboard/page.tsx            # Match cards + stats
│       │   │   ├── profile/page.tsx              # Resume upload + manual edit
│       │   │   ├── jobs/page.tsx                 # Browse all jobs
│       │   │   ├── apply/page.tsx                # Job Action Hub (apply, prep, email)
│       │   │   ├── ai-tools/page.tsx             # AI tools (optimize, outreach, cover letter, pro resume)
│       │   │   ├── learn/page.tsx                # Learning agent chat + roadmap
│       │   │   └── notifications/page.tsx
│       │   └── company/
│       │       ├── dashboard/page.tsx            # Jobs + matched candidates
│       │       ├── jobs/page.tsx                 # Post / manage jobs
│       │       └── notifications/page.tsx
│       ├── components/
│       │   ├── layout/Sidebar.tsx                # Role-aware navigation sidebar
│       │   ├── MatchCard.tsx                     # Match card with score bars
│       │   ├── AuthGuard.tsx                     # Route protection component
│       │   └── ui/                               # Button, Card, Badge components
│       └── lib/
│           ├── api.ts                            # Axios client + all typed API calls
│           ├── apiError.ts                       # Pydantic v2 error message extractor
│           ├── store.ts                          # Zustand auth store (Supabase session)
│           └── supabase.ts                       # Supabase client initialisation
├── sample_data/                                  # Sample resume/job fixtures
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Troubleshooting

| Problem                              | Fix                                                                                    |
|--------------------------------------|----------------------------------------------------------------------------------------|
| `401 Invalid Supabase token`         | Check `SUPABASE_URL` and `SUPABASE_JWT_SECRET` in `backend/.env`                       |
| `NEXT_PUBLIC_SUPABASE_*` missing     | Create `frontend/.env.local` with your Supabase URL and anon key                       |
| MySQL connection refused             | Verify `DATABASE_URL` and that MySQL is running. In WSL use the Windows host IP        |
| Brevo emails not sending             | Verify sender email in Brevo → Senders & IP → Senders                                 |
| GLM API errors                       | Check `ZHIPU_API_KEY` — get it from [console.zhipuai.cn](https://console.zhipuai.cn)  |
| Tables not created                   | Make sure `DATABASE_URL` is correct and the `carrier_forge` database exists            |
| JSearch returns no results           | Verify `JSEARCH_API_KEY` is set and the RapidAPI subscription is active                |
| `externally-managed-environment`     | Never use `sudo pip`. Always activate your venv first: `venv\Scripts\activate`         |
Sentinel hack 6.0
hackathon project by team I Geuss Bro
