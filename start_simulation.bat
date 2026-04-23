@echo off
REM P-WOS Simulation Startup Script for Windows
REM =============================================
REM Set DEBUG=1 to open each service in its own window (8 terminals)
REM Set DEBUG=0 to run all services silently in the background (1 terminal)
REM =============================================
set "DEBUG=0"

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
echo P-WOS Simulation Environment
echo =========================================
echo.

REM Get project root (the script is in pwos root)
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

if "%DEBUG%"=="1" (
    echo [MODE] DEBUG = ON  (8 separate terminal windows)
) else (
    echo [MODE] DEBUG = OFF (all services run in background)
)
echo.

echo Starting P-WOS Simulation...
echo.
echo   1. MQTT Broker (Mosquitto)
echo   2. Database Subscriber  
echo   3. Weather Simulator
echo   4. Simulated ESP32
echo   5. Live Weather Dashboard
echo   6. API Server (Flask)
echo   7. P-WOS Autopilot
echo   8. ML Brain Monitor
echo   9. React Dev Server (Vite)
echo.
pause

REM === 1. MQTT Broker ===
if "%DEBUG%"=="1" (
    start "MQTT Broker" cmd /k "echo Starting MQTT Broker... && mosquitto -v"
) else (
    echo [1/9] Starting MQTT Broker...
    start /B "" mosquitto -v >nul 2>&1
)
timeout /t 3 >nul

REM === 2. Database Subscriber ===
if "%DEBUG%"=="1" (
    start "Database Subscriber" cmd /k "echo Starting Database Subscriber... && cd src\backend && python mqtt_subscriber.py"
) else (
    echo [2/9] Starting Database Subscriber...
    start /B "" cmd /c "cd src\backend && python mqtt_subscriber.py" >nul 2>&1
)
timeout /t 2 >nul

REM === 3. Weather Simulator ===
if "%DEBUG%"=="1" (
    start "Weather Simulator" cmd /k "echo Starting Weather Simulator... && cd src\simulation && python weather_simulator.py"
) else (
    echo [3/9] Starting Weather Simulator...
    start /B "" cmd /c "cd src\simulation && python weather_simulator.py" >nul 2>&1
)
timeout /t 2 >nul

REM === 4. Simulated ESP32 ===
if "%DEBUG%"=="1" (
    start "Simulated ESP32" cmd /k "echo Starting Simulated ESP32... && cd src\simulation && python esp32_simulator.py 5"
) else (
    echo [4/9] Starting Simulated ESP32...
    start /B "" cmd /c "cd src\simulation && python esp32_simulator.py 5" >nul 2>&1
)
timeout /t 2 >nul

REM === 5. Live Weather Dashboard ===
if "%DEBUG%"=="1" (
    start "Live Weather Dashboard" cmd /k "echo Starting Live Weather Dashboard... && python scripts/monitors/live_weather_dashboard.py"
) else (
    echo [5/9] Starting Live Weather Dashboard...
    start /B "" cmd /c "python scripts/monitors/live_weather_dashboard.py" >nul 2>&1
)
timeout /t 2 >nul

REM === 6. API Server ===
if "%DEBUG%"=="1" (
    start "API Server" cmd /k "echo Starting API Server... && cd src\backend && python app.py"
) else (
    echo [6/9] Starting API Server...
    start /B "" cmd /c "cd src\backend && python app.py" >nul 2>&1
)
timeout /t 3 >nul

REM === 7. Automation Controller ===
if "%DEBUG%"=="1" (
    start "P-WOS Autopilot" cmd /k "echo Starting Automation Controller... && cd src\backend && python automation_controller.py"
) else (
    echo [7/9] Starting P-WOS Autopilot...
    start /B "" cmd /c "cd src\backend && python automation_controller.py" >nul 2>&1
)
timeout /t 2 >nul

REM === 8. ML Monitor ===
if "%DEBUG%"=="1" (
    start "Brain Monitor" cmd /k "echo Starting ML Monitor... && python scripts/monitors/ml_monitor.py"
) else (
    echo [8/9] Starting ML Brain Monitor...
    start /B "" cmd /c "python scripts/monitors/ml_monitor.py" >nul 2>&1
)
timeout /t 2 >nul

REM === 9. React Dev Server ===
if "%DEBUG%"=="1" (
    start "React Dev Server" cmd /k "echo Starting React Dev Server... && cd src\frontend && npm run dev"
) else (
    echo [9/9] Starting React Dev Server...
    start /B "" cmd /c "cd src\frontend && npm run dev" >nul 2>&1
)
timeout /t 3 >nul

echo.
echo ========================================
echo All components started!
echo ========================================
echo.
echo   Production App (Flask):    http://localhost:5000
echo   Development App (Vite):    http://localhost:5173
echo.
if "%DEBUG%"=="0" (
    echo [INFO] All services running in background.
    echo [INFO] Check logs\ folder for output.
    echo.
    echo Press any key to STOP all services and exit...
    pause >nul
    echo.
    echo [STOP] Shutting down all P-WOS services...
    taskkill /F /IM mosquitto.exe >nul 2>&1
    taskkill /F /IM python.exe /FI "WINDOWTITLE eq *" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq Database Subscriber" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq Weather Simulator" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq Simulated ESP32" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq Live Weather Dashboard" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq API Server" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq P-WOS Autopilot" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq Brain Monitor" >nul 2>&1
    taskkill /F /FI "WINDOWTITLE eq React Dev Server" >nul 2>&1
    echo [DONE] All services stopped.
) else (
    echo Press any key to exit this launcher...
    pause >nul
)
