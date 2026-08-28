@echo off
title Orbital Guardian - Automated Test Suite
echo ===================================================
echo   Running Orbital Guardian Automated Verification Suite
echo ===================================================
cd /d "%~dp0"
set PYTHONPATH=.
if exist ".venv\Scripts\python.exe" (
    set PY_EXE=".venv\Scripts\python.exe"
) else (
    set PY_EXE=python
)

echo.
echo [1/3] Running Proper RAG Architecture Tests...
%PY_EXE% tests/test_proper_rag.py
if %ERRORLEVEL% neq 0 ( echo [ERROR] RAG tests failed! & pause & exit /b %ERRORLEVEL% )

echo.
echo [2/3] Running SGP4 and Conjunction Physics Tests...
%PY_EXE% tests/test_orbital.py
if %ERRORLEVEL% neq 0 ( echo [ERROR] Orbital tests failed! & pause & exit /b %ERRORLEVEL% )

echo.
echo [3/3] Running Auth and History API Integration Tests...
%PY_EXE% tests/test_auth_history.py
if %ERRORLEVEL% neq 0 ( echo [ERROR] Auth/History tests failed! & pause & exit /b %ERRORLEVEL% )

echo.
echo ===================================================
echo   ALL SYSTEM TESTS PASSED SUCCESSFULLY!
echo ===================================================
pause
