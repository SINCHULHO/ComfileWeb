@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\Initialize-Signing.ps1" -Login
set "loginResult=%ERRORLEVEL%"
echo.
pause
exit /b %loginResult%
