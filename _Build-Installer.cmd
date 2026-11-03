@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\Build-Installer.ps1"
set "buildResult=%ERRORLEVEL%"
echo.
pause
exit /b %buildResult%
