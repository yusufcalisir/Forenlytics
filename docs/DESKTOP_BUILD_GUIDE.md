# Forenlytics Desktop Standalone Build & Deployment Guide

Forenlytics Forensic Audio Examination Platform can be compiled into a standalone, native desktop application (Electron + PyInstaller Standalone Engine) for Windows and Linux, requiring no external web browser or Docker runtime.

---

## 🌟 Key Features

- **Zero-Setup Native Application:** No manual Python, Node.js, or Docker installations required by the end-user.
- **Embedded Lifecycle Controller:** Electron's main process automatically launches the Python FastAPI forensic backend, checks health status (`/health`), and ensures safe process termination (`tree-kill`) when quitting.
- **Native OS Integration:** Native file dialogues for importing audio files (`.wav`, `.mp3`, `.flac`, `.ogg`) and saving forensic PDF examination dockets directly to disk.
- **Forensic Splash Screen:** Real-time animated status window informing the examiner during deep learning model initialization.
- **Portable & Installer Editions:** Generates both `Forenlytics-Setup-2.0.0.exe` (NSIS installer with desktop shortcut) and `Forenlytics-Portable-2.0.0.exe` (single-file executable for USB flash drives).

---

## 🏗️ Desktop Architecture

```
+-------------------------------------------------------------+
|               Forenlytics Desktop Application               |
|                                                             |
|  +---------------------+        +------------------------+  |
|  |   Electron Main     | <----> |  BrowserWindow (UI)    |  |
|  |   - Process Manager |        |  - Next.js Standalone  |  |
|  |   - Tree-Kill Exit  |        |  - Native IPC Bridge   |  |
|  +----------+----------+        +------------------------+  |
|             | (Spawns & Polls /health)                      |
|  +----------v----------+                                    |
|  | forenlytics-backend | (FastAPI + PyTorch + SpeechBrain)  |
|  +---------------------+                                    |
+-------------------------------------------------------------+
```

---

## 📦 1. One-Click Build Process

### On Windows:
Run `scripts\desktop\build_desktop.bat` or execute via PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\desktop\build_desktop.ps1
```

This automated compilation wizard:
1. Compiles the Next.js frontend into production standalone format.
2. Checks and prepares local AI model caches (`SpeechBrain`, `WavLM`, `Wav2Vec2`).
3. Compiles the FastAPI backend into a single standalone binary (`forenlytics-backend.exe`) using PyInstaller.
4. Packages everything via Electron Builder into `dist/desktop/`:
   - `Forenlytics-Setup-2.0.0.exe` (Windows Installer)
   - `Forenlytics-Portable-2.0.0.exe` (Portable Single File)

---

## 🚀 2. Running the Desktop Application

- **One-Click Instant Launch:** Run `scripts\desktop\start_desktop.bat` (or the desktop shortcut `Forenlytics`).
- **Silent Launch (No Console Window):** Run `scripts\desktop\Forenlytics.vbs`.
- **Live Development Mode:** Run `scripts\desktop\start_desktop_dev.bat` for live hot-reload development across Next.js, FastAPI, and Electron.

---

## 📂 3. Directory Layout

```
d:\Forenlytics\
├── desktop\                     # Electron Desktop App Source
│   ├── main.js                 # Electron Main Process & Python Lifecycle Controller
│   ├── preload.js              # Secure IPC Context Bridge
│   ├── splash.html             # Animated Forensic Loading Screen
│   ├── electron-builder.json   # Windows NSIS/Portable & Linux Packaging Rules
│   └── package.json            # Desktop Dependencies
├── docs\                        # Documentation & User Guides
│   ├── AIRGAP_DEPLOYMENT_GUIDE.md
│   └── DESKTOP_BUILD_GUIDE.md
├── scripts\                     # Tooling & Launchers
│   ├── desktop\                # Desktop Build & Launch Scripts
│   │   ├── build_desktop.bat
│   │   ├── build_desktop.ps1
│   │   ├── start_desktop.bat
│   │   ├── start_desktop.ps1
│   │   ├── start_desktop_dev.bat
│   │   ├── create_desktop_shortcut.ps1
│   │   └── Forenlytics.vbs
│   ├── docker\                 # Docker Compose & Air-Gap Tools
│   └── utils\                  # Asset & Model Generation Tools
└── backend\
    ├── forenlytics_backend.spec # PyInstaller Standalone Spec
    └── scripts\
        └── build_standalone_backend.py # Automated PyInstaller Compiler
```

---

## 🔒 4. Process Teardown & Security

- **Clean Process Termination:** On window close or `Ctrl+Q`, Electron triggers `tree-kill` on the backend PID, ensuring zero orphan/zombie Python or PyTorch processes remain in system memory.
- **Air-Gapped Privacy:** Strict offline operation with no external telemetry, ensuring all forensic evidence remains strictly within the local workstation.
