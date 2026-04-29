<div align="center">

<img src="public/banner.png" alt="Forenlytics Hero Banner" width="100%" />

# 🛡️ Forenlytics
**The Command Center for Signal Intelligence & Geospatial Forensic Reconstruction**

[![License: MIT](https://img.shields.io/badge/License-MIT-f39c12.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000000.svg?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Deep Learning](https://img.shields.io/badge/AI-Neural_Audio-e74c3c.svg?style=for-the-badge&logo=pytorch)](https://pytorch.org/)

<p align="center">
  Forenlytics is an elite forensic environment designed for intelligence professionals to ingest raw telecom signaling, geospatial movement logs, and vocal biometric samples—transforming them into high-fidelity investigative intelligence.
</p>

[**Explore Documentation**](#-technical-implementation) • [**Setup Guide**](#-setup--installation) • [**Architecture**](#-system-architecture)

</div>

---

## ✨ Core Intelligence Modules

<table width="100%">
  <tr>
    <td width="50%" valign="top">
      <h4>📊 Signal Intelligence (HTS)</h4>
      <p>Automated graph-based analysis of massive communication matrices. Reconstructs network topologies to identify hubs, bridge-entities, and cluster communities using NetworkX modularity.</p>
    </td>
    <td width="50%" valign="top">
      <h4>📍 Geospatial Reconstruction</h4>
      <p>Transforms raw coordinate sequences into behavioral movement profiles. Heuristically identifies stationary halts and detects velocity anomalies or path inconsistencies.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h4>🕰️ Unified Timeline Orchestrator</h4>
      <p>The master correlator integrating heterogeneous data sources. Correlates signal events with physical location to answer exactly where a target was at any given second.</p>
    </td>
    <td width="50%" valign="top">
      <h4>🎙️ Audio Forensic Suite</h4>
      <p>Neural vocal biometric verification via Microsoft WavLM. Scans for synthetic artifacts, deepfake patterns, and provides high-fidelity similarity scoring.</p>
    </td>
  </tr>
</table>

---

## 🏗️ System Architecture

Forenlytics is built on a state-of-the-art, decoupled architecture designed for high-concurrency data processing.

```mermaid
graph TD
    subgraph Client ["Client Layer (Next.js 15)"]
        UI[Forensic Dashboard]
        Store[Zustand State Engine]
        Poll[Async Job Poller]
    end

    subgraph API ["API Gateway (FastAPI)"]
        Router[Endpoints & Middleware]
        Manager[Job Queue Orchestrator]
        Session[In-Memory Session Store]
    end

    subgraph Cores ["Intelligence Cores"]
        HTS[HTS Graph Engine]
        GPS[GPS Spatial Engine]
        TLE[Timeline Correlator]
        AUD[Neural Audio Suite]
    end

    UI <--> Router
    Router --> Manager
    Manager --> Session
    Manager --> Cores
    Session --> Cores
```

---

## 🛡️ Privacy & Forensic Integrity

Forenlytics follows **Stateless Ephemeral Processing** principles.

> [!IMPORTANT]
> **Zero Persistence**: All uploaded forensic artifacts and processed results exist only in the volatile memory (RAM) of the server. No databases, no logs, no leaks. Data is automatically purged after 30 minutes of inactivity.

---

## 💻 Technical Implementation

### Key Backend Endpoints

| Method | Endpoint | Forensic Logic |
| :--- | :--- | :--- |
| `POST` | `/upload-hts` | Automated parsing & heuristic column mapping |
| `GET` | `/hts-graph` | Network topology & community metrics |
| `POST` | `/speaker-embedding-compare` | Neural vocal biometric comparison |
| `GET` | `/download-report` | PDF Intelligence stream generation |

### Directory Structure
```text
.
├── src/                    # Frontend: Next.js + Tailwind
│   ├── app/                # Forensic Modules (Audio, GPS, HTS, etc.)
│   ├── components/         # High-fidelity UI Panels & Visualizations
│   └── lib/                # API Engine & Global State
├── backend/                # Backend: FastAPI + ML Cores
│   ├── services/           # The "Brain": Signal & Math Engines
│   └── main.py             # Orchestration & Job Management
└── public/                 # Static Assets & Documentation
```

---

## ⚡ Setup & Installation

### Prerequisites
- Node.js 18+ & Python 3.11+
- FFmpeg (for audio normalization)

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
# From root
npm install
npm run dev
```

---

## 📜 License & Acknowledgments

- **Copyright**: © 2026 Yusuf Çalışır.
- **License**: Licensed under the [MIT License](LICENSE).
- **Core Engine**: Powered by Microsoft WavLM, NetworkX, and FastAPI.