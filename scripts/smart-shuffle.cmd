@echo off
setlocal

node --version >nul 2>nul
if %ERRORLEVEL%==0 (
  node "%~dp0smart-shuffle-playlist.js" %*
  exit /b %ERRORLEVEL%
)

set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" "%~dp0smart-shuffle-playlist.js" %*
  exit /b %ERRORLEVEL%
)

echo Node.js was not found. Install Node.js from https://nodejs.org/ or add node.exe to PATH.
exit /b 1
