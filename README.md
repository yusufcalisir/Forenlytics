# 🛡️ Forenlytics
### High-Fidelity Neural Audio Forensic Intelligence & Synthetics Analysis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-f39c12.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-000000.svg?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Deep Learning](https://img.shields.io/badge/AI-Neural_Audio-e74c3c.svg?style=for-the-badge&logo=pytorch)](https://pytorch.org/)

<br />

<div align="center">
  <a href="https://forenlytics.vercel.app/">
    <img src="https://img.shields.io/badge/LIVE%20DEMO-ENTER%20COMMAND%20CENTER-blue?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" height="40">
  </a>
</div>

<br />

Forenlytics is an elite audio forensics environment designed for intelligence and legal professionals to ingest acoustic specimens and vocal samples, transforming them into high-fidelity investigative intelligence through neural biometric verification and synthetic anomaly detection.

---

## ✨ Core Intelligence Modules

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h4>🎙️ Neural Speaker Verification</h4>
      <p>Dual-stream biometric comparison using <b>Microsoft WavLM Large</b> and <b>Wav2Vec2-XLSR</b> deep neural embeddings. Computes cosine similarity across masked speech representations.</p>
    </td>
    <td width="50%" valign="top">
      <h4>🧬 Physiological Vocal Biometrics</h4>
      <p>Extracts fundamental frequency (F0), formant bandwidth ratios, shimmer, jitter, and spectral harmonic distributions for non-invasive vocal tract profiling.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4>⚡ Synthetic Vocoder & Deepfake Scan</h4>
      <p>Detects AI voice synthesis and deepfakes by identifying temporal embedding over-smoothing, zero-crossing rate anomalies, and high-frequency spectral roll-off distortions.</p>
    </td>
    <td width="50%" valign="top">
      <h4>📄 Court-Ready Forensic PDF Dockets</h4>
      <p>Instantly compiles and exports structured forensic dockets with mathematical similarity scores, biometric radar breakdowns, diagnostic opinions, and verifiable session telemetry.</p>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture

Forenlytics is built on a high-throughput, decoupled architecture designed for neural audio model execution and ephemeral session management.

```mermaid
graph TD
    subgraph Client ["Client Layer (Next.js 16)"]
        UI[Audio Forensics Command Center]
        Store[Zustand State Engine]
        Poll[Async Job Poller]
    end

    subgraph API ["API Gateway (FastAPI)"]
        Router[Endpoints & CORS Middleware]
        Manager[Job Queue Orchestrator]
        Session[In-Memory Ephemeral Store]
    end

    subgraph Cores ["Neural Audio Cores"]
        WLM[Microsoft WavLM Large Engine]
        W2V[Wav2Vec2-XLSR Embedding Engine]
        BIO[Acoustic Biometric Extractor]
        DFK[Deepfake & Vocoder Artifact Scanner]
        RPT[Forensic Docket Generator]
    end

    UI <--> Router
    Router --> Manager
    Manager --> Session
    Manager --> Cores
    Session --> RPT
```

---

## 🛡️ Privacy & Forensic Integrity

Forenlytics follows strict **Stateless Ephemeral Processing** principles.

> [!IMPORTANT]
> **Zero Persistence**: All uploaded audio specimens and biometric matrices exist solely in volatile server RAM. No audio files or embeddings are permanently stored on disk or in persistent databases. Sessions are automatically purged after 30 minutes of inactivity.

---

## 💻 Technical Implementation

### Backend Endpoints

| Method | Endpoint | Forensic Logic |
| :--- | :--- | :--- |
| `GET` | `/health` | Real-time health, active sessions & operational telemetry |
| `POST` | `/session` | Ephemeral session initialization & UUID allocation |
| `POST` | `/speaker-embedding-compare` | Dual-stream WavLM & biometric voice similarity analysis |
| `POST` | `/deepfake-detect` | Synthetic vocoder artifact & deepfake probability scan |
| `GET` | `/job-status/{job_id}` | Async polling for long-running neural audio workloads |
| `GET` | `/generate-report` | Structured JSON summary of session forensic findings |
| `GET` | `/download-report` | Official PDF Audio Forensic Docket stream generation |
| `POST` | `/cleanup` | Force purge of volatile memory, jobs, and temporary caches |

### Directory Structure
```text
.
├── frontend/               # Next.js 16 Application
│   ├── src/
│   │   ├── app/            # App Router (Dashboard, Audio, Reports)
│   │   ├── components/     # UI & Audio Forensics Modules
│   │   └── lib/            # Zustand Store & API Client
│   └── public/             # Static Assets
├── backend/                # FastAPI Application
│   ├── services/           # Neural Audio, Biometric & Report Engines
│   │   └── audio/          # WavLM, Wav2Vec2, Biometrics & Deepfake
│   └── main.py             # API Routing & Job Management
├── vercel.json             # Multi-service Deployment Configuration
└── LICENSE                 # MIT License
```

---

## ⚡ Setup & Installation

### 1. Initializing Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

### 2. Initializing Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 License & Acknowledgments

- **Copyright**: © 2026 Yusuf Çalışır.
- **License**: Licensed under the [MIT License](LICENSE).
- **Core Engine**: Powered by Microsoft WavLM, PyTorch, Librosa, and FastAPI.