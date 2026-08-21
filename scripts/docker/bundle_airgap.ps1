# ==============================================================================
# Forenlytics Air-Gapped Package Generator (PowerShell)
# ==============================================================================
# Run this script on an INTERNET-CONNECTED machine to prepare the offline bundle.
# ==============================================================================

param(
    [string]$Version = "2.0.0",
    [switch]$SkipModelDownload = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  FORENLYTICS AIR-GAP ARSIV PAKETLEYICI (v$Version)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RootDir

$DistDir = Join-Path $RootDir "dist"
$BundleDir = Join-Path $DistDir "forenlytics-airgap-v$Version"
$ImagesDir = Join-Path $BundleDir "images"
$ZipPath = Join-Path $DistDir "forenlytics-airgap-v$Version.zip"

# Clean previous dist staging
if (Test-Path $BundleDir) {
    Remove-Item $BundleDir -Recurse -Force
}
New-Item -ItemType Directory -Path $ImagesDir -Force | Out-Null

# 1. Download & Verify Models
if (-not $SkipModelDownload) {
    Write-Host "[1/4] Downloading and verifying AI model weights..." -ForegroundColor Yellow
    $pyCmd = "python"
    if (Test-Path "backend/venv/Scripts/python.exe") {
        $pyCmd = "backend/venv/Scripts/python.exe"
    }
    & $pyCmd "backend/scripts/download_models.py" --output-dir "$RootDir/models"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Model download or validation failed!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[1/4] Model download skipped (-SkipModelDownload)." -ForegroundColor DarkGray
}

# 2. Build Docker Images
Write-Host "[2/4] Building production Docker images (Backend + Frontend)..." -ForegroundColor Yellow
docker compose build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker build failed!" -ForegroundColor Red
    exit 1
}

# 3. Save Docker Images to Archive
Write-Host "[3/4] Exporting Docker images to archive (images/forenlytics-images.tar)..." -ForegroundColor Yellow
$ImagesTar = Join-Path $ImagesDir "forenlytics-images.tar"
docker save -o $ImagesTar forenlytics-backend:latest forenlytics-frontend:latest
Write-Host "[OK] Docker images saved: $ImagesTar" -ForegroundColor Green

# 4. Copy Orchestration & Launcher Scripts
Write-Host "[4/4] Packaging deployment configs, scripts, and documentation..." -ForegroundColor Yellow

$FilesToCopy = @(
    "docker-compose.yml",
    "docker-compose.override.yml.example",
    ".env.example",
    "LICENSE",
    "README.md"
)

foreach ($file in $FilesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file -Destination $BundleDir -Force
    }
}

# Copy scripts & docs
if (Test-Path "scripts/docker") {
    $dstScripts = Join-Path $BundleDir "scripts/docker"
    New-Item -ItemType Directory -Path $dstScripts -Force | Out-Null
    Copy-Item "scripts/docker/*" -Destination $dstScripts -Recurse -Force
}

if (Test-Path "docs") {
    $dstDocs = Join-Path $BundleDir "docs"
    New-Item -ItemType Directory -Path $dstDocs -Force | Out-Null
    Copy-Item "docs/*" -Destination $dstDocs -Recurse -Force
}

# Copy Models & SpeechBrain Cache
if (Test-Path "models") {
    Copy-Item "models" -Destination $BundleDir -Recurse -Force
}
if (Test-Path "backend/speechbrain_cache") {
    $sbDst = Join-Path $BundleDir "backend/speechbrain_cache"
    New-Item -ItemType Directory -Path (Split-Path $sbDst) -Force | Out-Null
    Copy-Item "backend/speechbrain_cache" -Destination (Join-Path $BundleDir "backend") -Recurse -Force
}

# Create Zip Archive
Write-Host "[*] Creating ZIP release bundle: $ZipPath..." -ForegroundColor Yellow
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$BundleDir/*" -DestinationPath $ZipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  AIR-GAP BUNDLE GENERATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  Bundle Archive: $ZipPath" -ForegroundColor White
Write-Host "  Staging Folder: $BundleDir" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""
