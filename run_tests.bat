@echo off
title SAHAYA AI — Test Suite
echo ========================================================
echo Running SAHAYA AI Emergency Module Integration Tests...
echo ========================================================
cd /d "%~dp0"
set EMERGENCY_DB_PATH=%~dp0backend\test_emergency.db
set MOCK_WEATHER_ALERTS=true
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" tests\test_emergency_suite.py
) else (
    python tests\test_emergency_suite.py
)
pause

