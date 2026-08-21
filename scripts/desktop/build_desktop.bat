@echo off
setlocal
cd /d "%~dp0..\.."

title Forenlytics Desktop Standalone Build Wizard
cls

echo ==============================================================================
echo   FORENLYTICS STANDALONE DESKTOP BUILD WIZARD
echo ==============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_desktop.ps1"

pause
