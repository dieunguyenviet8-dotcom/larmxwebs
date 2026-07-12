@echo off
setlocal
title LARMX Music Dev Server
cd /d "%~dp0"

echo.
echo  ========================================
echo       LARMX MUSIC - DEV SERVER
echo  ========================================
echo.

set "LARMX_VITE_CACHE=%TEMP%\larmx-vite-%RANDOM%-%RANDOM%"
echo [LARMX] Using fresh cache:
echo         %LARMX_VITE_CACHE%
echo.

echo [LARMX] Stopping stale Node/Vite processes...
taskkill /f /im node.exe >nul 2>nul
timeout /t 1 /nobreak >nul

echo [LARMX] Clearing stale Vite optimizer cache...
if exist "%~dp0node_modules\.vite" (
  rmdir /s /q "%~dp0node_modules\.vite" >nul 2>nul
)
if exist "%~dp0node_modules\.vite" (
  echo [LARMX] ERROR: Windows is still locking node_modules\.vite
  echo [LARMX] Close all CMD windows, browsers, VS Code and try again.
  goto :error
)
echo [LARMX] Old cache cleared.
echo.

if not exist "node_modules\vite\bin\vite.js" (
  echo [LARMX] Dependencies are missing. Running npm install...
  call npm.cmd install
  if errorlevel 1 goto :error
)

echo [LARMX] Starting website...
echo [LARMX] Local: http://127.0.0.1:5173/
for /f "usebackq delims=" %%I in (`powershell.exe -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'} | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set "LARMX_LAN_IP=%%I"
if defined LARMX_LAN_IP (
  echo [LARMX] LAN:   http://%LARMX_LAN_IP%:5173/
) else (
  echo [LARMX] LAN IP was not detected. Run ipconfig to find it.
)
echo [LARMX] Press q then Enter to stop cleanly.
echo.

call npm.cmd run dev -- --host 0.0.0.0 --port 5173 --strictPort
set "LARMX_EXIT=%ERRORLEVEL%"

if not "%LARMX_EXIT%"=="0" goto :error
echo [LARMX] Server stopped cleanly.
goto :end

:error
echo.
echo [LARMX] Could not start the server.
echo [LARMX] Close other LARMX terminals and run this BAT as Administrator.
pause
exit /b 1

:end
endlocal
