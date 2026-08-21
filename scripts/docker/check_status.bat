@echo off
setlocal
cd /d "%~dp0..\.."

title Forenlytics - Status Monitor
cls
echo ==============================================================================
echo   Forenlytics Container ^& Service Status
echo ==============================================================================
echo.

docker compose ps

echo.
echo ==============================================================================
echo   Live Diagnostic Logs (Last 30 Lines)
echo ==============================================================================
docker compose logs --tail=30

echo.
pause
