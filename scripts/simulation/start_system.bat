@echo off
setlocal

:: P-WOS System Startup Script (Windows)
:: Starts all necessary components in separate windows.

echo ========================================================
echo P-WOS System Startup
echo ========================================================

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

:: 2. Start MQTT Broker (Mosquitto)
:: Try to start mosquitto if installed, otherwise assume running service or cloud
where mosquitto >nul 2>&1
if %errorlevel% equ 0 (
    echo [STARTING] MQTT Broker...
    start "Mosquitto MQTT" mosquitto -v
) else (
    echo [INFO] Mosquitto not found in PATH. Assuming external broker or running service.
)

:: 3. Start Backend API
echo [STARTING] Backend API Server...
cd /d "%~dp0.."
start "P-WOS Backend" python src/backend/app.py

:: 4. Start ESP32 Sensor Simulator
echo [STARTING] ESP32 Sensor Simulator...
start "ESP32 Simulator" python src/simulation/esp32_simulator.py

findstr /C:"WEATHER_API_MODE=openweathermap" .env >nul
if %errorlevel% neq 0 (
    echo [STARTING] Weather Simulator (Simulation Mode)...
    start "Weather Simulator" python src/simulation/weather_simulator.py
) else (
    echo [INFO] Using Real Weather API (OpenWeatherMap). Weather Simulator skipped.
)

:: 6. Check Frontend Build
if not exist "src\frontend\dist\index.html" (
    echo [WARNING] Frontend build not found in src/frontend/dist!
    echo [INFO] You may see a 404 error. Please run 'npm run build' in src/frontend.
    echo.
)

:: 7. Open Dashboard
echo [INFO] Waiting for system to initialize...
timeout /t 5 >nul
echo [OPENING] Dashboard...
start http://localhost:5000

echo.
echo ========================================================
echo SYSTEM RUNNING
echo ========================================================
echo - Backend:   http://localhost:5000
echo - Sensors:   Running (Simulated ESP32)
echo - Weather:   Real/Simulated based on config
echo.
pause
