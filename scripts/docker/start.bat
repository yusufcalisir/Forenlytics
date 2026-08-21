@echo off
setlocal
cd /d "%~dp0..\.."

title Forenlytics - Start
cls
echo ==============================================================================
echo   Starting Forenlytics Services...
echo ==============================================================================
echo.

docker compose up -d

if %errorlevel% equ 0 (
    echo.
    echo [OK] Forenlytics services started successfully.
    echo Opening dashboard: http://localhost:3000
    start http://localhost:3000
) else (
    echo.
    echo [ERROR] Failed to start services.
)
timeout /t 3 >nul
