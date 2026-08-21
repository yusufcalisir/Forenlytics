# -*- mode: python ; coding: utf-8 -*-
# ==============================================================================
# Forenlytics Standalone Backend PyInstaller Specification
# ==============================================================================

import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

backend_dir = os.path.abspath(os.path.join(SPECPATH))

# Collect dynamic submodules and data files
hidden_imports = [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespans",
    "uvicorn.lifespans.on",
    "fastapi",
    "starlette",
    "starlette.middleware",
    "starlette.middleware.cors",
    "pydantic",
    "torch",
    "torchaudio",
    "transformers",
    "transformers.models.wavlm",
    "transformers.models.wav2vec2",
    "speechbrain",
    "speechbrain.inference",
    "speechbrain.inference.speaker",
    "speechbrain.pretrained",
    "librosa",
    "soundfile",
    "scipy",
    "scipy.signal",
    "scipy.io.wavfile",
    "reportlab",
    "reportlab.lib",
    "reportlab.platypus",
    "jinja2",
    "multipart",
    "services",
    "services.session_store",
    "services.job_manager",
    "services.report_generator",
    "services.audio",
    "services.audio.facade",
    "services.audio.engine_biometric",
    "services.audio.engine_wavlm",
    "services.audio.engine_deepfake",
    "services.audio.engine_embedding",
    "services.audio.engine_pitch",
    "services.audio.engine_formants",
    "services.audio.engine_rhythm",
    "services.audio.engine_signal",
    "services.audio.fusion_engine",
    "services.audio.preprocessor",
    "services.audio.speechbrain_compat"
]

datas = []

# Collect transformers and speechbrain metadata
try:
    datas += collect_data_files("transformers")
    datas += collect_data_files("speechbrain")
    datas += collect_data_files("reportlab")
except Exception:
    pass

a = Analysis(
    [os.path.join(backend_dir, "main.py")],
    pathex=[backend_dir],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "pytest", "tests"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="forenlytics-backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
