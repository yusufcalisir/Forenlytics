# Forenlytics One-Click Air-Gapped Docker Deployment Guide

Forenlytics is engineered for complete, zero-dependency offline (**Air-Gapped**) deployment in digital forensic laboratories, law enforcement evidence examination units, and isolated institutional on-premise servers.

---

## 🌟 Key Capabilities

- **100% Offline (Air-Gapped) Operation:** All deep learning model weights (`SpeechBrain ECAPA-TDNN`, `Microsoft WavLM-SV`, `Wav2Vec2 Deepfake Detector`) and runtime dependencies are pre-packaged. Zero internet calls at runtime (`HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`).
- **One-Click Automated Setup:** Run `scripts/docker/install.bat` on Windows workstations or `scripts/docker/install.sh` on Linux servers for automated image loading, container orchestration, and browser launch.
- **Enterprise-Grade Security:** Isolated bridge network, container-to-container encrypted communication, persistent evidence volumes, and strict non-root backend execution.
- **Optimized Multi-Stage Container Architecture:** Lightweight Next.js standalone runner (~150MB) paired with an audio-codec-enabled (`libsndfile`, `ffmpeg`, `sox`) FastAPI backend.

---

## 🏗️ Architecture Overview

```
                      +-----------------------------+
                      |       Host Browser          |
                      |  http://localhost:3000      |
                      +--------------+--------------+
                                     |
                          Port 3000 (HTTP)
                                     |
            +------------------------v------------------------+
            |  Container: forenlytics-frontend (Next.js 16)   |
            |  - Standalone Node.js Runner                    |
            |  - Reverse Proxy Rewrites /api/backend/*        |
            +------------------------+------------------------+
                                     |
                      Internal Network (Port 8000)
                                     |
            +------------------------v------------------------+
            |  Container: forenlytics-backend (FastAPI)       |
            |  - SpeechBrain ECAPA-TDNN (Offline)             |
            |  - Microsoft WavLM-SV (Offline)                 |
            |  - Wav2Vec2 Deepfake Detector (Offline)         |
            |  - libsndfile, ffmpeg, sox codecs               |
            +------------------------+------------------------+
                                     |
                     Volume: ./models & ./data
```

---

## 📦 1. Preparing the Air-Gapped Bundle (On Internet-Connected Machine)

If you are building the release archive from scratch on an internet-connected build station:

### On Windows:
Double-click `scripts\docker\bundle_airgap.bat` or run via PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\docker\bundle_airgap.ps1
```

### On Linux:
```bash
chmod +x scripts/docker/bundle_airgap.sh
./scripts/docker/bundle_airgap.sh
```

This automated bundling process:
1. Downloads and validates all AI model weights offline via `backend/scripts/download_models.py`.
2. Builds the frontend and backend Docker production images.
3. Exports the Docker images to `images/forenlytics-images.tar`.
4. Packages all launchers, compose configs, documentation, and model directories into `dist/forenlytics-airgap-v2.0.0.zip` (or `.tar.gz`).

---

## 🚀 2. Deploying to the Target Air-Gapped Workstation / Server

Transfer the generated ZIP/TAR archive via USB drive, external hard drive, or secure optical disc to the target offline machine.

### 🖥️ Windows Deployment:
1. Extract the bundle archive to your preferred directory (e.g., `C:\Forenlytics\`).
2. Run **`scripts\docker\install.bat`** (or `scripts\docker\install.ps1`).
3. The wizard will automatically:
   - Verify Docker engine availability,
   - Load pre-built container images (`docker load`),
   - Initialize data and model cache directories,
   - Start the service cluster in background (`docker compose up -d`),
   - Automatically open the browser to **`http://localhost:3000`**.

### 🐧 Linux Server Deployment:
1. Extract the archive:
   ```bash
   tar -xzf forenlytics-airgap-v2.0.0.tar.gz
   cd forenlytics-airgap-v2.0.0
   ```
2. Run the one-click installer:
   ```bash
   chmod +x scripts/docker/*.sh
   ./scripts/docker/install.sh
   ```
3. Access the dashboard from your browser at `http://localhost:3000` (or `http://<server-ip>:3000`).

---

## ⚙️ 3. Daily Operations & Management

| Action | Windows | Linux |
| :--- | :--- | :--- |
| **Start Forenlytics** | `scripts\docker\start.bat` | `./scripts/docker/start.sh` |
| **Stop Forenlytics** | `scripts\docker\stop.bat` | `./scripts/docker/stop.sh` |
| **Status & Live Logs** | `scripts\docker\check_status.bat` | `./scripts/docker/status.sh` |
| **Restart Services** | Run `stop.bat` then `start.bat` | `./scripts/docker/stop.sh && ./scripts/docker/start.sh` |

---

## ⚡ 4. Advanced Configuration & GPU Acceleration

### Port Customization
By default, the Frontend runs on port `3000` and the Backend on port `8000`. To customize ports, edit the `.env` file:
```env
FRONTEND_PORT=8080
BACKEND_PORT=9000
```

### NVIDIA CUDA GPU Acceleration
If the target machine is equipped with an NVIDIA GPU and *NVIDIA Container Toolkit*:
1. Rename `docker-compose.override.yml.example` to `docker-compose.override.yml`.
2. Uncomment the `reservations.devices` GPU block:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           reservations:
             devices:
               - driver: nvidia
                 count: all
                 capabilities: [gpu]
   ```
3. Restart the services via `scripts/docker/start.bat` or `./scripts/docker/start.sh`. PyTorch will automatically bind to CUDA GPU cores for high-speed inference.

---

## 🔍 5. Troubleshooting

- **"Docker is not running" error:** Ensure Docker Desktop is active or run `sudo systemctl start docker` on Linux.
- **Port Conflict:** If port 3000 or 8000 is occupied by another service, change `FRONTEND_PORT` or `BACKEND_PORT` in `.env`.
- **Viewing Diagnostic Logs:** Run `docker compose logs -f backend` to inspect real-time forensic engine logs.
