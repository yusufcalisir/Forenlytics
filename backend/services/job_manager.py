import uuid
import time
import threading
import logging
from typing import Dict, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("forenlytics.jobs")

class JobManager:
    def __init__(self, max_workers=2):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def submit_job(self, job_type: str, session_id: Optional[str], func: Callable, *args, **kwargs) -> str:
        job_id = str(uuid.uuid4())
        with self.lock:
            # Initialize job state with user-requested standard format + real-time progress
            self.jobs[job_id] = {
                "status": "pending",
                "created_at": time.time(),
                "result": None,
                "id": job_id,
                "type": job_type,
                "session_id": session_id,
                "error": None,
                "completed_at": None,
                "progress": {
                    "stage_index": 0,
                    "total_stages": 7 if job_type == "AUDIO_COMPARE" else 6,
                    "stage_name": "Initializing forensic worker...",
                    "stage_key": "init",
                    "engine": "Forensic Ingestion Pipeline",
                    "progress_pct": 5,
                    "telemetry_log": "[0.00s] INITIALIZING: Allocating worker thread and audio buffers..."
                }
            }
        
        logger.info(f"Job {job_id} ({job_type}) initialized as pending.")
        
        def _wrapper():
            with self.lock:
                if job_id in self.jobs:
                    self.jobs[job_id]["status"] = "running"
            
            try:
                # Pass progress callback if accepted or kwargs
                result = func(*args, **kwargs)
                
                with self.lock:
                    if job_id in self.jobs:
                        if isinstance(result, dict) and "error" in result and result.get("error") != "NO_DATA":
                            self.jobs[job_id]["status"] = "failed"
                            self.jobs[job_id]["error"] = result["error"]
                        else:
                            self.jobs[job_id]["status"] = "completed"
                            self.jobs[job_id]["result"] = result
                            if self.jobs[job_id].get("progress"):
                                self.jobs[job_id]["progress"]["progress_pct"] = 100
                                self.jobs[job_id]["progress"]["stage_name"] = "Analysis Complete"
                                self.jobs[job_id]["progress"]["telemetry_log"] = "Completed: Full forensic analysis synthesized."
                        self.jobs[job_id]["completed_at"] = time.time()
                logger.info(f"Job {job_id} ({job_type}) finished.")
            except Exception as e:
                logger.exception(f"Job {job_id} ({job_type}) crashed.")
                with self.lock:
                    if job_id in self.jobs:
                        self.jobs[job_id]["status"] = "failed"
                        self.jobs[job_id]["error"] = str(e)
                        self.jobs[job_id]["completed_at"] = time.time()

        self.executor.submit(_wrapper)
        return job_id

    def update_progress(
        self,
        job_id: str,
        stage_index: int,
        total_stages: int,
        stage_name: str,
        stage_key: str,
        engine: str,
        progress_pct: int,
        telemetry_log: str
    ):
        """Thread-safe update of current executing stage."""
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]["progress"] = {
                    "stage_index": stage_index,
                    "total_stages": total_stages,
                    "stage_name": stage_name,
                    "stage_key": stage_key,
                    "engine": engine,
                    "progress_pct": progress_pct,
                    "telemetry_log": telemetry_log
                }

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            return self.jobs.get(job_id)
            
    def cleanup_old_jobs(self, max_age_seconds=3600):
        with self.lock:
            now = time.time()
            to_delete = []
            for jid, j in self.jobs.items():
                if j["status"] in ["completed", "failed"]:
                    if j["completed_at"] and (now - j["completed_at"] > max_age_seconds):
                        to_delete.append(jid)
            for jid in to_delete:
                del self.jobs[jid]

job_manager = JobManager()
