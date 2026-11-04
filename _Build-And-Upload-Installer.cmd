@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 exit /b 1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\Build-Installer.ps1"
set "result=%ERRORLEVEL%"
if not "%result%"=="0" goto finish
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\Upload-Installer.ps1"
set "result=%ERRORLEVEL%"
:finish
echo.
pause
exit /b %result%
