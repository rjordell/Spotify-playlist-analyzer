@echo off
setlocal

set "TASK_NAME=Spotify Listen Later Smart Shuffle"
set "RUN_SCRIPT=%~dp0run-listen-later-smart-shuffle.cmd"
set "START_TIME=22:00"
set "DAY=SUN"

if not exist "%RUN_SCRIPT%" (
  echo Could not find "%RUN_SCRIPT%".
  exit /b 1
)

schtasks /Create /TN "%TASK_NAME%" /TR "\"%RUN_SCRIPT%\"" /SC WEEKLY /MO 2 /D %DAY% /ST %START_TIME% /F
if %ERRORLEVEL% neq 0 (
  echo Failed to create scheduled task. Try running this script from an Administrator terminal.
  exit /b %ERRORLEVEL%
)

echo Created scheduled task "%TASK_NAME%".
echo It will run every 2 weeks on %DAY% at %START_TIME%.
echo Logs: "%~dp0..\.spotify-shuffle-state\logs\listen-later-smart-shuffle.log"
