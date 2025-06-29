@echo off
echo 🎯 Crypto Graphs Simple Startup
echo ===============================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

echo Starting Crypto Graphs application (simple mode)...
node start-simple.js

pause 