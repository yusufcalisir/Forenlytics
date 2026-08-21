# ==============================================================================
# Forenlytics Desktop Standalone Instant Launcher (PowerShell)
# ==============================================================================

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RootDir

Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "  FORENLYTICS FORENSIC AUDIO INTELLIGENCE - DESKTOP STANDALONE" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if compiled portable/installer exists
$distExe = Get-ChildItem "$RootDir/dist/desktop" -Filter "Forenlytics-Portable-*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

if ($distExe) {
    Write-Host "[*] Launching compiled portable binary: $($distExe.Name)..." -ForegroundColor Green
    Start-Process $distExe.FullName
    exit 0
}

# 2. Run via Electron runner
Write-Host "[*] Launching Desktop environment..." -ForegroundColor Yellow
Set-Location "$RootDir/desktop"

if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Installing desktop dependencies..." -ForegroundColor Yellow
    npm install
}

npm start
