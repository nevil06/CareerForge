"""
Matching Engine
===============
Match Score = 0.5 × Skill Match
           + 0.2 × Experience Match
           + 0.2 × Role Similarity
           + 0.1 × Location Match

Optionally blended with semantic (embedding) cosine similarity when
embeddings are available for both candidate and job.
"""
from __future__ import annotations
from typing import List, Tuple
from sqlalchemy.orm import Session

from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.match import Match
from app.models.notification import Notification
from app.services.ai_service import get_embedding, cosine_similarity
from app.core.config import settings


# ---------------------------------------------------------------------------
# Sub-scorers
# ---------------------------------------------------------------------------

def _skill_score(candidate_skills: List[str], required_skills: List[str]) -> Tuple[float, List[str], List[str]]:
    """Jaccard-style overlap; returns (score, matched, missing)."""
    if not required_skills:
        return 1.0, [], []
    c_set = {s.lower() for s in candidate_skills}
    r_set = {s.lower() for s in required_skills}
    matched = list(c_set & r_set)
    missing = list(r_set - c_set)
    score = len(matched) / len(r_set)
    return score, matched, missing


def _experience_score(candidate_years: float, required_years: float) -> float:
    """1.0 if candidate meets or exceeds requirement, scales down otherwise."""
    if required_years <= 0:
        return 1.0
    if candidate_years >= required_years:
        return 1.0
    return max(0.0, candidate_years / required_years)


def _role_score(preferred_roles: List[str], job_title: str) -> float:
    """Simple keyword overlap between preferred roles and job title."""
    if not preferred_roles:
        return 0.5  # neutral
    job_words = set(job_title.lower().split())
    for role in preferred_roles:
        role_words = set(role.lower().split())
        if role_words & job_words:
            return 1.0
    return 0.0


def _location_score(candidate_location: str | None, job_location: str | None) -> float:
    """1.0 if same city/remote, 0.5 if same country, 0.0 otherwise."""
    if not candidate_location or not job_location:
        return 0.5
    cl = candidate_location.lower()
    jl = job_location.lower()
    if "remote" in jl or "remote" in cl:
        return 1.0
    if cl == jl:
        return 1.0
    # Check country-level match (last token heuristic)
    if cl.split(",")[-1].strip() == jl.split(",")[-1].strip():
        return 0.5
    return 0.0


# ---------------------------------------------------------------------------
# Core scorer
# ---------------------------------------------------------------------------

WEIGHTS = {"skill": 0.5, "experience": 0.2, "role": 0.2, "location": 0.1}
SEMANTIC_BLEND = 0.2  # when embeddings available, blend this fraction in


def compute_match(candidate: CandidateProfile, job: Job) -> dict:
    """Return a full scoring dict for one candidate–job pair."""
    skill_score, matched, missing = _skill_score(
        candidate.skills or [], job.required_skills or []
    )
    exp_score = _experience_score(
        candidate.experience_years or 0, job.experience_years_min or 0
    )
    role_score = _role_score(candidate.preferred_roles or [], job.title)
    loc_score = _location_score(candidate.location, job.location)

    base_score = (
        WEIGHTS["skill"] * skill_score
        + WEIGHTS["experience"] * exp_score
        + WEIGHTS["role"] * role_score
        + WEIGHTS["location"] * loc_score
    )

    # Semantic blend
    semantic_score = 0.0
    if candidate.embedding and job.embedding:
        semantic_score = cosine_similarity(candidate.embedding, job.embedding)
        total = (1 - SEMANTIC_BLEND) * base_score + SEMANTIC_BLEND * semantic_score
    else:
        total = base_score

    return {
        "score_total": round(total, 4),
        "score_skill": round(skill_score, 4),
        "score_experience": round(exp_score, 4),
        "score_role": round(role_score, 4),
        "score_location": round(loc_score, 4),
        "score_semantic": round(semantic_score, 4),
        "matched_skills": matched,
        "missing_skills": missing,
    }


# ---------------------------------------------------------------------------
# Batch matching & persistence
# ---------------------------------------------------------------------------

def run_matching_for_candidate(candidate: CandidateProfile, db: Session,
                                min_score: float = 0.3,
                                job_limit: int = 25) -> List[Match]:
    """Score candidate against the most-recent active jobs (capped at job_limit)."""
    # Fetch only the latest N jobs — avoids full-table scan on large DBs
    jobs = (
        db.query(Job)
        .filter(Job.is_active == True)
        .order_by(Job.id.desc())
        .limit(job_limit)
        .all()
    )

    # Pre-fetch existing match IDs to skip DB round-trips inside the loop
    existing_map = {
        m.job_id: m
        for m in db.query(Match).filter_by(candidate_id=candidate.id).all()
    }

    results: List[Match] = []
    for job in jobs:
        scores = compute_match(candidate, job)
        if scores["score_total"] < min_score:
            continue

        if job.id in existing_map:
            match = existing_map[job.id]
            for k, v in scores.items():
                setattr(match, k, v)
        else:
            match = Match(candidate_id=candidate.id, job_id=job.id, **scores)
            db.add(match)

        results.append(match)

    db.commit()
    return results


def run_matching_for_job(job: Job, db: Session,
                          min_score: float = 0.3,
                          candidate_limit: int = 25) -> List[Match]:
    """Score the most-recent candidates against a new job (capped at candidate_limit)."""
    candidates = (
        db.query(CandidateProfile)
        .order_by(CandidateProfile.id.desc())
        .limit(candidate_limit)
        .all()
    )

    existing_map = {
        m.candidate_id: m
        for m in db.query(Match).filter_by(job_id=job.id).all()
    }

    results: List[Match] = []
    for candidate in candidates:
        scores = compute_match(candidate, job)
        if scores["score_total"] < min_score:
            continue

        if candidate.id in existing_map:
            match = existing_map[candidate.id]
            for k, v in scores.items():
                setattr(match, k, v)
        else:
            match = Match(candidate_id=candidate.id, job_id=job.id, **scores)
            db.add(match)

        results.append(match)

    db.commit()
    return results


# ---------------------------------------------------------------------------
# Notification helpers
# ---------------------------------------------------------------------------

def notify_candidate(candidate: CandidateProfile, job: Job,
                     score: float, db: Session):
    notif = Notification(
        user_id=candidate.user_id,
        title="New Job Match Found!",
        message=(
            f"You matched {int(score * 100)}% with '{job.title}' "
            f"at {job.company_name}. Check your recommendations."
        ),
    )
    db.add(notif)
    db.commit()


def notify_company(job: Job, candidate: CandidateProfile,
                   score: float, db: Session):
    if not job.company_user_id:
        return
    notif = Notification(
        user_id=job.company_user_id,
        title="New Candidate Match!",
        message=(
            f"{candidate.full_name} matched {int(score * 100)}% "
            f"with your job '{job.title}'."
        ),
    )
    db.add(notif)
    db.commit()
