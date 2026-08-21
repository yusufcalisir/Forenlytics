@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0..\.."

title Forenlytics Air-Gapped Setup Wizard
cls

echo ==============================================================================
echo   FORENLYTICS FORENSIC AUDIO INTELLIGENCE PLATFORM
echo   One-Click Air-Gapped (Offline) Deployment Package
echo ==============================================================================
echo.

:: 1. Docker Check
echo [*] Checking Docker engine status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker is not running or not installed!
    echo Please make sure Docker Desktop is running and try again.
    echo.
    pause
    exit /b 1
)
echo [OK] Docker service is active.

:: 2. Directory Structure Setup
echo [*] Configuring workspace directories...
if not exist "data\sessions" mkdir "data\sessions"
if not exist "data\reports" mkdir "data\reports"
if not exist "models\speechbrain" mkdir "models\speechbrain"
if not exist "models\huggingface" mkdir "models\huggingface"
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [OK] .env configuration file generated.
    )
)

:: 3. Load Offline Docker Images
if exist "images\forenlytics-images.tar.gz" (
    echo [*] Loading offline Docker images (images\forenlytics-images.tar.gz)...
    docker load -i "images\forenlytics-images.tar.gz"
    echo [OK] Docker images successfully imported.
) else if exist "images\forenlytics-images.tar" (
    echo [*] Loading offline Docker images (images\forenlytics-images.tar)...
    docker load -i "images\forenlytics-images.tar"
    echo [OK] Docker images successfully imported.
) else (
    echo [*] No pre-packaged image archive found. Building images locally...
    docker compose build
)

:: 4. Launch Service Containers
echo.
echo [*] Starting Forenlytics containers...
docker compose up -d

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start containers.
    echo Run 'docker compose logs' to inspect startup diagnostics.
    pause
    exit /b 1
)

:: 5. Health Check & Browser Launch
echo.
echo [*] Waiting for services to become healthy (loading AI models)...
timeout /t 5 /nobreak >nul

echo.
echo ==============================================================================
echo   DEPLOYMENT SUCCESSFUL!
echo   Forenlytics Dashboard:    http://localhost:3000
echo   Backend API Health Check: http://localhost:8000/health
echo ==============================================================================
echo.

start http://localhost:3000

echo Forenlytics is running in the background.
echo Use 'stop.bat' to stop, and 'start.bat' to restart services.
echo.
pause
