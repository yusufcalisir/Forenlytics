#!/usr/bin/env bash
# ==============================================================================
# Forenlytics Air-Gapped One-Click Linux / Server Installer
# ==============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==============================================================================${NC}"
echo -e "${CYAN}  FORENLYTICS FORENSIC AUDIO INTELLIGENCE PLATFORM                             ${NC}"
echo -e "${CYAN}  One-Click Air-Gapped (Offline) Deployment Package                            ${NC}"
echo -e "${CYAN}==============================================================================${NC}"
echo ""

# 1. Check Docker
echo -e "${YELLOW}[*] Checking Docker engine status...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Docker daemon is not running or current user lacks permissions!${NC}"
    echo -e "Please run 'sudo systemctl start docker' or add your user to the 'docker' group."
    exit 1
fi
echo -e "${GREEN}[OK] Docker engine is active.${NC}"

# 2. Setup Directories
echo -e "${YELLOW}[*] Configuring workspace directories...${NC}"
mkdir -p data/sessions data/reports models/speechbrain models/huggingface

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo -e "${GREEN}[OK] .env configuration file generated.${NC}"
fi

# 3. Load Offline Images if Present
if [ -f "images/forenlytics-images.tar.gz" ]; then
    echo -e "${YELLOW}[*] Importing offline Docker images (images/forenlytics-images.tar.gz)...${NC}"
    docker load -i images/forenlytics-images.tar.gz
    echo -e "${GREEN}[OK] Docker images successfully imported.${NC}"
elif [ -f "images/forenlytics-images.tar" ]; then
    echo -e "${YELLOW}[*] Importing offline Docker images (images/forenlytics-images.tar)...${NC}"
    docker load -i images/forenlytics-images.tar
    echo -e "${GREEN}[OK] Docker images successfully imported.${NC}"
else
    echo -e "${YELLOW}[*] No pre-packaged archive found. Building images locally...${NC}"
    docker compose build
fi

# 4. Start Containers
echo ""
echo -e "${YELLOW}[*] Starting Forenlytics service cluster...${NC}"
docker compose up -d

# 5. Summary
echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  DEPLOYMENT COMPLETED SUCCESSFULLY!                                          ${NC}"
echo -e "  Forenlytics Dashboard:    ${CYAN}http://localhost:3000${NC}"
echo -e "  Backend API Health Check: ${CYAN}http://localhost:8000/health${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "Commands: './scripts/docker/stop.sh' to stop, './scripts/docker/start.sh' to start, './scripts/docker/status.sh' for diagnostics."
echo ""
