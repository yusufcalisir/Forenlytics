@echo off
setlocal
cd /d "%~dp0..\.."

title Forenlytics - Stop
cls
echo ==============================================================================
echo   Stopping Forenlytics Services...
echo ==============================================================================
echo.

docker compose down

echo.
echo [OK] Containers stopped successfully.
timeout /t 3 >nul
