import logging
import os
import time
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Header
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from services.session_store import session_store, SessionData
from services.audio.facade import audio_facade
from services.report_generator import report_generator
from services.job_manager import job_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
# Silence noisy HTTP discovery HEAD requests from Hugging Face clients
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("transformers").setLevel(logging.WARNING)

logger = logging.getLogger("forenlytics.api")

app = FastAPI(title="Forenlytics Audio Forensics Backend API")

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
    logger.info(
        "Forenlytics Audio Forensics API started. "
        "Session store active. "
        "Supported formats: WAV, MP3, FLAC, OGG (decoded via torchaudio / soundfile)."
    )

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
        "active_sessions": session_store.active_count,
        "version": "2.0.0",
        "module": "Audio Forensics"
    }

@app.post("/cleanup")
def perform_cleanup():
    """Force cleanup of memory, sessions, jobs, and temporary files."""
    import gc
    import shutil
    
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
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except ImportError:
        pass
        
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
    return {
        "status": "Active",
        "module": "Forenlytics Neural Audio Forensics Suite",
        "active_sessions": session_store.active_count
    }


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


# ─── AUDIO FORENSICS (Vocal Biometrics & Deepfake Detection) ───

@app.post("/speaker-embedding-compare")
async def upload_audio_pair(
    audio_1: UploadFile = File(...),
    audio_2: UploadFile = File(...),
    x_session_id: Optional[str] = Header(None)
):
    valid_exts = ('.wav', '.mp3', '.flac', '.ogg', '.m4a')
    if not (audio_1.filename and audio_1.filename.lower().endswith(valid_exts)) or not (audio_2.filename and audio_2.filename.lower().endswith(valid_exts)):
        raise HTTPException(status_code=400, detail="Unsupported file format. Supported: WAV, MP3, FLAC, OGG, M4A.")
        
    content_1 = await audio_1.read()
    content_2 = await audio_2.read()
    
    if len(content_1) == 0 or len(content_2) == 0:
        raise HTTPException(status_code=400, detail="One or both uploaded audio files are empty.")
    
    if len(content_1) > MAX_FILE_SIZE or len(content_2) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Files exceed maximum size of {MAX_FILE_SIZE // (1024*1024)}MB.")
        
    sid, session = _get_session(x_session_id)
    
    def process_audio_compare(c1, c2):
        result = audio_facade.analyze_pair(c1, c2)
        if result and "error" not in result:
            session.audio_compare_result = result
        return result
        
    job_id = job_manager.submit_job("AUDIO_COMPARE", sid, process_audio_compare, content_1, content_2)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


@app.post("/deepfake-detect")
async def deepfake_detect(
    file: UploadFile = File(...),
    x_session_id: Optional[str] = Header(None)
):
    if not file.filename or not file.filename.lower().endswith(('.wav', '.mp3', '.flac', '.ogg', '.m4a')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Supported: WAV, MP3, FLAC, OGG, M4A.")
        
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {MAX_FILE_SIZE // (1024*1024)}MB.")
        
    sid, session = _get_session(x_session_id)
    
    def process_deepfake(c):
        result = audio_facade.detect_deepfake(c)
        if result and "error" not in result:
            session.audio_deepfake_result = result
        return result
        
    job_id = job_manager.submit_job("AUDIO_DEEPFAKE", sid, process_deepfake, content)
    return {"job_id": job_id, "status": "pending", "session_id": sid}


# ─── FORENSIC REPORTS (PDF Docket & Structured Summary) ───

@app.get("/generate-report")
def generate_report(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    if session.report_result:
        result = session.report_result.copy()
        result["session_id"] = sid
        return result

    result = report_generator.generate_json_summary(
        session.audio_compare_result,
        session.audio_deepfake_result
    )
    session.report_result = result
    result["session_id"] = sid
    return result


@app.get("/download-report")
def download_report(x_session_id: Optional[str] = Header(None)):
    sid, session = _get_session(x_session_id)
    pdf_buffer = report_generator.generate_pdf(
        session.audio_compare_result,
        session.audio_deepfake_result
    )
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=Forenlytics_Audio_Docket.pdf"}
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

