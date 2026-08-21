#!/usr/bin/env python3
"""
Forenlytics Standalone Backend PyInstaller Builder
==================================================
Compiles the FastAPI forensic backend into a standalone executable
for embedding inside the Electron Desktop Application package.

Usage:
    python build_standalone_backend.py [--output-dir ../desktop/resources/backend]
"""

import os
import sys
import shutil
import subprocess
import argparse
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("forenlytics.backend_builder")


def main():
    parser = argparse.ArgumentParser(description="Build Forenlytics Standalone Backend Binary")
    parser.add_argument(
        "--output-dir",
        default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "desktop", "resources", "backend")),
        help="Target resources directory for Electron packaging"
    )
    args = parser.parse_args()

    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    spec_file = os.path.join(backend_dir, "forenlytics_backend.spec")
    output_dir = os.path.abspath(args.output_dir)

    logger.info("=" * 65)
    logger.info("FORENLYTICS STANDALONE BACKEND PYINSTALLER DERLEYICI")
    logger.info("=" * 65)
    logger.info(f"Backend Dizini: {backend_dir}")
    logger.info(f"Spec Dosyasi:   {spec_file}")
    logger.info(f"Hedef Dizin:    {output_dir}")

    # Ensure PyInstaller is installed
    try:
        import PyInstaller
        logger.info(f"PyInstaller surumu: {PyInstaller.__version__}")
    except ImportError:
        logger.info("PyInstaller yukleniyor...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])

    # Run PyInstaller
    logger.info("PyInstaller derleme islemi baslatiliyor...")
    dist_dir = os.path.join(backend_dir, "dist_pyinstaller")
    work_dir = os.path.join(backend_dir, "build_pyinstaller")

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--clean",
        "--distpath", dist_dir,
        "--workpath", work_dir,
        spec_file
    ]

    result = subprocess.run(cmd, cwd=backend_dir)
    if result.returncode != 0:
        logger.error("PyInstaller derleme islemi basarisiz oldu!")
        sys.exit(1)

    # Copy binary to desktop resources
    os.makedirs(output_dir, exist_ok=True)
    is_win = sys.platform == "win32"
    bin_name = "forenlytics-backend.exe" if is_win else "forenlytics-backend"
    src_bin = os.path.join(dist_dir, bin_name)

    if os.path.exists(src_bin):
        dst_bin = os.path.join(output_dir, bin_name)
        shutil.copy2(src_bin, dst_bin)
        logger.info(f"✓ Standalone backend basariyla kopyalandi: {dst_bin}")
    else:
        logger.warning(f"Derlenen ikili bulunamadi ({src_bin}).")

    logger.info("=" * 65)
    logger.info("DERLEME ISLEMI TAMAMLANDI!")
    logger.info("=" * 65)


if __name__ == "__main__":
    main()
