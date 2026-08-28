@echo off
title Orbital Guardian - 3D Dashboard Frontend
echo ===================================================
echo   Starting Orbital Guardian Frontend (Vite + WebGL)
echo ===================================================
cd /d "%~dp0"
if not exist "node_modules" (
    echo Installing node dependencies...
    call npm install
)
echo Starting Vite development server on http://localhost:5173 ...
call npm run dev
pause
