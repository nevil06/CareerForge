"""
Email Service — Brevo Transactional Email API (v3)
Docs: https://developers.brevo.com/reference/sendtransacemail
Uses httpx (already in requirements) — no extra SDK needed.
"""
import httpx
from typing import Optional
from app.core.config import settings

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


# ---------------------------------------------------------------------------
# Core send helper
# ---------------------------------------------------------------------------

async def send_email(to_email: str, to_name: str,
                     subject: str, html_body: str, text_body: str = "") -> bool:
    """Send a transactional email via Brevo API."""
    if not settings.BREVO_API_KEY:
        return False

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body or "",
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": settings.BREVO_API_KEY,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(BREVO_API_URL, json=payload, headers=headers)
            resp.raise_for_status()
            return True
    except Exception as e:
        print(f"[email] Brevo send failed → {to_email}: {e}")
        return False


# ---------------------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------------------

def _template(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:0}}
  .wrap{{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}}
  .hdr{{background:#4f6ef7;padding:24px 32px}}.hdr h1{{color:#fff;margin:0;font-size:20px}}
  .bdy{{padding:28px 32px;color:#374151;line-height:1.6}}
  .cta{{display:inline-block;margin-top:20px;padding:12px 24px;background:#4f6ef7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600}}
  .ftr{{padding:14px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #f3f4f6}}
</style></head>
<body><div class="wrap">
  <div class="hdr"><h1>⚡ Carrier-Forge</h1></div>
  <div class="bdy"><h2 style="margin-top:0">{title}</h2>{body}</div>
  <div class="ftr">You're receiving this because you have an account on Carrier-Forge.</div>
</div></body></html>"""


# ---------------------------------------------------------------------------
# Notification helpers
# ---------------------------------------------------------------------------

async def send_candidate_match_email(to_email: str, candidate_name: str,
                                      job_title: str, company_name: str,
                                      score: float,
                                      app_link: Optional[str] = None) -> bool:
    pct = int(score * 100)
    cta_href = app_link or "http://localhost:3000/candidate/dashboard"
    body = f"""
    <p>Hi <strong>{candidate_name}</strong>,</p>
    <p>You matched <strong>{pct}%</strong> with a new job opportunity:</p>
    <p style="font-size:18px;font-weight:600;color:#4f6ef7">{job_title}</p>
    <p style="color:#6b7280;margin-top:4px">at {company_name}</p>
    <a class="cta" href="{cta_href}">{'Apply Now' if app_link else 'View Match'}</a>
    """
    html = _template("New Job Match Found! 🎯", body)
    text = f"Hi {candidate_name}, you matched {pct}% with '{job_title}' at {company_name}."
    return await send_email(
        to_email, candidate_name,
        f"You matched {pct}% with {job_title} at {company_name}",
        html, text,
    )


async def send_company_match_email(to_email: str, company_contact_name: str,
                                    candidate_name: str, job_title: str,
                                    score: float) -> bool:
    pct = int(score * 100)
    body = f"""
    <p>Hi <strong>{company_contact_name}</strong>,</p>
    <p>A new candidate matched <strong>{pct}%</strong> with your posting:</p>
    <p style="font-size:18px;font-weight:600;color:#4f6ef7">{candidate_name}</p>
    <p style="color:#6b7280;margin-top:4px">for the role of {job_title}</p>
    <a class="cta" href="http://localhost:3000/company/dashboard">View on Carrier-Forge</a>
    """
    html = _template("New Candidate Match! 👤", body)
    text = f"{candidate_name} matched {pct}% with your job '{job_title}'."
    return await send_email(
        to_email, company_contact_name,
        f"New {pct}% match for {job_title} — {candidate_name}",
        html, text,
    )
