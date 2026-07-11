@echo off
:: Einmalig ausführen – registriert den Auto-Push Task im Windows Task Scheduler
:: Danach läuft er automatisch alle 10 Minuten im Hintergrund

set SCRIPT=C:\Users\ch\Claude\Projects\What if Doggy\auto-push.ps1
set TASKNAME=WhatIfDoggy-AutoPush

echo Registriere Task Scheduler Job "%TASKNAME%"...

schtasks /delete /tn "%TASKNAME%" /f >nul 2>&1

schtasks /create ^
  /tn "%TASKNAME%" ^
  /tr "powershell -WindowStyle Hidden -NonInteractive -ExecutionPolicy Bypass -File \"C:\Users\ch\Claude\Projects\What if Doggy\auto-push-task.ps1\"" ^
  /sc minute ^
  /mo 10 ^
  /rl HIGHEST ^
  /f

if %ERRORLEVEL% equ 0 (
    echo.
    echo Fertig! Auto-Push laeuft jetzt alle 10 Minuten.
    echo Log-Datei: "%~dp0auto-push.log"
    echo.
    echo Zum Deaktivieren:
    echo   schtasks /delete /tn "%TASKNAME%" /f
) else (
    echo FEHLER beim Erstellen des Tasks.
    echo Bitte als Administrator ausfuehren!
)
pause
