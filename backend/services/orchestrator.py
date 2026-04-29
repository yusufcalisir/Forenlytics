import time
import logging
from services.job_manager import job_manager
from services.session_store import session_store
from services.timeline_engine import TimelineEngine
from services.report_generator import ReportGenerator

logger = logging.getLogger("forenlytics.orchestrator")

def run_timeline_generation(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        return {"error": "Session not found or expired"}
    
    engine = TimelineEngine()
    result = engine.get_unified_timeline(session.hts, session.gps)
    # Store the result directly on the session so the frontend can just fetch it
    if "error" not in result or result.get("error") == "NO_DATA":
        session.timeline_result = result
    else:
        logger.error(f"Timeline generation error for session {session_id}: {result}")
    return result

def run_report_generation(session_id: str, timeline_job_id: str):
    """Generate report after timeline job finishes. Blocks until timeline is done."""
    # Wait for the timeline job to complete first (max 120s)
    deadline = time.time() + 120
    while time.time() < deadline:
        tl_job = job_manager.get_job_status(timeline_job_id)
        if tl_job and tl_job["status"] in ("completed", "failed"):
            break
        time.sleep(0.5)

    session = session_store.get_session(session_id)
    if not session:
        return {"error": "Session not found or expired"}
    
    gen = ReportGenerator()
    result = gen.generate_json_summary(session.hts, session.gps)
    if "error" not in result:
        session.report_result = result
    return result

def trigger_orchestrator(session_id: str) -> dict:
    """
    Trigger timeline and report generation in the background.
    Called when HTS or GPS finishes their heavy analysis.
    Returns dict of {"timeline": job_id, "report": job_id}.
    Stores job IDs on the session for frontend discoverability.
    """
    logger.info(f"Triggering analysis orchestrator for session {session_id}")
    
    # Clear stale results so the frontend doesn't show old data
    session = session_store.get_session(session_id)
    if session:
        session.timeline_result = None
        session.report_result = None

    timeline_job_id = job_manager.submit_job(
        "TIMELINE_GENERATION",
        session_id,
        run_timeline_generation,
        session_id
    )
    
    # Report waits for timeline to finish first
    report_job_id = job_manager.submit_job(
        "REPORT_GENERATION",
        session_id,
        run_report_generation,
        session_id,
        timeline_job_id
    )

    orchestrator_jobs = {
        "timeline": timeline_job_id,
        "report": report_job_id
    }

    # Store on session so the frontend can discover these job IDs
    if session:
        session.orchestrator_jobs = orchestrator_jobs

    logger.info(f"Orchestrator jobs submitted: timeline={timeline_job_id[:8]}, report={report_job_id[:8]}")
    return orchestrator_jobs
