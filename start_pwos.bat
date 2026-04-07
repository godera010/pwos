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
echo  Select Data Source Mode:
echo.
echo    [1] SIMULATION  - No hardware needed (default)
echo    [2] HARDWARE    - Real ESP32 over WiFi
echo.
set /p MODE_CHOICE="  Enter choice (1/2): "

if "%MODE_CHOICE%"=="2" (
    set DATA_SOURCE=hardware
    set HW_CONNECTION=B
) else (
    set DATA_SOURCE=simulation
    set HW_CONNECTION=
)

echo.
if "%DATA_SOURCE%"=="hardware" (
    echo  Mode: HARDWARE [WiFi]
) else (
    echo  Mode: SIMULATION
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

echo Starting P-WOS in %DATA_SOURCE% mode...
echo.

if "%DATA_SOURCE%"=="simulation" (
    echo This will start:
    echo   1. Database Subscriber
    echo   2. Weather Simulator
    echo   3. Simulated ESP32
    echo   4. Live Weather Dashboard
    echo   5. API Server [Flask]
    echo   6. P-WOS Autopilot
    echo   7. ML Brain Monitor
    echo   8. React Dev Server [Vite]
) else (
    echo This will start:
    echo   1. Database Subscriber
    echo   2. Live Weather Dashboard
    echo   3. API Server [Flask]
    echo   4. P-WOS Autopilot
    echo   5. React Dev Server [Vite]
    echo.
    echo   ESP32 sends data directly via WiFi to Mosquitto.
    echo   Make sure your ESP32 is powered on!
)

echo.
echo Press Ctrl+C in each window to stop
echo.
pause

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
start "Database Subscriber" cmd /k "echo Starting Database Subscriber... && cd src\backend && python mqtt_subscriber.py"
timeout /t 2 >nul

REM Start Data Source (depends on mode)
if "%DATA_SOURCE%"=="simulation" (
    REM Simulation: Start weather simulator + ESP32 simulator
    start "Weather Simulator" cmd /k "echo Starting Weather Simulator... && cd src\simulation && python weather_simulator.py"
    timeout /t 2 >nul
    start "Simulated ESP32" cmd /k "echo Starting Simulated ESP32... && cd src\simulation && python esp32_simulator.py 5"
    timeout /t 2 >nul
) else (
    REM Hardware WiFi Mode: ESP32 talks to Mosquitto directly
    echo [OK] Hardware WiFi Mode — ESP32 publishes to Mosquitto directly.
    echo      No serial bridge needed.
)

REM Start Live Weather Dashboard
start "Live Weather Dashboard" cmd /k "echo Starting Live Weather Dashboard... && python scripts/monitors/live_weather_dashboard.py"
timeout /t 2 >nul

REM Start API Server
start "API Server" cmd /k "echo Starting API Server... && cd src\backend && python app.py"
timeout /t 3 >nul

REM Start Automation Controller
start "P-WOS Autopilot" cmd /k "echo Starting Automation Controller... && cd src\backend && python automation_controller.py"
timeout /t 2 >nul

REM Start ML Monitor (not needed in hardware-only mode)
if not "%DATA_SOURCE%"=="hardware" (
    start "Brain Monitor" cmd /k "echo Starting ML Monitor... && python scripts/monitors/ml_monitor.py"
    timeout /t 2 >nul
)

REM Start React Dev Server
start "React Dev Server" cmd /k "echo Starting React Dev Server... && cd src\frontend && npm run dev"
timeout /t 3 >nul

echo.
echo ========================================
echo All components started! [%DATA_SOURCE% mode]
echo ========================================
echo.
echo   Production App (Flask):      http://localhost:5000
echo   Development App (Hot Reload): http://localhost:5173
echo.
echo Press any key to exit this window...
pause >nul
