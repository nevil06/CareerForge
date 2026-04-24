# ⚡ Carrier-Forge

An intelligent two-sided hiring platform powered by **ZhipuAI GLM** and **Brevo** email.
Candidates upload resumes, companies post jobs, and the AI engine matches them automatically.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13 · FastAPI · SQLAlchemy |
| Frontend | Next.js 14 · Tailwind CSS · Zustand |
| Database | MySQL 8.0 |
| AI | ZhipuAI GLM-4-Flash · CodeGeeX-4 · Embedding-3 |
| Email | Brevo Transactional API |
| Auth | JWT · bcrypt |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js Frontend                       │
│   Candidate Dashboard │ Company Dashboard │ Auth          │
└───────────────────────┬──────────────────────────────────┘
                        │ REST API (JSON)
┌───────────────────────▼──────────────────────────────────┐
│                   FastAPI Backend                         │
│                                                          │
│  /api/auth   /api/candidates   /api/jobs   /api/company  │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │Resume Parser│  │  Matching   │  │   AI Service    │  │
│  │ PDF / DOCX  │  │   Engine    │  │ GLM + Embedding │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │           Brevo Email Notifications              │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────┬──────────────────────────────────┘
                        │
              ┌─────────▼─────────┐
              │     MySQL 8.0     │
              └───────────────────┘
```

---

## Match Score Formula

```
Score = 0.5 × Skill Match        (Jaccard overlap)
      + 0.2 × Experience Match   (years vs requirement)
      + 0.2 × Role Similarity    (keyword overlap)
      + 0.1 × Location Match     (city / remote / country)

When embeddings available:
  Final = 0.8 × Score + 0.2 × GLM Embedding-3 cosine similarity
```

---

## Docker Setup (Recommended)

The easiest way to run Carrier-Forge is using Docker Compose. This automatically spins up the frontend, backend, and MySQL database without needing to install Python, Node.js, or MySQL locally.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Docker Compose (Linux).

### Step 1 — Configure Environment Variables
Create an `.env` file in the root directory (`d:\Projects\Carrier-Forge`) with your API keys:

```env
ZHIPU_API_KEY=your-zhipuai-key
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=your-verified@email.com
BREVO_SENDER_NAME=HireAI
MYSQL_ROOT_PASSWORD=your_secure_password
```

### Step 2 — Start the Containers
Open your terminal in the root directory and run:
```bash
docker-compose up --build -d
```

### Step 3 — Access the Application
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs)

> **Note**: The MySQL database `carrier_forge` is automatically created, and the backend will automatically generate all necessary tables upon startup. No manual migrations are required.

To view logs, run `docker-compose logs -f`. To stop the application, run `docker-compose down`.

---

## Manual Local Setup Guide

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Python | 3.13 | Windows native (not WSL) |
| Node.js | 18+ | |
| MySQL | 8.0 | Already installed |

> ⚠️ **Run everything from Windows PowerShell or CMD — not WSL.**
> Your Python and MySQL are both on Windows. Using WSL adds unnecessary complexity.

---

### Step 1 — Create the MySQL Database

Open **MySQL Command Line Client** from the Start menu, enter your root password, then:

```sql
CREATE DATABASE hiring_agent CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

Or use **MySQL Workbench** → run the same SQL in a query tab.

---

### Step 2 — Backend Setup

Open **PowerShell** and run:

```powershell
cd D:\Projects\Carrier-Forge\backend

# Create virtual environment
python -m venv venv

# Activate it (you'll see (venv) in your prompt)
venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

---

### Step 3 — Configure Environment

Edit `backend/.env` with your actual values:

```env
DATABASE_URL=mysql+pymysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/carrier_forge
SECRET_KEY=any-long-random-string

ZHIPU_API_KEY=your-zhipuai-key

BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=your-verified@email.com
BREVO_SENDER_NAME=HireAI
```

Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL root password.

---

### Step 4 — Start the Backend

```powershell
# Make sure venv is active
venv\Scripts\activate

uvicorn app.main:app --reload --port 8000
```

✅ API running at: http://localhost:8000
✅ Interactive docs at: http://localhost:8000/docs

Tables are **auto-created** on first startup — no migrations needed.

---

### Step 5 — Frontend Setup

Open a **second PowerShell window**:

```powershell
cd D:\Projects\Carrier-Forge\frontend

npm install

# Create frontend env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

✅ App running at: http://localhost:3000

---

### Step 6 — Seed Sample Data (optional)

```powershell
# From backend folder, with venv active
cd D:\Projects\Carrier-Forge\backend
venv\Scripts\activate
python ..\sample_data\seed.py
```

Creates:
- 2 candidate accounts (`alice@example.com`, `bob@example.com`)
- 1 company account (`techcorp@example.com`)
- 3 job postings
- Password for all: `password`

---

## WSL Users

If you're developing from WSL, your MySQL is on Windows so `localhost` won't work.

**Find your Windows host IP from WSL:**
```bash
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
```

Then set in `.env`:
```env
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@172.28.48.1:3306/carrier_forge
```

