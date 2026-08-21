@echo off
setlocal
title Forenlytics Air-Gap Packager
cls

echo ==============================================================================
echo   Forenlytics Air-Gapped Release Packager
echo ==============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bundle_airgap.ps1"

pause
