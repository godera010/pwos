# Implementation Plan: Direct MQTT Integration & Hardware Flow

This plan outlines the architectural shift to connect the React frontend directly to the Mosquitto MQTT broker via WebSockets, ensuring live data and manual controls work independently of the Python backend. Additionally, this plan covers updates to the system startup script and graceful frontend fallback when the backend goes offline.

> [!IMPORTANT]
> **User Review Required**:
> We will configure Mosquitto's WebSockets on Port `9001` assuming you are running this locally. I will automatically run `npm install mqtt` in the frontend directory to fulfill the dependencies once this is approved.

---

## Edge Cases & Advanced System Conflicts

Moving to a decoupled MQTT architecture introduces complex distributed system challenges. Here is an exhaustive list of edge cases and our engineered solutions:

### 1. The "Split Brain" Mode Clash (Resolved via Source of Truth)
**Scenario:** Backend goes offline. Frontend switches to `MANUAL` locally. Backend reboots; its internal memory thinks the state is still `AUTO` and begins executing ML commands, overriding the user.
**Solution:** Mosquitto becomes the ultimate source of truth. We will create the topic `pwos/system/mode` and use MQTT `retain=True`. When the Python Backend boots up, it reads the retained mode from the broker first. If the broker says `MANUAL`, the backend immediately silences the AI.

### 2. The "Ghost State" (ESP Hardware Death)
**Scenario:** The ESP32 loses power or WiFi. Because it's dead, it's not publishing data. The React frontend continues to display the last received sensor data (e.g., 55% Moisture), leading the user to mistakenly believe the system is healthy.
**Solution (Hardware LWT):** We will configure an MQTT **Last Will and Testament (LWT)** on the ESP32. When the hardware connects, it tells the broker: *"If I disappear unexpectedly, immediately publish 'OFFLINE' to `pwos/sensor/status`"*. The React frontend will listen to this. If it fires, the UI will instantly blur out the sensor dials and show an **"ESP32 OFFLINE"** critical warning.

### 3. Broker Complete Failure (The Single Point of Failure)
**Scenario:** It's not the Python backend that crashes, but the Mosquitto service itself. Now, neither `AUTO` nor `MANUAL` mode works. 
**Solution:** The React `useMqtt` hook will actively monitor the WebSocket connection state. If connection drops, the frontend will trigger a catastrophic modal reading: **"Message Broker Offline - Complete System Halt"**. We will explicitly disable *all* Control buttons to prevent users from thinking their clicks are doing anything.

### 4. Overzealous Network Partitioning (The False Positive)
**Scenario:** The user opens the React app but their specific browser/adblocker blocks the Python API (CORS, VPN, etc). However, the Python backend is perfectly healthy and running the AI loop successfully on the server. If React auto-forces the system to `MANUAL` because *it* couldn't reach the backend, it maliciously turns off a healthy AI.
**Solution:** Instead of *automatically* forcing the state to `MANUAL` when an API fetch fails, the frontend will present a prompt: **"Backend API Unreachable. AI may be offline. Request Emergency Manual Override?"** The user must consciously click it, which then publishes the `MANUAL` state to MQTT. This prevents UI network glitches from killing the automation for the whole farm.

### 5. Multi-Client Overlap (The "Wife & Husband" Clash)
**Scenario:** Two users open the Dashboard on their respective phones. Both are in `MANUAL` mode. Both spam the "PUMP ON" button.
**Solution:** The ESP32 telemetry publishes the `pump_active: true` status. If React reads that the pump is currently engaged, it dynamically locks the "PUMP ON" button and disables rapid-firing. Furthermore, the ESP32 firmware will simply ignore duplicate `ON` commands if its relay pin is already pulled HIGH.

### 6. Configuration Locking (Stale Settings)
**Scenario:** The Python backend goes offline. The user decides to change the ML threshold from 25% to 40% and clicks "Save Settings". The database is offline, so the settings vanish into the void.
**Solution:** If the React frontend detects backend API failure, it will lock all inputs in the "System Configuration" (Settings) panel entirely, replacing the Save button with a disabled **"Settings Read-Only (Database Offline)"** button. 

### 7. The "Runaway Pump" (User Device Disconnect)
**Scenario:** User triggers `PUMP ON` via MQTT on their laptop, but before they click `PUMP OFF`, their laptop runs out of battery. The manual OFF command never sends. 
**Solution:** The ESP32 firmware must enforce a hardware-level fail-safe. The frontend's MQTT payload will be `{ "action": "ON", "duration": 60 }`. The ESP reads this and handles the 60-second stopwatch internally. It shuts *itself* off safely, guaranteeing it will never flood the plants even if the frontend disconnects forever.

### 8. Missing ML Predictions & Logs
**Scenario:** Front-end relies on MQTT for sensors, which works flawlessly. But historical logs and predictions exist only in the Flask SQLite database, which crashes.
**Solution:** The frontend catches the fetch failures and swaps the "AI Predictions" and "Historical Analytics" cards for a graceful empty state (e.g., "AI Brain Disconnected - Running on Raw Hardware Telemetry").

---

## Proposed Changes

### Startup Script Cleanup (`start_pwos.bat`)
#### [MODIFY] [start_pwos.bat](file:///C:/Users/Godwin/Documents/projects/pwos/start_pwos.bat)
- Completely remove the `[1] SIMULATION` vs `[2] HARDWARE` prompt and the simulated scripts. Exclusive assumption of hardware mode.
- Introduce interactive prompt for Normal (windowed) vs Silent (background) execution.

### Mosquitto Configuration
#### [MODIFY] [fix_mosquitto.bat](file:///C:/Users/Godwin/Documents/projects/pwos/fix_mosquitto.bat)
- Add `listener 9001` with `protocol websockets`.

### React Frontend
#### [MODIFY] [package.json](file:///C:/Users/Godwin/Documents/projects/pwos/src/frontend/package.json)
- Add `mqtt`.
#### [NEW] `src/frontend/src/services/mqttClient.ts`
- Connect to `ws://localhost:9001`. Monitor `pwos/system/mode`, `pwos/sensor/status`, and `pwos/sensor/data`.
#### [MODIFY] [Control.tsx](file:///C:/Users/Godwin/Documents/projects/pwos/src/frontend/src/pages/Control.tsx) & [Dashboard.tsx](file:///C:/Users/Godwin/Documents/projects/pwos/src/frontend/src/pages/Dashboard.tsx)
- Implement all UX safeguards discussed in the Edge Cases section above (Manual prompt, Settings lock, LWT Offline overlay, etc.)

### Python Backend
#### [MODIFY] [app.py](file:///C:/Users/Godwin/Documents/projects/pwos/src/backend/app.py) & [mqtt_subscriber.py](file:///C:/Users/Godwin/Documents/projects/pwos/src/backend/mqtt_subscriber.py)
- Update global state to listen and sync with `pwos/system/mode` retained MQTT messages instead of storing it solely in Python memory block overlap overlaps.

---

## Verification Plan

1. Start silently (`start_pwos.bat`).
2. Disconnect Python Backend. Verify React locks settings and asks if you want to explicitly invoke Manual Override.
3. Once in Manual Override, trigger Pump ON. Shut down the browser completely. Wait 60 seconds and ensure ESP hardware safely halts.
4. Kill Mosquitto service entirely. Verify the frontend immediately displays a critical system-wide freeze/halt alert.
