#!/usr/bin/env bash
# ==============================================================================
# Forenlytics Linux Starter
# ==============================================================================
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[*] Starting Forenlytics services..."
docker compose up -d
echo "[OK] Forenlytics dashboard online: http://localhost:3000"
