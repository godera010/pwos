# Architecture Decoupling & MQTT Integration Walkthrough

The React frontend has been successfully decoupled from the Python backend to provide direct MQTT telemetry, offline fallback resilience, and hardware-enforced fail-safes. This ensures that a user can always view live data and command the system manually even if the backend environment goes offline.

## 1. Direct MQTT Frontend Service (`useMqtt` & `mqttClient`)
Instead of polling the backend `/api/sensors/latest`, the frontend now connects over WebSockets directly to the Mosquitto broker on Port 9001:

- **State Sync**: The `useMqtt` hook now initializes from the actual connection state, preventing "flickering" statuses during page navigation.
- **Optimistic UI**: Buttons for **Pump** and **Mode** respond in milliseconds. The UI updates locally before the MQTT message even reaches the broker, making the dashboard feel incredibly snappy.
- **Self-Healing**: If sensor data arrives, the system automatically forces "Message Broker" and "ESP32" status to ONLINE, ensuring health indicators match your gauges.

## 2. Dynamic Fallback on Dashboard and Control Pages
The application detects if the database API is offline and automatically adjusts the UI:
- **Redesigned Quick Actions**: A standalone component with an industrial look, featuring large AI/Pump toggles and a "Disable AI to Control" blur safety.
- **Independent Control**: The **Control Center** now works even when the backend is OFF. You can toggle the relay directly via MQTT.
- **Status Badges**: Obstructive warning banners have been replaced by subtle header badges (Broker, ESP32, and AI Engine status).

## 3. Hardware Source-of-Truth & Safeties
The system's "mode" (`AUTO`/`MANUAL`) is now a unified MQTT topic:
- **Unified Topic**: Everything (Backend, Frontend, ESP32) now uses `pwos/system/hardware` for status and `pwos/system/mode` for control.
- **LWT Integration**: If the ESP32 loses power, Mosquitto immediately publishes `OFFLINE` to `pwos/system/hardware`. The React app sees this and triggers the "Hardware Offline" overlay.
- **Hardware Mode Sync**: The ESP32 now subscribes to `pwos/system/mode`, ensuring it knows when the user has taken manual control.

## 4. Simplified Startup & Configuration
- **Startup Script**: `start_pwos.bat` now handles silent starts and assumed hardware operation.
- **Broker Config**: `mosquitto.conf` has been standardized to support both standard MQTT (1883) and WebSockets (9001) for the frontend.

## Next Steps / Actions for the User
Everything is implemented and polished! 
1. **Re-upload Firmware**: Flash the updated `firmware/pwos_esp32/pwos_esp32.ino` to your ESP32.
2. **Verify Independence**: Stop your Python backend (`app.py`) and watch the React Dashboard. It will stay ONLINE and allow you to toggle the pump as long as the ESP32 is powered!
