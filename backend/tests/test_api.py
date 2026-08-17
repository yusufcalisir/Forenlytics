"""
Forenlytics Backend API Tests
===============================
Tests the public API surface without calling real ML models.
"""

import pytest
import io
import struct
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


# ── Helpers ─────────────────────────────────────────────────────────────────

def make_wav_bytes(duration_sec=3, sample_rate=16000, amplitude=0.3) -> bytes:
    """Generate a minimal valid WAV file with a sine wave for testing."""
    import math
    num_samples = int(duration_sec * sample_rate)
    # Simple 440 Hz tone
    samples = [int(amplitude * 32767 * math.sin(2 * math.pi * 440 * i / sample_rate))
               for i in range(num_samples)]
    buf = io.BytesIO()
    # WAV header
    data_size = num_samples * 2  # 16-bit PCM
    buf.write(b"RIFF")
    buf.write(struct.pack("<I", 36 + data_size))  # ChunkSize
    buf.write(b"WAVE")
    buf.write(b"fmt ")
    buf.write(struct.pack("<I", 16))        # Subchunk1Size
    buf.write(struct.pack("<H", 1))         # PCM format
    buf.write(struct.pack("<H", 1))         # Mono
    buf.write(struct.pack("<I", sample_rate))
    buf.write(struct.pack("<I", sample_rate * 2))  # ByteRate
    buf.write(struct.pack("<H", 2))         # BlockAlign
    buf.write(struct.pack("<H", 16))        # BitsPerSample
    buf.write(b"data")
    buf.write(struct.pack("<I", data_size))
    for s in samples:
        buf.write(struct.pack("<h", s))
    return buf.getvalue()


VALID_WAV = make_wav_bytes(duration_sec=3)
SHORT_WAV = make_wav_bytes(duration_sec=0.5)   # Too short (< 1.5s)
SILENT_WAV = make_wav_bytes(duration_sec=3, amplitude=0.0)  # All zeros → no speech


# ── Core API Tests ───────────────────────────────────────────────────────────

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Active"
    assert "Audio" in data["module"]


def test_create_session():
    response = client.post("/session")
    assert response.status_code == 200
    assert "session_id" in response.json()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["module"] == "Audio Forensics"


def test_cleanup():
    response = client.post("/cleanup")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"


# ── Upload Validation Tests ──────────────────────────────────────────────────

def test_deepfake_detect_invalid_extension():
    """Unsupported file extension should be rejected at the API layer."""
    files = {"file": ("test.txt", b"dummy text", "text/plain")}
    response = client.post("/deepfake-detect", files=files)
    assert response.status_code == 400
    assert "supported" in response.json()["detail"].lower()


def test_deepfake_detect_empty_file():
    """Zero-byte file should be rejected immediately."""
    files = {"file": ("test.wav", b"", "audio/wav")}
    response = client.post("/deepfake-detect", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_speaker_compare_missing_second_file():
    """Only sending one file instead of two → FastAPI 422 validation error."""
    files = {"audio_1": ("test.wav", VALID_WAV, "audio/wav")}
    response = client.post("/speaker-embedding-compare", files=files)
    assert response.status_code == 422


def test_speaker_compare_invalid_extension():
    """Non-audio extension should be rejected."""
    bad = {"audio_1": ("test.csv", b"a,b,c", "text/csv"),
           "audio_2": ("test.wav", VALID_WAV, "audio/wav")}
    response = client.post("/speaker-embedding-compare", files=bad)
    assert response.status_code == 400


# ── Job Submission Tests ────────────────────────────────────────────────────

def test_deepfake_detect_submits_job():
    """
    A valid WAV file should be accepted and a job_id returned.
    We do NOT wait for the job to complete — we just verify the async submission.
    The preprocessing and ML work happens in a background thread.
    """
    files = {"file": ("test.wav", VALID_WAV, "audio/wav")}
    response = client.post("/deepfake-detect", files=files)
    # If the endpoint accepted it, it returns 200 with a job_id
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


def test_speaker_compare_submits_job():
    """Two valid WAV files should be accepted and return a job_id."""
    files = {
        "audio_1": ("target.wav", VALID_WAV, "audio/wav"),
        "audio_2": ("compare.wav", VALID_WAV, "audio/wav"),
    }
    response = client.post("/speaker-embedding-compare", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"


def test_job_status_not_found():
    """Querying a non-existent job should return 404."""
    response = client.get("/job-status/does-not-exist-12345")
    assert response.status_code == 404


def test_job_status_valid_job():
    """Submit a job and immediately query its status (should be pending or running)."""
    files = {"file": ("test.wav", VALID_WAV, "audio/wav")}
    submit = client.post("/deepfake-detect", files=files)
    assert submit.status_code == 200
    job_id = submit.json()["job_id"]

    status = client.get(f"/job-status/{job_id}")
    assert status.status_code == 200
    data = status.json()
    assert data["job_id"] == job_id
    assert data["status"] in ["pending", "running", "completed", "failed"]


# ── Report Tests ─────────────────────────────────────────────────────────────

def test_generate_report_empty_session():
    """Report with no analysis data should still return a valid structure."""
    response = client.get("/generate-report")
    assert response.status_code == 200
    data = response.json()
    assert "case_summary" in data
    assert "speaker_verification" in data
    assert "deepfake_diagnostics" in data
    assert "final_summary" in data


def test_download_report_empty_session():
    """PDF generation with no data should return a valid PDF-format response."""
    response = client.get("/download-report")
    assert response.status_code == 200
    assert "pdf" in response.headers["content-type"].lower()
    assert len(response.content) > 0
