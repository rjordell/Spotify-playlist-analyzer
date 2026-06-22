@echo off
setlocal

set "ROOT=%~dp0.."
set "PLAYLIST=https://open.spotify.com/playlist/2O12R2TLM4D1osLrBZ6rIX?si=728e4741897b4195"
set "STATE_FILE=%ROOT%\.spotify-shuffle-state\listen-later.json"
set "LOG_DIR=%ROOT%\.spotify-shuffle-state\logs"
set "LOG_FILE=%LOG_DIR%\listen-later-smart-shuffle.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [%DATE% %TIME%] Starting listen-later smart shuffle >> "%LOG_FILE%"
call "%~dp0smart-shuffle.cmd" --playlist "%PLAYLIST%" --new-only --initial-boundary-index 182 --apply --state-file "%STATE_FILE%" >> "%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"
echo [%DATE% %TIME%] Finished with exit code %EXIT_CODE% >> "%LOG_FILE%"
exit /b %EXIT_CODE%
