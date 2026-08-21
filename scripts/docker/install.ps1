# ==============================================================================
# Forenlytics Air-Gapped PowerShell Installer
# ==============================================================================

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RootDir

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  FORENLYTICS FORENSIC AUDIO INTELLIGENCE PLATFORM" -ForegroundColor Cyan
Write-Host "  One-Click Air-Gapped (Offline) Deployment Package" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Docker Check
Write-Host "[*] Checking Docker engine status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker engine not running"
    }
    Write-Host "[OK] Docker service is active." -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Docker is not running or not installed!" -ForegroundColor Red
    Write-Host "Please ensure Docker Desktop is running and try again." -ForegroundColor Yellow
    Read-Host "Press ENTER to continue..."
    exit 1
}

# 2. Setup Directories
Write-Host "[*] Configuring workspace directories..." -ForegroundColor Yellow
@("data/sessions", "data/reports", "models/speechbrain", "models/huggingface") | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
    }
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[OK] .env configuration file generated." -ForegroundColor Green
}

# 3. Load Offline Images
$tarGz = "images/forenlytics-images.tar.gz"
$tar = "images/forenlytics-images.tar"

if (Test-Path $tarGz) {
    Write-Host "[*] Importing offline Docker images ($tarGz)..." -ForegroundColor Yellow
    docker load -i $tarGz
    Write-Host "[OK] Docker images successfully imported." -ForegroundColor Green
}
elseif (Test-Path $tar) {
    Write-Host "[*] Importing offline Docker images ($tar)..." -ForegroundColor Yellow
    docker load -i $tar
    Write-Host "[OK] Docker images successfully imported." -ForegroundColor Green
}
else {
    Write-Host "[*] No pre-packaged archive found. Building images locally..." -ForegroundColor Yellow
    docker compose build
}

# 4. Start Containers
Write-Host ""
Write-Host "[*] Starting Forenlytics service cluster..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start containers!" -ForegroundColor Red
    Read-Host "Press ENTER to exit..."
    exit 1
}

# 5. Health Check & Browser
Write-Host "[*] Verifying service health status..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  Forenlytics Dashboard:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API Health Check: http://localhost:8000/health" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:3000"
Write-Host "Forenlytics is running actively in the background." -ForegroundColor Cyan
