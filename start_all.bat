@echo off
title SAHAYA AI — Unified System Launcher
echo ========================================================
echo        SAHAYA AI — Unified System Launcher
echo ========================================================
echo.
echo Launching SAHAYA AI Backend and Frontend services...
echo.

cd /d "%~dp0"

echo [1/2] Starting Unified Backend Server on http://localhost:8000 ...
start "SAHAYA AI — Backend Server (Port 8000)" cmd /k "start_backend.bat"

echo [2/2] Starting Frontend UI on http://localhost:5173 ...
start "SAHAYA AI — Frontend UI (Port 5173)" cmd /k "start_frontend.bat"

echo.
echo ========================================================
echo Both services are starting in separate windows:
echo.
echo   * Web Application:  http://localhost:5173
echo   * Backend API:      http://localhost:8000
echo   * API Docs:         http://localhost:8000/docs
echo   * Farmer Portal:    http://localhost:8000/schemes.html
echo.
echo Keep those windows open while using SAHAYA AI.
echo ========================================================
echo.
timeout /t 5

