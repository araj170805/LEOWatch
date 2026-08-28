# Orbital Guardian - Automated Test Suite Runner (PowerShell)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
$env:PYTHONPATH = $ScriptDir

$PyExe = if (Test-Path "$ScriptDir\.venv\Scripts\python.exe") {
    "$ScriptDir\.venv\Scripts\python.exe"
} else {
    "python"
}

Write-Host "`n[1/3] Proper RAG Architecture Tests..." -ForegroundColor Yellow
& $PyExe "$ScriptDir\tests\test_proper_rag.py"
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] RAG tests failed!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "`n[2/3] SGP4 and Conjunction Physics Tests..." -ForegroundColor Yellow
& $PyExe "$ScriptDir\tests\test_orbital.py"
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Orbital tests failed!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "`n[3/3] Auth and History API Integration Tests..." -ForegroundColor Yellow
& $PyExe "$ScriptDir\tests\test_auth_history.py"
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Auth/History tests failed!" -ForegroundColor Red; exit $LASTEXITCODE }

Write-Host "`n=== ALL SYSTEM TESTS PASSED ===" -ForegroundColor Green
