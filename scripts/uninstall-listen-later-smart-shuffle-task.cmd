@echo off
setlocal

set "TASK_NAME=Spotify Listen Later Smart Shuffle"

schtasks /Delete /TN "%TASK_NAME%" /F
if %ERRORLEVEL% neq 0 (
  echo Failed to delete scheduled task "%TASK_NAME%".
  exit /b %ERRORLEVEL%
)

echo Deleted scheduled task "%TASK_NAME%".
