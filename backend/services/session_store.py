import uuid
import time
import threading
import logging
from typing import Dict, Any, Optional
from services.hts_analyzer import HTSAnalyzer
from services.gps_analyzer import GPSAnalyzer

logger = logging.getLogger("forenlytics.session")

SESSION_TTL_SECONDS = 30 * 60  # 30 minutes
CLEANUP_INTERVAL_SECONDS = 60  # Check every minute


class SessionData:
    """Holds all per-session analyzer instances and metadata."""
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at = time.time()
        self.last_accessed = time.time()
        self.hts = HTSAnalyzer()
        self.gps = GPSAnalyzer()
        self.timeline_result: Optional[Dict[str, Any]] = None
        self.report_result: Optional[Dict[str, Any]] = None
        # Orchestrator-spawned job IDs so the frontend can discover and poll them
        self.orchestrator_jobs: Dict[str, str] = {}
        # Audio / deepfake results are stateless (process-and-return),
        # so we don't store analyzer instances for them.

    def touch(self):
        """Update last accessed timestamp."""
        self.last_accessed = time.time()

    def is_expired(self) -> bool:
        return (time.time() - self.last_accessed) > SESSION_TTL_SECONDS


class SessionStore:
    """Thread-safe in-memory session store with automatic expiration."""

    def __init__(self):
        self._sessions: Dict[str, SessionData] = {}
        self._lock = threading.Lock()
        self._cleanup_thread: Optional[threading.Thread] = None
        self._running = False

    def start_cleanup_loop(self):
        """Start the background cleanup thread."""
        if self._running:
            return
        self._running = True
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()
        logger.info("Session cleanup thread started.")

    def _cleanup_loop(self):
        while self._running:
            time.sleep(CLEANUP_INTERVAL_SECONDS)
            self._purge_expired()

    def _purge_expired(self):
        with self._lock:
            expired = [sid for sid, s in self._sessions.items() if s.is_expired()]
            for sid in expired:
                del self._sessions[sid]
            if expired:
                logger.info(f"Purged {len(expired)} expired sessions. Active: {len(self._sessions)}")

    def create_session(self) -> str:
        """Create a new session and return its ID."""
        session_id = str(uuid.uuid4())
        with self._lock:
            self._sessions[session_id] = SessionData(session_id)
        logger.info(f"Session created: {session_id[:8]}... (active={len(self._sessions)})")
        return session_id

    def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get a session by ID, touching it to refresh TTL. Returns None if not found."""
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if session.is_expired():
                del self._sessions[session_id]
                return None
            session.touch()
            return session

    def get_or_create(self, session_id: Optional[str]) -> tuple[str, SessionData]:
        """Get existing session or create a new one. Returns (session_id, session_data)."""
        if session_id:
            session = self.get_session(session_id)
            if session:
                return session_id, session
        # Create new
        new_id = self.create_session()
        return new_id, self._sessions[new_id]

    def destroy_session(self, session_id: str):
        with self._lock:
            self._sessions.pop(session_id, None)

    @property
    def active_count(self) -> int:
        return len(self._sessions)

    def stop(self):
        self._running = False


# Global singleton
session_store = SessionStore()
