import pytest
import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# --- Basic Tests ---

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

# --- Audio / Deepfake Tests ---

def test_deepfake_detect_invalid_file():
    files = {"file": ("test.txt", b"dummy text", "text/plain")}
    response = client.post("/deepfake-detect", files=files)
    assert response.status_code == 400
    assert "Only .wav and .mp3 files" in response.json()["detail"]

def test_deepfake_detect_empty_file():
    files = {"file": ("test.wav", b"", "audio/wav")}
    response = client.post("/deepfake-detect", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]

def test_speaker_compare_missing_file():
    # Only sending one file instead of two
    files = {"audio_1": ("test.wav", b"RIFF....WAVEfmt ", "audio/wav")}
    response = client.post("/speaker-embedding-compare", files=files)
    assert response.status_code == 422

# --- Report Tests ---

def test_generate_report():
    response = client.get("/generate-report")
    assert response.status_code == 200
    data = response.json()
    assert "case_summary" in data
    assert "speaker_verification" in data
    assert "deepfake_diagnostics" in data
    assert "final_summary" in data

def test_download_report():
    response = client.get("/download-report")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert len(response.content) > 0
