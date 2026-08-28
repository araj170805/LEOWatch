@echo off
title Orbital Guardian - Backend Server
echo ===================================================
echo   Starting Orbital Guardian FastAPI Backend Server
echo ===================================================
cd /d "%~dp0"
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call .venv\Scripts\activate.bat
)
set PYTHONPATH=.
echo Starting Uvicorn on http://localhost:8000 ...
uvicorn app.main:app --reload --port 8000
pause
