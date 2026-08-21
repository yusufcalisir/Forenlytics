#!/usr/bin/env bash
# ==============================================================================
# Forenlytics Linux Status & Log Monitor
# ==============================================================================
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "=== Forenlytics Container Status ==="
docker compose ps
echo ""
echo "=== Diagnostic Logs (Last 30 Lines) ==="
docker compose logs --tail=30
