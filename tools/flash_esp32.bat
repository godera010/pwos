@echo off
REM P-WOS ESP32 Flash Tool
REM Compiles and uploads firmware using Arduino CLI

echo =========================================
echo P-WOS ESP32 Flash Tool
echo =========================================
echo.

REM Check for Arduino CLI
where arduino-cli >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Arduino CLI not found!
    echo.
    echo Install it from: https://arduino.github.io/arduino-cli/latest/installation/
    echo.
    echo Or install via winget:
    echo   winget install Arduino.ArduinoCLI
    echo.
    pause
    exit /b 1
)

REM Config
set "FIRMWARE_DIR=%~dp0..\src\firmware\pwos_esp32"
set "FQBN=esp32:esp32:esp32"

REM Check for config.h
if not exist "%FIRMWARE_DIR%\config.h" (
    echo [ERROR] config.h not found!
    echo.
    echo Please create it from the template:
    echo   copy "%FIRMWARE_DIR%\config.h.example" "%FIRMWARE_DIR%\config.h"
    echo.
    echo Then edit config.h with your WiFi and MQTT credentials.
    echo.
    pause
    exit /b 1
)

REM Detect ESP32 port
echo [INFO] Detecting ESP32...
for /f "tokens=1" %%p in ('arduino-cli board list --format text ^| findstr /i "esp32"') do (
    set "PORT=%%p"
)

if not defined PORT (
    echo [WARN] ESP32 not auto-detected.
    set /p PORT="Enter COM port (e.g., COM3): "
)

echo.
echo  Configuration:
echo    Firmware:  %FIRMWARE_DIR%
echo    Board:     %FQBN%
echo    Port:      %PORT%
echo.

REM Step 1: Install ESP32 core (if needed)
echo [1/3] Checking ESP32 board support...
arduino-cli core install esp32:esp32

REM Step 2: Install libraries
echo.
echo [2/3] Installing libraries...
arduino-cli lib install "PubSubClient"
arduino-cli lib install "DHT sensor library"
arduino-cli lib install "ArduinoJson"
arduino-cli lib install "Adafruit Unified Sensor"

REM Step 3: Compile and upload
echo.
echo [3/3] Compiling and uploading...
arduino-cli compile --fqbn %FQBN% "%FIRMWARE_DIR%"

if errorlevel 1 (
    echo.
    echo [ERROR] Compilation failed! Check errors above.
    pause
    exit /b 1
)

arduino-cli upload -p %PORT% --fqbn %FQBN% "%FIRMWARE_DIR%"

if errorlevel 1 (
    echo [ERROR] Upload failed! Check connection and port.
    pause
    exit /b 1
)

echo.
echo =========================================
echo [SUCCESS] Firmware uploaded!
echo =========================================
echo.
echo Open Serial Monitor to verify:
echo   arduino-cli monitor -p %PORT% -c baudrate=115200
echo.
pause
