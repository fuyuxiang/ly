@echo off
cd /d "%~dp0"

echo Restarting services...
call stop.bat
timeout /t 1 /nobreak >nul
call start.bat
