import logging
import os
import time
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Header, Body
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from services.session_store import session_store, SessionData
from services.audio.facade import audio_facade
from services.report_generator import ReportGenerator
from services.job_manager import job_manager
from services.orchestrator import trigger_orchestrator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("forenlytics.api")

app = FastAPI(title="Forenlytics Backend APIs")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start session cleanup on boot
@app.on_event("startup")
def on_startup():
    session_store.start_cleanup_loop()
    logger.info("Forenlytics API started. Session store active.")

# Global exception handler — NEVER crash, always return safe JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "An internal server error occurred. Our team has been notified."}
    )

@app.get("/health")
def health_check():
    """System health monitor for deployment providers."""
    return {
        "status": "ok",
        "timestamp": time.time(),
        "active_sessions": len(session_store._sessions),
        "version": "1.0.0"
    }

@app.post("/cleanup")
def perform_cleanup():
    """Force cleanup of memory, sessions, jobs, and temporary files."""
    import gc
    import shutil
    import os
    
    # 1. Clear sessions
    session_count = len(session_store._sessions)
    session_store._sessions.clear()
    
    # 2. Clear background jobs
    job_count = len(job_manager.jobs)
    with job_manager.lock:
        job_manager.jobs.clear()
    
    # 3. Clear temp files
    upload_dir = "uploads"
    temp_dir = "temp"
    cleaned_files = 0
    
    for folder in [upload_dir, temp_dir]:
        if os.path.exists(folder):
            for filename in os.listdir(folder):
                file_path = os.path.join(folder, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                    cleaned_files += 1
                except Exception as e:
                    logger.warning(f"Failed to delete {file_path}: {e}")

    # 4. Garbage Collection
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        
    return {
        "status": "success",
        "message": "Full system cleanup performed",
        "sessions_cleared": session_count,
        "jobs_cleared": job_count,
        "files_removed": cleaned_files,
        "memory_freed": True
    }

# Request timing middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = round(time.time() - start, 3)
    logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({elapsed}s)")
    return response

# File size limit (500MB)
MAX_FILE_SIZE = 500 * 1024 * 1024


def _get_session(session_id: Optional[str]) -> tuple[str, SessionData]:
    """Resolve session from header. Creates new if missing/expired."""
    sid, session = session_store.get_or_create(session_id)
    return sid, session


@app.get("/")
def read_root():
    return {"status": "Active", "module": "Forenlytics Core Backend FastAPI", "active_sessions": session_store.active_count}


@app.post("/session")
def create_session():
    """Explicitly create a new session and return its ID."""
    sid = session_store.create_session()
    return {"session_id": sid}


@app.get("/job-status/{job_id}")
def get_job_status(job_id: str):
    job = job_manager.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or expired.")
    
    # We only want to return the result if it's completed
    response = {
        "job_id": job["id"],
        "status": job["status"],
        "type": job["type"],
        "session_id": job["session_id"]
    }
    
    if job["status"] == "completed":
        response["result"] = job["result"]
    elif job["status"] == "failed":
        response["error"] = job["error"]
        
    return response


# ─── HTS ───────────────────────────────────────────────

@app.post("/upload-hts")
async def upload_hts(file: UploadFile = File(...), x_session_id: Optional[str] = Header(None)):
    if not file.filename or not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    sid, session = _get_session(x_session_id)
    
    def process_hts_upload(c):
        res = session.hts.ingest_csv(c)
        if "error" in res:
            return res
        res["session_id"] = sid
        # If it doesn't need mapping, it means it's fully mapped. Trigger analysis cache + orchestrator
        if res.get("status") == "success":
            session.hts.get_analysis_payload()
            session.hts.get_graph_analysis()
            orch_jobs = trigger_orchestrator(sid)
            res["orchestrator_jobs"] = orch_jobs
        return res

    job_id = job_manager.submit_job("HTS_UPLOAD", sid, process_hts_upload, content)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


@app.post("/confirm-hts-mapping")
def confirm_hts_mapping(mapping: dict = Body(...), x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    
    def process_hts_mapping(m):
        res = session.hts.confirm_mapping(m)
        if "error" in res:
            return res
        res["session_id"] = sid
        session.hts.get_analysis_payload()
        session.hts.get_graph_analysis()
        orch_jobs = trigger_orchestrator(sid)
        res["orchestrator_jobs"] = orch_jobs
        return res

    job_id = job_manager.submit_job("HTS_MAPPING", sid, process_hts_mapping, mapping)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


@app.get("/hts-analysis")
def get_hts_analysis(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    # Return immediately, it should be cached by the job
    result = session.hts.get_analysis_payload()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    result["session_id"] = sid
    return result


@app.get("/hts-graph")
def get_hts_graph(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    result = session.hts.get_graph_analysis()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    result["session_id"] = sid
    return result


# ─── GPS ───────────────────────────────────────────────

@app.post("/upload-gps")
async def upload_gps(file: UploadFile = File(...), x_session_id: Optional[str] = Header(None)):
    if not file.filename or not (file.filename.endswith('.csv') or file.filename.endswith('.json')):
        raise HTTPException(status_code=400, detail="Only CSV or JSON files are supported.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB.")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    sid, session = _get_session(x_session_id)
    
    def process_gps_upload(c, fname):
        res = session.gps.ingest_file(c, fname)
        if "error" in res:
            return res
        res["session_id"] = sid
        if res.get("status") == "success":
            session.gps.get_analysis()
            orch_jobs = trigger_orchestrator(sid)
            res["orchestrator_jobs"] = orch_jobs
        return res

    job_id = job_manager.submit_job("GPS_UPLOAD", sid, process_gps_upload, content, file.filename)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


@app.post("/confirm-gps-mapping")
def confirm_gps_mapping(mapping: dict = Body(...), x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    
    def process_gps_mapping(m):
        res = session.gps.confirm_mapping(m)
        if "error" in res:
            return res
        res["session_id"] = sid
        session.gps.get_analysis()
        orch_jobs = trigger_orchestrator(sid)
        res["orchestrator_jobs"] = orch_jobs
        return res

    job_id = job_manager.submit_job("GPS_MAPPING", sid, process_gps_mapping, mapping)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


@app.get("/gps-analysis")
def get_gps_analysis(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    result = session.gps.get_analysis()
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    result["session_id"] = sid
    return result


# ─── AUDIO (Stateless — uses shared ML model, no session data stored) ───

@app.post("/speaker-embedding-compare")
async def upload_audio_pair(audio_1: UploadFile = File(...), audio_2: UploadFile = File(...), x_session_id: Optional[str] = Header(None)):
    valid_exts = ('.wav', '.mp3')
    if not (audio_1.filename and audio_1.filename.lower().endswith(valid_exts)) or not (audio_2.filename and audio_2.filename.lower().endswith(valid_exts)):
        raise HTTPException(status_code=400, detail="Only .wav and .mp3 files are supported.")
        
    content_1 = await audio_1.read()
    content_2 = await audio_2.read()
    
    if len(content_1) == 0 or len(content_2) == 0:
        raise HTTPException(status_code=400, detail="One or both uploaded audio files are empty.")
    
    if len(content_1) > MAX_FILE_SIZE or len(content_2) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Files exceed maximum size of {MAX_FILE_SIZE // (1024*1024)}MB.")
        
    sid, _ = _get_session(x_session_id)
    
    def process_audio_compare(c1, c2):
        return audio_facade.analyze_pair(c1, c2)
        
    job_id = job_manager.submit_job("AUDIO_COMPARE", sid, process_audio_compare, content_1, content_2)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


@app.post("/deepfake-detect")
async def deepfake_detect(file: UploadFile = File(...), x_session_id: Optional[str] = Header(None)):
    if not file.filename or not file.filename.lower().endswith(('.wav', '.mp3')):
        raise HTTPException(status_code=400, detail="Only .wav and .mp3 files are supported for Deepfake detection.")
        
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB.")
        
    sid, _ = _get_session(x_session_id)
    
    def process_deepfake(c):
        return audio_facade.detect_deepfake(c)
        
    job_id = job_manager.submit_job("AUDIO_DEEPFAKE", sid, process_deepfake, content)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


# ─── TIMELINE ──────────────────────────────────────────

@app.get("/timeline")
def get_timeline(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    if session.timeline_result:
        result = session.timeline_result.copy()
        result["session_id"] = sid
        return result

    # Check if orchestrator is still processing
    orch = session.orchestrator_jobs
    if orch.get("timeline"):
        tl_job = job_manager.get_job_status(orch["timeline"])
        if tl_job and tl_job["status"] in ("pending", "running"):
            return {"status": "processing", "session_id": sid, "message": "Timeline is being generated..."}

    # Safety Net: If no result and no active job, but there IS data in HTS or GPS, trigger it now
    has_hts = session.hts.df is not None and not session.hts.df.empty
    has_gps = session.gps.df is not None and not session.gps.df.empty
    
    if has_hts or has_gps:
        logger.info(f"Auto-triggering orchestrator for session {sid} via GET /timeline")
        orch_jobs = trigger_orchestrator(sid)
        return {
            "status": "processing", 
            "session_id": sid, 
            "message": "Timeline generation started.", 
            "orchestrator_jobs": orch_jobs
        }

    # No data and no active job
    return {"error": "NO_DATA", "session_id": sid, "message": "No data available in either HTS or GPS modules. Please upload target logs in those modules first."}


# ─── REPORTS ───────────────────────────────────────────

@app.get("/generate-report")
def generate_report(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    if session.report_result:
        result = session.report_result.copy()
        result["session_id"] = sid
        return result

    # Check if orchestrator is still processing
    orch = session.orchestrator_jobs
    if orch.get("report"):
        rpt_job = job_manager.get_job_status(orch["report"])
        if rpt_job and rpt_job["status"] in ("pending", "running"):
            return {"status": "processing", "session_id": sid, "message": "Report is being compiled..."}

    # No data and no active job — try synchronous generation as last resort
    has_hts = session.hts.df is not None and not session.hts.df.empty
    has_gps = session.gps.df is not None and not session.gps.df.empty
    
    logger.info(f"Report requested for session {sid}. Has HTS: {has_hts}, Has GPS: {has_gps}")

    if has_hts or has_gps:
        gen = ReportGenerator()
        result = gen.generate_json_summary(session.hts, session.gps)
        session.report_result = result
        result["session_id"] = sid
        return result

    logger.warning(f"Report failed for session {sid}: No data in HTS (df={session.hts.df is not None}) or GPS (df={session.gps.df is not None})")
    return {"status": "no_data", "session_id": sid, "message": "No analysis data available. Upload HTS or GPS data first."}


@app.get("/download-report")
def download_report(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    gen = ReportGenerator()
    pdf_buffer = gen.generate_pdf(session.hts, session.gps)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=Forenlytics_Official_Docket.pdf"}
    )
