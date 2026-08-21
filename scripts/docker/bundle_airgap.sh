#!/usr/bin/env bash
# ==============================================================================
# Forenlytics Air-Gapped Package Generator (Linux / macOS)
# ==============================================================================
set -e

VERSION="2.0.0"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUNDLE_DIR="$DIST_DIR/forenlytics-airgap-v$VERSION"
IMAGES_DIR="$BUNDLE_DIR/images"
ARCHIVE_PATH="$DIST_DIR/forenlytics-airgap-v$VERSION.tar.gz"

echo "=============================================================================="
echo "  FORENLYTICS AIR-GAP RELEASE PACKAGER (v$VERSION)"
echo "=============================================================================="
echo ""

# Clean staging
rm -rf "$BUNDLE_DIR" "$ARCHIVE_PATH"
mkdir -p "$IMAGES_DIR"

# 1. Download Models
echo "[1/4] Downloading and verifying AI model weights..."
if [ -f "$ROOT_DIR/backend/venv/bin/python" ]; then
    "$ROOT_DIR/backend/venv/bin/python" "$ROOT_DIR/backend/scripts/download_models.py" --output-dir "$ROOT_DIR/models"
else
    python3 "$ROOT_DIR/backend/scripts/download_models.py" --output-dir "$ROOT_DIR/models"
fi

# 2. Build Docker Images
echo "[2/4] Building production Docker images..."
cd "$ROOT_DIR"
docker compose build

# 3. Save Docker Images
echo "[3/4] Exporting Docker images (images/forenlytics-images.tar.gz)..."
docker save forenlytics-backend:latest forenlytics-frontend:latest | gzip > "$IMAGES_DIR/forenlytics-images.tar.gz"

# 4. Copy Orchestration & Launcher Scripts
echo "[4/4] Packaging files..."
cp "$ROOT_DIR/docker-compose.yml" "$BUNDLE_DIR/"
[ -f "$ROOT_DIR/docker-compose.override.yml.example" ] && cp "$ROOT_DIR/docker-compose.override.yml.example" "$BUNDLE_DIR/"
[ -f "$ROOT_DIR/.env.example" ] && cp "$ROOT_DIR/.env.example" "$BUNDLE_DIR/"
[ -f "$ROOT_DIR/LICENSE" ] && cp "$ROOT_DIR/LICENSE" "$BUNDLE_DIR/"
[ -f "$ROOT_DIR/README.md" ] && cp "$ROOT_DIR/README.md" "$BUNDLE_DIR/"

mkdir -p "$BUNDLE_DIR/scripts/docker" "$BUNDLE_DIR/docs"
cp "$ROOT_DIR/scripts/docker/"* "$BUNDLE_DIR/scripts/docker/"
chmod +x "$BUNDLE_DIR/scripts/docker/"*.sh
cp "$ROOT_DIR/docs/"* "$BUNDLE_DIR/docs/"

# Copy models
if [ -d "$ROOT_DIR/models" ]; then
    cp -r "$ROOT_DIR/models" "$BUNDLE_DIR/"
fi
if [ -d "$ROOT_DIR/backend/speechbrain_cache" ]; then
    mkdir -p "$BUNDLE_DIR/backend"
    cp -r "$ROOT_DIR/backend/speechbrain_cache" "$BUNDLE_DIR/backend/"
fi

# Create tar.gz archive
echo "[*] Compressing release archive: $ARCHIVE_PATH..."
tar -czf "$ARCHIVE_PATH" -C "$DIST_DIR" "forenlytics-airgap-v$VERSION"

echo ""
echo "=============================================================================="
echo "  AIR-GAP BUNDLE CREATED SUCCESSFULLY: $ARCHIVE_PATH"
echo "=============================================================================="
echo ""
