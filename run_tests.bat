@echo off
title SAHAYA AI — Test Suite
echo ========================================================
echo Running SAHAYA AI Emergency Module Integration Tests...
echo ========================================================
cd /d "%~dp0"
set EMERGENCY_DB_PATH=%~dp0sahaya ai\backend\test_emergency.db
set MOCK_WEATHER_ALERTS=true
".venv\Scripts\python.exe" tests\test_emergency_suite.py
pause

