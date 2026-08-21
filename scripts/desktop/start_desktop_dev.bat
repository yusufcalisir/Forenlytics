@echo off
setlocal
cd /d "%~dp0..\.."

title Forenlytics Desktop - Development Mode
cls

echo ==============================================================================
echo   Forenlytics Desktop Live Development Environment (Hot-Reload Dev Mode)
echo ==============================================================================
echo.

start "Forenlytics Frontend Dev" cmd /k "cd frontend && npm run dev"

if exist "backend\venv\Scripts\activate.bat" (
    start "Forenlytics Backend Dev" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"
) else (
    start "Forenlytics Backend Dev" cmd /k "cd backend && uvicorn main:app --reload --port 8000"
)

echo [*] Waiting 4 seconds for services to initialize...
timeout /t 4 /nobreak >nul

cd desktop
if not exist "node_modules" (
    echo [*] Installing desktop dependencies...
    npm install
)

npm run dev
