@echo off
REM P-WOS Wokwi Build Script
REM Compiles the Wokwi simulation firmware so VS Code Wokwi extension can run it

set "SKETCH_DIR=%~dp0"
set "SKETCH_DIR=%SKETCH_DIR:~0,-1%"
set "BUILD_DIR=%SKETCH_DIR%\build\esp32.esp32.esp32"
set "CLI=C:\arduino-cli\arduino-cli.exe"
set "FQBN=esp32:esp32:esp32"

echo =========================================
echo  P-WOS Wokwi — Build for VS Code
echo =========================================
echo.
echo  Sketch: %SKETCH_DIR%pwos_wokwi.ino
echo  Output: %BUILD_DIR%
echo.

REM Check Arduino CLI exists
if not exist "%CLI%" (
    echo [ERROR] Arduino CLI not found at %CLI%
    echo.
    echo The install script should have placed it there.
    echo Try running: tools\install_arduino_cli.bat
    pause
    exit /b 1
)

REM Check ESP32 core is installed
"%CLI%" core list | findstr /i "esp32:esp32" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] ESP32 core not installed yet!
    echo.
    echo Still downloading? Check with:
    echo   C:\arduino-cli\arduino-cli.exe core list
    echo.
    echo To install manually:
    echo   C:\arduino-cli\arduino-cli.exe core install esp32:esp32
    pause
    exit /b 1
)

REM Create build directory
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

REM Install libraries (skips if already installed)
echo [1/2] Checking libraries...
"%CLI%" lib install "DHT sensor library" "ArduinoJson" "PubSubClient" "Adafruit Unified Sensor" 2>nul

REM Compile
echo [2/2] Compiling...
echo.
"%CLI%" compile --fqbn %FQBN% "%SKETCH_DIR%" --output-dir "%BUILD_DIR%"

if errorlevel 1 (
    echo.
    echo [ERROR] Compilation failed! Check errors above.
    pause
    exit /b 1
)

echo.
echo =========================================
echo  [SUCCESS] Build complete!
echo =========================================
echo.
echo  Now in VS Code:
echo    1. Open src\firmware\wokwi_sim\pwos_wokwi.ino
echo    2. Press F1 ^> "Wokwi: Start Simulator"
echo.
pause
