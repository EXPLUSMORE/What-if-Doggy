@echo off
cd /d "%~dp0"
git add -A
git diff --cached --quiet && (echo Keine Aenderungen zum Committen. & pause & exit /b 0)
set /p MSG="Commit-Nachricht (Enter = auto): "
if "%MSG%"=="" set MSG=chore: auto-update %date% %time%
git commit -m "%MSG%"
git push
echo.
echo Fertig! Deployment laeuft auf GitHub Actions.
pause
