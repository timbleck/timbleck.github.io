@echo off
cd /d "%~dp0"
title Quiz App

echo.
echo  ====================================
echo   Quiz App  -  Lokaler Start
echo  ====================================
echo.

:: Prüfe Python-Verfügbarkeit
set PYTHON_CMD=
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
) else (
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python3
    )
)

if "%PYTHON_CMD%"=="" (
    echo Python nicht gefunden.
    echo Starte Quiz direkt im Browser...
    echo.
    start "" "%~dp0index.html"
    exit /b
)

:: Python verfügbar: lokalen Server starten
echo Starte Server auf http://localhost:8080
echo Dieses Fenster offen lassen. Schliessen beendet den Server.
echo.

start /b %PYTHON_CMD% -m http.server 8080 >nul 2>&1
timeout /t 2 /nobreak >nul
start "" http://localhost:8080

echo Server laeuft. Druecken Sie eine beliebige Taste zum Beenden.
pause >nul

taskkill /f /im python.exe  >nul 2>&1
taskkill /f /im python3.exe >nul 2>&1
