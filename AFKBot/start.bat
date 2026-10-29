@echo off
REM Usage: start.bat <host> <port> [version]
if not exist node_modules call npm install
node bot.js %*
pause