**Install in WSL with a venv (never use `sudo pip`):**
```bash
cd /mnt/d/Projects/Carrier-Forge/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Re-activate each session: `source venv/bin/activate`

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL connection string |
| `SECRET_KEY` | ✅ | JWT signing secret (any random string) |
| `ZHIPU_API_KEY` | ✅ | ZhipuAI key — [console.zhipuai.cn](https://console.zhipuai.cn) |
| `BREVO_API_KEY` | ✅ | Brevo API key — [app.brevo.com](https://app.brevo.com) → SMTP & API → API Keys |
| `BREVO_SENDER_EMAIL` | ✅ | Verified sender in Brevo → Senders & IP → Senders |
| `BREVO_SENDER_NAME` | ➖ | Display name (default: `HireAI`) |
| `JOB_API_APP_ID` | ➖ | Adzuna App ID for external job listings |
| `JOB_API_KEY` | ➖ | Adzuna API key |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register as candidate or company |
| POST | `/api/auth/login` | Login, returns JWT token |

### Candidates
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/candidates/profile` | Create profile manually |
| PUT | `/api/candidates/profile` | Update profile |
| GET | `/api/candidates/profile` | Get own profile |
| POST | `/api/candidates/resume/upload` | Upload PDF/DOCX → AI parsing |
| GET | `/api/candidates/matches` | Get ranked job matches |
| POST | `/api/candidates/resume/optimize` | AI resume tailoring for a job |
| POST | `/api/candidates/outreach` | Generate outreach message |
| POST | `/api/candidates/cover-letter` | Generate cover letter |
| GET | `/api/candidates/notifications` | In-app notifications |
| PATCH | `/api/candidates/notifications/{id}/read` | Mark notification read |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | List / search all jobs |
| GET | `/api/jobs/{id}` | Get single job |
| POST | `/api/jobs` | Post a new job (company only) |
| PUT | `/api/jobs/{id}` | Update job (company only) |
| DELETE | `/api/jobs/{id}` | Deactivate job (company only) |
| GET | `/api/jobs/{id}/matches` | Matched candidates for a job |

### Company
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/company/dashboard` | Stats + active job list |
| GET | `/api/company/notifications` | In-app notifications |

---

## Key Features

- **Resume parsing** — Upload PDF or DOCX; GLM-4-Flash extracts structured JSON (skills, experience, education, preferred roles)
- **Dual matching** — Candidate→Jobs and Company→Candidates triggered automatically on every new profile or job post
- **AI tools** — Resume optimizer, personalised outreach messages, cover letters via CodeGeeX-4
- **Semantic matching** — GLM Embedding-3 cosine similarity blended into scores when available
- **Email notifications** — Brevo sends branded HTML emails on strong matches (≥50%)
- **In-app notifications** — Persistent notification feed for both roles
- **External jobs** — Optional Adzuna API integration

---

## Project Structure

```
carrier-forge/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py              # Register / login
│   │   │   ├── candidates.py        # Candidate routes + background tasks
│   │   │   ├── jobs.py              # Job routes + background tasks
│   │   │   ├── company.py           # Company dashboard
│   │   │   └── deps.py              # JWT auth dependencies
│   │   ├── core/
│   │   │   ├── config.py            # All settings via pydantic-settings
│   │   │   ├── database.py          # SQLAlchemy engine + session
│   │   │   └── security.py          # JWT creation + bcrypt
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   ├── user.py
│   │   │   ├── candidate.py
│   │   │   ├── job.py
│   │   │   ├── match.py
│   │   │   └── notification.py
│   │   ├── schemas/                 # Pydantic request/response schemas
│   │   │   ├── user.py
│   │   │   ├── candidate.py
│   │   │   ├── job.py
│   │   │   └── match.py
│   │   ├── services/
│   │   │   ├── ai_service.py        # ZhipuAI GLM (chat + embeddings)
│   │   │   ├── matching_service.py  # Weighted scoring engine
│   │   │   ├── resume_parser.py     # PDF/DOCX → text → GLM
│   │   │   ├── job_fetcher.py       # Adzuna external jobs
│   │   │   └── email_service.py     # Brevo HTML email notifications
│   │   └── main.py                  # FastAPI app + CORS + router registration
│   ├── .env                         # Your local secrets (git-ignored)
│   ├── .env.example                 # Template — copy to .env
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                      # Landing page
│       │   ├── auth/login/page.tsx           # Login / register
│       │   ├── candidate/
│       │   │   ├── dashboard/page.tsx        # Match cards + stats
│       │   │   ├── profile/page.tsx          # Resume upload + edit
│       │   │   ├── jobs/page.tsx             # Browse all jobs
│       │   │   ├── ai-tools/page.tsx         # AI tools (optimize, outreach, cover letter)
│       │   │   └── notifications/page.tsx
│       │   └── company/
│       │       ├── dashboard/page.tsx        # Jobs + candidate matches
│       │       ├── jobs/page.tsx             # Post / manage jobs
│       │       └── notifications/page.tsx
│       ├── components/
│       │   ├── layout/Sidebar.tsx            # Role-aware navigation
│       │   ├── MatchCard.tsx                 # Match card with score bars
│       │   └── ui/                           # Button, Card, Badge
│       └── lib/
│           ├── api.ts                        # Axios client + all API calls
│           └── store.ts                      # Zustand auth store
├── sample_data/
│   └── seed.py                      # Demo users, candidates, jobs
├── .gitignore
└── README.md
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `externally-managed-environment` | Never use `sudo pip`. Use `python -m venv venv` then activate it |
| `psycopg2` / `PyMuPDF` build errors | You're on Python 3.13 — all packages in `requirements.txt` have pre-built wheels |
| MySQL connection refused in WSL | Use Windows host IP from `/etc/resolv.conf`, not `localhost` |
| Brevo emails not sending | Verify sender email in Brevo dashboard → Senders & IP → Senders |
| GLM API errors | Check `ZHIPU_API_KEY` in `.env` — get it from [console.zhipuai.cn](https://console.zhipuai.cn) |
| Tables not created | Make sure `DATABASE_URL` is correct and the `hiring_agent` database exists |

-TEAM I GUESS BRO 😎
