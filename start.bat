@echo off
cd /d "%~dp0"

echo Starting server...
start "mygpt-server" /B cmd /c "cd server && node index.js"

echo Starting client...
start "mygpt-client" /B cmd /c "cd client && npm run dev"

echo.
echo Waiting for services to start...

set SERVER_OK=0
set CLIENT_OK=0
set RETRIES=0

:check_loop
if %RETRIES% GEQ 15 goto :done_check

curl --noproxy localhost -s http://localhost:3001 >nul 2>&1
if %errorlevel% equ 0 set SERVER_OK=1

curl --noproxy localhost -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 set CLIENT_OK=1

if %SERVER_OK% equ 1 if %CLIENT_OK% equ 1 goto :done_check

set /a RETRIES+=1
timeout /t 1 /nobreak >nul
goto :check_loop

:done_check
echo.
echo ==============================
if %SERVER_OK% equ 1 if %CLIENT_OK% equ 1 (
  echo   All services started successfully!
  echo   Server: http://localhost:3001
  echo   Client: http://localhost:5173
  goto :end_msg
)

if %SERVER_OK% equ 0 (
  echo   [FAILED] Server failed to start on port 3001
) else (
  echo   [OK] Server started on port 3001
)
if %CLIENT_OK% equ 0 (
  echo   [FAILED] Client failed to start on port 5173
) else (
  echo   [OK] Client started on port 5173
)
echo.
echo   Please check the logs above for errors.

:end_msg
echo ==============================
echo.
