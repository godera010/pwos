@echo off
REM P-WOS Startup Script for Windows

REM Check if .venv exists
if not exist ".venv" (
    echo [ERROR] Virtual Environment not found!
    echo Please run 'setup.bat' first to configure the system.
    pause
    exit /b 1
)

REM Activate Virtual Environment
echo [INFO] Activating P-WOS Environment...
call .venv\Scripts\activate.bat

echo =========================================
echo P-WOS - Precision Watering OS
echo =========================================
echo.
echo  Select Execution Mode:
echo.
echo    [1] NORMAL  - Open visible terminals (default)
echo    [2] SILENT  - Run in background (hide windows)
echo.
set /p EXEC_MODE="  Enter choice (1/2): "

if "%EXEC_MODE%"=="2" (
    set START_CMD=start /B ""
    echo  Mode: SILENT BACKGROUND
) else (
    set START_CMD=start ""
    echo  Mode: NORMAL WINDOWS
)
echo =========================================
echo.

REM Get project root
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%"
cd /d "%PROJECT_ROOT%"

echo Project Root: %CD%

REM Check if Mosquitto is installed
where mosquitto >nul 2>&1
if errorlevel 1 (
    echo ERROR: Mosquitto is not installed!
    echo.
    echo Please install Mosquitto from:
    echo https://mosquitto.org/download/
    echo.
    echo Make sure to add it to your PATH
    pause
    exit /b 1
)

echo Starting P-WOS...
echo.
echo This will start:
echo   1. Database Subscriber
echo   2. Live Weather Dashboard
echo   3. API Server [Flask]
echo   4. P-WOS Autopilot
echo   5. React Dev Server [Vite]
echo.
echo   ESP32 sends data directly via WiFi to Mosquitto.
echo   Make sure your ESP32 is powered on!
echo.
echo Press Ctrl+C in each window to stop
echo.

REM Check MQTT Broker (use the Windows Service — configured by fix_mosquitto.bat)
sc query mosquitto | findstr "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo [WARN] Mosquitto service is not running!
    echo [INFO] Attempting to start it...
    net start mosquitto >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Could not start Mosquitto service.
        echo [INFO]  Run fix_mosquitto.bat as Administrator first.
        pause
        exit /b 1
    )
)
echo [OK] Mosquitto MQTT Broker is running.

REM Start Database Subscriber
%START_CMD% cmd /c "echo Starting Database Subscriber... && cd src\backend && python mqtt_subscriber.py"
timeout /t 2 >nul

REM Hardware WiFi Mode: ESP32 talks to Mosquitto directly
echo [OK] Hardware WiFi Mode — ESP32 publishes to Mosquitto directly.

REM Start Live Weather Dashboard
%START_CMD% cmd /c "echo Starting Live Weather Dashboard... && python scripts/monitors/live_weather_dashboard.py"
timeout /t 2 >nul

REM Start API Server
%START_CMD% cmd /c "echo Starting API Server... && cd src\backend && python app.py"
timeout /t 3 >nul

REM Start Automation Controller
%START_CMD% cmd /c "echo Starting Automation Controller... && cd src\backend && python automation_controller.py"
timeout /t 2 >nul

REM Start React Dev Server
%START_CMD% cmd /c "echo Starting React Dev Server... && cd src\frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo All components started!
echo ========================================
echo.
echo   Production App (Flask):      http://localhost:5000
echo   Development App (Hot Reload): http://localhost:5173
echo.
echo Press any key to exit this window...
pause >nul
