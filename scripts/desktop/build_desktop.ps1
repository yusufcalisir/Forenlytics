# ==============================================================================
# Forenlytics Desktop Standalone Build Script (PowerShell)
# ==============================================================================

param(
    [string]$Target = "win",
    [switch]$SkipBackendCompile = $false,
    [switch]$SkipFrontendBuild = $false
)

$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  FORENLYTICS STANDALONE DESKTOP BUILD WIZARD (Electron + PyInstaller Engine)" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RootDir

# 1. Frontend Standalone Build
if (-not $SkipFrontendBuild) {
    Write-Host "[1/5] Compiling Next.js Frontend Standalone build..." -ForegroundColor Yellow
    Set-Location "$RootDir/frontend"
    if (-not (Test-Path "node_modules")) {
        npm install
    }
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Frontend compilation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Frontend standalone build completed." -ForegroundColor Green
} else {
    Write-Host "[1/5] Frontend build skipped (-SkipFrontendBuild)." -ForegroundColor DarkGray
}

# 2. AI Model Cache Preparation
Set-Location $RootDir
Write-Host "[2/5] Checking and verifying AI model weights..." -ForegroundColor Yellow
$pyCmd = "python"
if (Test-Path "backend/venv/Scripts/python.exe") {
    $pyCmd = "$RootDir/backend/venv/Scripts/python.exe"
}

& $pyCmd "backend/scripts/download_models.py" --output-dir "$RootDir/models" --verify-only
if ($LASTEXITCODE -ne 0) {
    Write-Host "[*] Downloading missing model weights..." -ForegroundColor Yellow
    & $pyCmd "backend/scripts/download_models.py" --output-dir "$RootDir/models"
}

# 3. Backend PyInstaller Standalone Compilation
if (-not $SkipBackendCompile) {
    Write-Host "[3/5] Compiling Python FastAPI backend with PyInstaller..." -ForegroundColor Yellow
    $desktopRes = "$RootDir/desktop/resources/backend"
    New-Item -ItemType Directory -Path $desktopRes -Force | Out-Null
    & $pyCmd "backend/scripts/build_standalone_backend.py" --output-dir $desktopRes
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Backend compilation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK] Standalone backend binary placed in desktop/resources/backend." -ForegroundColor Green
} else {
    Write-Host "[3/5] Backend compilation skipped (-SkipBackendCompile)." -ForegroundColor DarkGray
}

# 4. Install Desktop Dependencies
Write-Host "[4/5] Installing Desktop (Electron) dependencies..." -ForegroundColor Yellow
Set-Location "$RootDir/desktop"
if (-not (Test-Path "node_modules")) {
    npm install
}

# 5. Package via Electron Builder
Write-Host "[5/5] Packaging standalone installer via Electron Builder..." -ForegroundColor Yellow
if ($Target -eq "win") {
    npm run dist:win
} elseif ($Target -eq "linux") {
    npm run dist:linux
} else {
    npm run dist
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Electron Builder packaging failed!" -ForegroundColor Red
    exit 1
}

Set-Location $RootDir
$DistDesktop = "$RootDir/dist/desktop"

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  SUCCESS! FORENLYTICS DESKTOP STANDALONE PACKAGE GENERATED." -ForegroundColor Green
Write-Host "  Output Directory: $DistDesktop" -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "Generated Installers:"
if (Test-Path $DistDesktop) {
    Get-ChildItem $DistDesktop -Filter "*.exe", "*.AppImage", "*.deb" | ForEach-Object {
        Write-Host "  -> $($_.Name) ($([math]::Round($_.Length / 1MB, 2)) MB)" -ForegroundColor Cyan
    }
}
Write-Host ""
