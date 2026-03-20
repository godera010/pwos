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
echo    [2] HARDWARE    - Real ESP32 required
echo    [3] HYBRID      - Hardware preferred, simulator fallback
echo.
set /p MODE_CHOICE="  Enter choice (1/2/3): "

if "%MODE_CHOICE%"=="2" (
    set DATA_SOURCE=hardware
    echo.
    echo  How is your ESP32 connected?
    echo.
    echo    [A] USB    - Connected via USB cable, no WiFi needed
    echo                 ^(serial_bridge.py handles MQTT^)
    echo    [B] WiFi   - Connected to your local network
    echo                 ^(ESP32 publishes to Mosquitto directly^)
    echo.
    set /p HW_CONNECTION="  Enter choice (A/B): "
) else if "%MODE_CHOICE%"=="3" (
    set DATA_SOURCE=hybrid
    set HW_CONNECTION=B
) else (
    set DATA_SOURCE=simulation
    set HW_CONNECTION=
)

echo.
if "%DATA_SOURCE%"=="hardware" (
    if /I "%HW_CONNECTION%"=="A" (
        echo  Mode: %DATA_SOURCE% [USB]
    ) else (
        echo  Mode: %DATA_SOURCE% [WiFi]
    )
) else (
    echo  Mode: %DATA_SOURCE%
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
    echo This will open 8 command windows:
    echo   1. MQTT Broker [Mosquitto]
    echo   2. Database Subscriber
    echo   3. Simulated ESP32
    echo   4. Live Weather Dashboard [Real-Time API]
    echo   5. API Server [Flask]
    echo   6. P-WOS Autopilot
    echo   7. ML Brain Monitor
    echo   8. React Dev Server [Vite]
) else if "%DATA_SOURCE%"=="hardware" (
    echo This will open 7 command windows:
    echo   1. MQTT Broker [Mosquitto]
    echo   2. Database Subscriber
    echo   3. Hardware Manager [monitors ESP32]
    echo   4. Live Weather Dashboard [Real-Time API]
    echo   5. API Server [Flask]
    echo   6. P-WOS Autopilot
    echo   7. React Dev Server [Vite]
    echo.
    echo   NOTE: Make sure your ESP32 is powered on and connected!
) else (
    echo This will open 8 command windows:
    echo   1. MQTT Broker [Mosquitto]
    echo   2. Database Subscriber
    echo   3. Hardware Manager [auto-detects source]
    echo   4. Live Weather Dashboard [Real-Time API]
    echo   5. API Server [Flask]
    echo   6. P-WOS Autopilot
    echo   7. ML Brain Monitor
    echo   8. React Dev Server [Vite]
)

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

REM Start Data Source (depends on mode)
if "%DATA_SOURCE%"=="simulation" (
    REM Simulation: Start weather simulator + ESP32 simulator
    start "Weather Simulator" cmd /k "echo Starting Weather Simulator... && cd src\simulation && python weather_simulator.py"
    timeout /t 2 >nul
    start "Simulated ESP32" cmd /k "echo Starting Simulated ESP32... && cd src\simulation && python esp32_simulator.py 5"
    timeout /t 2 >nul
) else if "%DATA_SOURCE%"=="hardware" (
    if /I "%HW_CONNECTION%"=="A" (
        REM USB Mode: Start serial bridge (bidirectional: sensor data + pump commands)
        start "Serial Bridge [USB]" cmd /k "echo Starting Serial Bridge ^(ESP32 USB ^<-^> MQTT^)... && python src\hardware\serial_bridge.py"
        timeout /t 2 >nul
    ) else (
        REM WiFi Mode: ESP32 talks to Mosquitto directly, start monitor
        start "Hardware Monitor [WiFi]" cmd /k "echo Starting Hardware Monitor... && set DATA_SOURCE_MODE=hardware && python src\hardware\hardware_manager.py --mode hardware"
        timeout /t 2 >nul
    )
) else (
    REM Hybrid: Start hardware manager with fallback
    start "Hardware Manager" cmd /k "echo Starting Hardware Manager [Hybrid]... && set DATA_SOURCE_MODE=hybrid && python src\hardware\hardware_manager.py --mode hybrid"
    timeout /t 2 >nul
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
