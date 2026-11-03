@echo off
title SAHAYA AI — Unified Backend Server
echo ========================================================
echo Starting SAHAYA AI Unified Backend on http://localhost:8000
echo Modules: Emergency Response + CivicAI + Kisaan Portal
echo ========================================================
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" "backend\app.py"
) else (
    python "backend\app.py"
)
pause

