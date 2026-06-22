@echo off
setlocal

node --version >nul 2>nul
if errorlevel 1 goto bundled_node
node "%~dp0smart-shuffle-playlist.js" %*
exit /b %ERRORLEVEL%

:bundled_node
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%BUNDLED_NODE%" goto missing_node
"%BUNDLED_NODE%" "%~dp0smart-shuffle-playlist.js" %*
exit /b %ERRORLEVEL%

:missing_node
echo Node.js was not found. Install Node.js from https://nodejs.org/ or add node.exe to PATH.
exit /b 1
