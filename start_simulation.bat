@echo off
REM P-WOS Simulation Startup Script for Windows

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

echo Starting P-WOS Simulation...
echo.

echo Starting P-WOS Simulation...
echo.
echo This will open 8 command windows:
echo   1. MQTT Broker (Mosquitto)
echo   2. Database Subscriber  
echo   3. Simulated ESP32
echo   4. Live Weather Dashboard (Real-Time API)
echo   5. API Server (Flask)
echo   6. P-WOS Autopilot
echo   7. ML Brain Monitor
echo   8. React Dev Server (Vite)
echo.
echo Press Ctrl+C in each window to stop
echo.
pause

REM Start MQTT Broker
start "MQTT Broker" cmd /k "echo Starting MQTT Broker... && mosquitto -v"
timeout /t 3 >nul

REM Start Database Subscriber
start "Database Subscriber" cmd /k "echo Starting Database Subscriber... && cd src\backend && python mqtt_subscriber.py"
timeout /t 2 >nul

REM Start Weather Simulator (Source of Truth for Offline Weather)
start "Weather Simulator" cmd /k "echo Starting Weather Simulator... && cd src\simulation && python weather_simulator.py"
timeout /t 2 >nul

REM Start Simulated ESP32
start "Simulated ESP32" cmd /k "echo Starting Simulated ESP32... && cd src\simulation && python esp32_simulator.py 5"
timeout /t 2 >nul

REM Start Live Weather Dashboard
start "Live Weather Dashboard" cmd /k "echo Starting Live Weather Dashboard... && python scripts/monitors/live_weather_dashboard.py"
timeout /t 2 >nul


REM Start API Server
start "API Server" cmd /k "echo Starting API Server... && cd src\backend && python app.py"
timeout /t 3 >nul

REM Start Automation Controller
start "P-WOS Autopilot" cmd /k "echo Starting Automation Controller... && cd src\backend && python automation_controller.py"
timeout /t 2 >nul

REM Start ML Monitor
start "Brain Monitor" cmd /k "echo Starting ML Monitor... && python scripts/monitors/ml_monitor.py"
timeout /t 2 >nul

REM Start React Dev Server
start "React Dev Server" cmd /k "echo Starting React Dev Server... && cd src\frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo ========================================
echo All components started!
echo ========================================
echo.
echo 🚀 Production App (Flask Served): http://localhost:5000
echo ⚡ Development App (Hot Reload):   http://localhost:5173
echo.
echo Press any key to exit this window...
pause >nul
