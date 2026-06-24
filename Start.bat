@echo off
echo ============================================
echo  What if Doggy - Starte Spiel...
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Installiere Pakete (npm install)...
call npm install
if errorlevel 1 (
    echo FEHLER bei npm install!
    pause
    exit /b 1
)

echo.
echo [2/2] Starte Entwicklungsserver...
echo Das Spiel oeffnet sich gleich im Browser unter http://localhost:5173
echo.
echo Zum Beenden: Ctrl+C druecken
echo.
call npm run dev
pause
