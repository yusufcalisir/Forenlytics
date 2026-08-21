#!/usr/bin/env bash
# ==============================================================================
# Forenlytics Linux Stopper
# ==============================================================================
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[*] Stopping Forenlytics services..."
docker compose down
echo "[OK] Forenlytics containers stopped."
