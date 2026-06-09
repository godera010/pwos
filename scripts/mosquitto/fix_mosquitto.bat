@echo off
echo ==============================================
echo    P-WOS Mosquitto Complete Fix
echo ==============================================
echo.

:: Check if script is running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Administrator permissions confirmed!
) else (
    echo [ERROR] You must right-click this file and select "Run as Administrator"
    echo Press any key to exit...
    pause >nul
    exit /b 1
)

set "CONF=C:\Program Files\mosquitto\mosquitto.conf"

echo.
echo === STEP 1: Stop Mosquitto ===
net stop mosquitto 2>nul
timeout /t 2 /nobreak >nul
echo [OK] Mosquitto stopped.

echo.
echo === STEP 2: Fix configuration (remove duplicates) ===

:: Use PowerShell to clean the config file
powershell -ExecutionPolicy Bypass -Command ^
  "$f = '%CONF%'; " ^
  "$lines = Get-Content $f; " ^
  "$keep = @(); " ^
  "$skip = $false; " ^
  "foreach ($line in $lines) { " ^
  "  if ($line -match '# --- PWOS') { $skip = $true; continue } " ^
  "  if ($skip) { " ^
  "    if ($line.Trim() -eq '' -or $line -match '^(listener|allow_anonymous|protocol)') { continue } " ^
  "    else { $skip = $false; $keep += $line } " ^
  "  } else { $keep += $line } " ^
  "} " ^
  "while ($keep.Count -gt 0 -and $keep[-1].Trim() -eq '') { $keep = $keep[0..($keep.Count-2)] } " ^
  "$keep += ''; " ^
  "$keep += '# --- PWOS Clean Config (do not duplicate) ---'; " ^
  "$keep += 'listener 1883 0.0.0.0'; " ^
  "$keep += 'allow_anonymous true'; " ^
  "$keep += ''; " ^
  "$keep += 'listener 9001'; " ^
  "$keep += 'protocol websockets'; " ^
  "$keep | Set-Content $f; " ^
  "Write-Host '[OK] Config cleaned. Last 8 lines:'; " ^
  "Get-Content $f -Tail 8"

echo.
echo === STEP 3: Add Windows Firewall rules ===
:: Delete old rules to prevent duplicates
netsh advfirewall firewall delete rule name="Mosquitto MQTT (PWOS)" >nul 2>&1
netsh advfirewall firewall delete rule name="Mosquitto MQTT WebSocket (PWOS)" >nul 2>&1

:: Add fresh inbound rules
netsh advfirewall firewall add rule name="Mosquitto MQTT (PWOS)" dir=in action=allow protocol=tcp localport=1883 >nul
echo [OK] Firewall rule: port 1883 (MQTT) - OPEN

netsh advfirewall firewall add rule name="Mosquitto MQTT WebSocket (PWOS)" dir=in action=allow protocol=tcp localport=9001 >nul
echo [OK] Firewall rule: port 9001 (WebSocket) - OPEN

echo.
echo === STEP 4: Start Mosquitto ===
net start mosquitto
timeout /t 3 /nobreak >nul

echo.
echo === STEP 5: Verify ===
netstat -an | findstr ":1883.*LISTENING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] MQTT port 1883 is LISTENING!
    netstat -an | findstr "1883"
) else (
    echo [FAIL] Port 1883 is NOT listening.
    echo.
    echo Running Mosquitto in verbose mode for diagnostics...
    echo (Press Ctrl+C to stop)
    echo.
    "C:\Program Files\mosquitto\mosquitto.exe" -c "%CONF%" -v
    goto :end
)

netstat -an | findstr ":9001.*LISTENING" >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] WebSocket port 9001 is LISTENING!
)

echo.
echo === Testing MQTT locally ===
echo Publishing a test message...
"C:\Program Files\mosquitto\mosquitto_pub.exe" -h 127.0.0.1 -p 1883 -t "pwos/test" -m "PWOS_OK" 2>nul
if %errorLevel% == 0 (
    echo [OK] Local MQTT publish successful!
) else (
    echo [WARN] Could not publish test message
)

echo.
echo ==============================================
echo   ALL DONE! Configuration Summary:
echo.
echo   MQTT Broker:  0.0.0.0:1883
echo   WebSocket:    0.0.0.0:9001
echo   Firewall:     Ports 1883, 9001 OPEN
echo   Auth:         Anonymous allowed
echo.
echo   ESP32 should connect to 192.168.137.1:1883
echo   Look for: [MQTT] Connected!
echo ==============================================

:end
pause
