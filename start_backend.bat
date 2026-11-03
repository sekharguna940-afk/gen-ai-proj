@echo off
title SAHAYA AI — Unified Backend Server
echo ========================================================
echo Starting SAHAYA AI Unified Backend on http://localhost:8000
echo Modules: Emergency Response + CivicAI + Kisaan Saathi
echo ========================================================
cd /d "%~dp0"
".venv\Scripts\python.exe" "Kisaan-Saathi-main\app.py"
pause

