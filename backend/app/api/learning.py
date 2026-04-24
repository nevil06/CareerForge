"""
CareerForge Agent — Learning Engine API
POST /api/learn/agent    → dispatch to AI agent
GET  /api/learn/roadmap  → fetch current roadmap
POST /api/learn/roadmap/chapter/{chapter_id}/complete → mark chapter done
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.candidate import CandidateProfile
from app.models.learning import LearningRoadmap, QuizAttempt, ProjectSubmission
from app.schemas.learning import AgentRequest, RoadmapOut

router = APIRouter(prefix="/api/learn", tags=["learning"])


def _get_profile(user: User, db: Session) -> CandidateProfile:
    profile = db.query(CandidateProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found. Upload your resume first.")
    return profile


def _get_or_create_roadmap(profile: CandidateProfile, db: Session) -> LearningRoadmap | None:
    return db.query(LearningRoadmap).filter_by(candidate_id=profile.id).order_by(
        LearningRoadmap.id.desc()
    ).first()


# ---------------------------------------------------------------------------
# Main dispatcher
# ---------------------------------------------------------------------------

@router.post("/agent")
async def agent_dispatch(
    payload: AgentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.services.ai_service import (
        agent_generate_roadmap, agent_generate_quiz,
        agent_evaluate_quiz, agent_generate_project, agent_verify_project,
    )

    profile = _get_profile(user, db)
    action = payload.action.strip()

    # ── generate_roadmap ───────────────────────────────────────────────────
    if action == "generate_roadmap":
        result = agent_generate_roadmap(
            interests=payload.user_interests or "",
            skills=payload.skills or profile.skills or [],
            current_score=payload.current_score or profile.careerforge_score or 0,
        )
        # Persist / overwrite roadmap
        existing = _get_or_create_roadmap(profile, db)
        if existing:
            existing.target_role = result.get("target_role")
            existing.level = result.get("level")
            existing.skill_gaps = result.get("skill_gaps", [])
            existing.roadmap = result.get("roadmap", [])
            existing.total_score_possible = result.get("total_score_possible", 0)
            existing.total_points_earned = 0
            roadmap_obj = existing
        else:
            roadmap_obj = LearningRoadmap(
                candidate_id=profile.id,
                target_role=result.get("target_role"),
                level=result.get("level"),
                skill_gaps=result.get("skill_gaps", []),
                roadmap=result.get("roadmap", []),
                total_score_possible=result.get("total_score_possible", 0),
            )
            db.add(roadmap_obj)
        db.commit()
        db.refresh(roadmap_obj)
        return {"action": "generate_roadmap", "roadmap_id": roadmap_obj.id, **result}

    # ── generate_quiz ──────────────────────────────────────────────────────
    if action == "generate_quiz":
        result = agent_generate_quiz(
            chapter_id=payload.chapter_id or "",
            chapter_title=payload.chapter_title or "",
            concepts=payload.concepts or [],
        )
        return {"action": "generate_quiz", **result}

    # ── evaluate_quiz ──────────────────────────────────────────────────────
    if action == "evaluate_quiz":
        result = agent_evaluate_quiz(payload.quiz_score or 0)
        passed = result["status"] == "PASS"
        points = 5 if passed else 0   # learning_points on quiz pass

        # Store quiz attempt
        roadmap_obj = _get_or_create_roadmap(profile, db)
        if roadmap_obj:
            attempt = QuizAttempt(
                roadmap_id=roadmap_obj.id,
                chapter_id=payload.chapter_id or "",
                score=payload.quiz_score or 0,
                passed=passed,
                points_awarded=points,
            )
            db.add(attempt)
            if passed:
                roadmap_obj.total_points_earned = (roadmap_obj.total_points_earned or 0) + points
            db.commit()

        return {"action": "evaluate_quiz", **result}

    # ── generate_project ───────────────────────────────────────────────────
    if action == "generate_project":
        roadmap_obj = _get_or_create_roadmap(profile, db)
        level = roadmap_obj.level if roadmap_obj else "Beginner"
        result = agent_generate_project(
            chapter_id=payload.chapter_id or "",
            chapter_title=payload.chapter_title or "",
            concepts=payload.concepts or [],
            level=level,
        )
        return {"action": "generate_project", **result}

    # ── verify_project ─────────────────────────────────────────────────────
    if action == "verify_project":
        if not payload.github_link:
            raise HTTPException(400, "github_link is required for verify_project")

        result = await agent_verify_project(
            github_link=payload.github_link,
            verification_rules=payload.verification_rules or {},
            chapter_title=payload.chapter_title or "",
        )

        roadmap_obj = _get_or_create_roadmap(profile, db)
        if roadmap_obj:
            sub = ProjectSubmission(
                roadmap_id=roadmap_obj.id,
                chapter_id=payload.chapter_id or "",
                github_link=payload.github_link,
                status=result.get("status", "FAIL"),
                score=result.get("score", 0),
                feedback=result.get("feedback", ""),
                points_awarded=result.get("award_points", 0),
            )
            db.add(sub)

            # Award project points and unlock next chapter on PASS
            if result.get("status") == "PASS":
                roadmap_obj.total_points_earned = (
                    (roadmap_obj.total_points_earned or 0) + result.get("award_points", 0)
                )
                # Unlock next chapter in roadmap JSON
                roadmap_obj.roadmap = _unlock_next_chapter(
                    roadmap_obj.roadmap, payload.chapter_id or ""
                )
                # Bump candidate careerforge_score slightly
                profile.careerforge_score = min(
                    100, (profile.careerforge_score or 0) + 2
                )

            db.commit()

        return {"action": "verify_project", **result}

    raise HTTPException(400, f"Unknown action: '{action}'. Supported: generate_roadmap, generate_quiz, evaluate_quiz, generate_project, verify_project")


# ---------------------------------------------------------------------------
# Roadmap fetch
# ---------------------------------------------------------------------------

@router.get("/roadmap", response_model=RoadmapOut)
def get_roadmap(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _get_profile(user, db)
    roadmap_obj = _get_or_create_roadmap(profile, db)
    if not roadmap_obj:
        raise HTTPException(404, "No roadmap generated yet.")
    return roadmap_obj


# ---------------------------------------------------------------------------
# Helper: unlock the next chapter after one is completed
# ---------------------------------------------------------------------------

def _unlock_next_chapter(roadmap: list, completed_chapter_id: str) -> list:
    """Walk through the roadmap JSON and unlock the chapter immediately after the completed one."""
    found = False
    for level in roadmap:
        for chapter in level.get("chapters", []):
            if found and chapter.get("status") == "locked":
                chapter["status"] = "unlocked"
                return roadmap   # only unlock one at a time
            if chapter.get("id") == completed_chapter_id:
                chapter["status"] = "completed"
                found = True
    return roadmap
