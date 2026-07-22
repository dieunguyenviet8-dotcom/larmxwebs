@echo off
setlocal
title LARMX R2 Storage API
cd /d "%~dp0"

echo.
echo  ========================================
echo       LARMX R2 STORAGE API
echo  ========================================
echo.

if not exist "server\.env" (
  echo [LARMX] ERROR: Khong tim thay server\.env
  echo [LARMX] Hay tao va cau hinh file nay truoc khi chay API.
  goto :error
)

if not exist "node_modules" (
  echo [LARMX] Dependencies chua duoc cai dat. Dang chay npm install...
  call npm.cmd install
  if errorlevel 1 goto :error
)

netstat -ano | findstr /R /C:"127.0.0.1:8787 .*LISTENING" >nul
if not errorlevel 1 (
  echo [LARMX] Storage API da dang chay tai http://127.0.0.1:8787
  echo [LARMX] Khong can mo them mot API thu hai.
  goto :already_running
)

echo [LARMX] Dang khoi dong Storage API...
echo [LARMX] Dia chi: http://127.0.0.1:8787
echo [LARMX] Giu nguyen cua so nay trong khi upload nhac.
echo.

call npm.cmd run dev:storage
if errorlevel 1 goto :error

echo.
echo [LARMX] Storage API da dung.
goto :end

:already_running
echo.
pause
exit /b 0

:error
echo.
echo [LARMX] Khong the khoi dong Storage API.
echo [LARMX] Kiem tra server\.env va dam bao cong 8787 khong bi ung dung khac chiem dung.
pause
exit /b 1

:end
endlocal
