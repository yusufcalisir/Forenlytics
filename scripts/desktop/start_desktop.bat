@echo off
setlocal
cd /d "%~dp0..\.."

title Forenlytics Desktop Application
cls

echo ==============================================================================
echo   Launching Forenlytics Forensic Audio Desktop Application...
echo ==============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_desktop.ps1"

