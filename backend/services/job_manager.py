import uuid
import time
import threading
import logging
from typing import Dict, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger("forenlytics.jobs")

class JobManager:
    def __init__(self, max_workers=4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()

    def submit_job(self, job_type: str, session_id: Optional[str], func: Callable, *args, **kwargs) -> str:
        job_id = str(uuid.uuid4())
        with self.lock:
            # Initialize job state with user-requested standard format
            self.jobs[job_id] = {
                "status": "pending",
                "created_at": time.time(),
                "result": None,
                "id": job_id,
                "type": job_type,
                "session_id": session_id,
                "error": None,
                "completed_at": None
            }
        
        logger.info(f"Job {job_id} ({job_type}) initialized as pending.")
        
        def _wrapper():
            with self.lock:
                if job_id in self.jobs:
                    self.jobs[job_id]["status"] = "running"
            
            try:
                # We expect func to either return a dict or raise an exception
                # If func returns {"error": "..."} we can optionally mark as failed.
                result = func(*args, **kwargs)
                
                with self.lock:
                    if job_id in self.jobs:
                        if isinstance(result, dict) and "error" in result and result.get("error") != "NO_DATA":
                            self.jobs[job_id]["status"] = "failed"
                            self.jobs[job_id]["error"] = result["error"]
                        else:
                            self.jobs[job_id]["status"] = "completed"
                            self.jobs[job_id]["result"] = result
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
