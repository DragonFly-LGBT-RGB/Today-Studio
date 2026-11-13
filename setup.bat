@echo off
rem Studio Lite - Windows setup (requires Node.js 18+ from https://nodejs.org)
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js 18+ is required: https://nodejs.org & pause & exit /b 1)
call npm i --no-audit --no-fund
if not exist work mkdir work
if not exist renders mkdir renders
echo setup ok
pause
