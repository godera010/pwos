@echo off
echo ==============================================
echo    P-WOS Mosquitto Network Permission Fix
echo ==============================================
echo.

:: Check if script is running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Administrator permissions confirmed!
) else (
    echo [ERROR] You must right-click this file and select "Run as Administrator"
    echo Press any key to exit...
    pause >nul
    exit
)

echo.
echo 1. Stopping the Mosquitto Service...
net stop mosquitto

echo.
echo 2. Updating configuration (C:\Program Files\mosquitto\mosquitto.conf)...
echo. >> "C:\Program Files\mosquitto\mosquitto.conf"
echo # --- PWOS Network Fix --- >> "C:\Program Files\mosquitto\mosquitto.conf"
echo listener 1883 0.0.0.0 >> "C:\Program Files\mosquitto\mosquitto.conf"
echo allow_anonymous true >> "C:\Program Files\mosquitto\mosquitto.conf"
echo listener 9001 >> "C:\Program Files\mosquitto\mosquitto.conf"
echo protocol websockets >> "C:\Program Files\mosquitto\mosquitto.conf"

echo.
echo 3. Starting the Mosquitto Service...
net start mosquitto

echo.
echo ==============================================
echo SUCCESS! Mosquitto is now actively listening 
echo on your 192.168.137.1 hotspot network!
echo Check your Arduino Serial Monitor now.
echo ==============================================
pause
