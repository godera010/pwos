@echo off
setlocal

echo ========================================================
echo P-WOS Frontend Builder
echo ========================================================

cd /d "%~dp0..\src\frontend"

echo [CHECK] Node.js Version...
node --version
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INSTALL] Installing dependencies...
    call npm install
)

echo [BUILD] Building React Frontend...
call npm run build

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Frontend built successfully!
    echo [INFO] The new UI will be served by start_system.bat
) else (
    echo.
    echo [ERROR] Build failed.
)

pause
