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

def test_create_session():
    response = client.post("/session")
    assert response.status_code == 200
    assert "session_id" in response.json()

# --- HTS Tests ---

def test_upload_hts_valid():
    csv_content = b"timestamp,caller_number,receiver_number,duration,base_station_id\n2024-01-01 10:00:00,123,456,10,bs1"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/upload-hts", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["status"] == "success"

def test_upload_hts_invalid_type():
    files = {"file": ("test.txt", b"invalid data", "text/plain")}
    response = client.post("/upload-hts", files=files)
    assert response.status_code == 400
    assert "Only CSV files" in response.json()["detail"]

def test_upload_hts_empty():
    files = {"file": ("test.csv", b"", "text/csv")}
    response = client.post("/upload-hts", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"]

def test_upload_hts_oversize():
    # Simulate a file larger than MAX_FILE_SIZE (50MB)
    oversize_content = b"a" * (51 * 1024 * 1024)
    files = {"file": ("test.csv", oversize_content, "text/csv")}
    response = client.post("/upload-hts", files=files)
    assert response.status_code == 400
    assert "exceeds maximum size" in response.json()["detail"]

def test_hts_analysis_no_data():
    response = client.get("/hts-analysis")
    # Because we don't have data in a new session
    assert response.status_code == 400
    assert "No data available" in response.json()["detail"]

# --- GPS Tests ---

def test_upload_gps_valid():
    csv_content = b"timestamp,latitude,longitude,device_id\n2024-01-01 10:00:00,40.7128,-74.0060,device1"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/upload-gps", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["status"] == "success"

def test_upload_gps_invalid_type():
    files = {"file": ("test.txt", b"invalid", "text/plain")}
    response = client.post("/upload-gps", files=files)
    assert response.status_code == 400
    assert "Only CSV or JSON files" in response.json()["detail"]

# --- Timeline Tests ---

def test_timeline_engine_empty_session():
    # Calling timeline without uploading HTS/GPS first
    response = client.get("/timeline")
    # Returns 200 but with error inside (special case handled by frontend)
    assert response.status_code == 200
    assert response.json()["error"] == "NO_DATA"

def test_timeline_engine_with_data():
    session_res = client.post("/session")
    sid = session_res.json()["session_id"]
    headers = {"x-session-id": sid}

    hts_csv = b"timestamp,caller_number,receiver_number,base_station_id\n2024-01-01 10:00:00,123,456,bs1"
    client.post("/upload-hts", files={"file": ("test.csv", hts_csv)}, headers=headers)
    
    gps_csv = b"timestamp,latitude,longitude\n2024-01-01 10:05:00,40.0,-74.0"
    client.post("/upload-gps", files={"file": ("test.csv", gps_csv)}, headers=headers)

    response = client.get("/timeline", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    assert len(data["events"]) > 0
    assert data["session_id"] == sid

# --- Audio/Deepfake Tests ---

def test_deepfake_detect_invalid_file():
    files = {"file": ("test.txt", b"audio", "text/plain")}
    response = client.post("/deepfake-detect", files=files)
    assert response.status_code == 400
    assert "Only .wav and .mp3 files" in response.json()["detail"]

def test_speaker_compare_missing_file():
    # Only sending one file instead of two
    files = {"audio_1": ("test.wav", b"RIFFchunksizeWAVEfmt ", "audio/wav")}
    response = client.post("/speaker-embedding-compare", files=files)
    # FastAPI automatically rejects if required fields are missing
    assert response.status_code == 422
