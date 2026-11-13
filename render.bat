@echo off
rem Render with auto-restart if the headless browser crashes.
rem Example:  render.bat test_pult --res 540x960 --fps 12 --interp 24
cd /d "%~dp0"
for /L %%i in (1,1,20) do (
  node studio.js render %*
  if not errorlevel 1 goto :done
  echo render crashed, retry %%i
  timeout /t 3 >nul
)
:done
