# P-WOS Hardware Migration Plan
**Status:** Phase 1 In Progress
**Goal:** Transition from `esp32_simulator.py` to physical ESP32 hardware.

---

## 1. Hardware Requirements
To replace the simulator, you will need:
*   **Microcontroller:** ESP32 Dev Kit V1
*   **Sensors:**
    *   Capacitive Soil Moisture Sensor v1.2 (Analog)
    *   DHT11 (Temperature & Humidity)
*   **Actuator:**
    *   5V Relay Module (to control the Water Pump)
    *   5V Mini Water Pump + Tubing
*   **Power:** 5V Power Supply or USB Power Bank

See [hardware_shopping_list.md](hardware_shopping_list.md) for full BOM with prices.

---

## 2. Wiring Diagram
| ESP32 Pin | Component | Description |
| :--- | :--- | :--- |
| **GPIO 34** | Soil Sensor (A0) | Analog Input (Read Moisture) |
| **GPIO 25** | DHT11 Data | Digital Input (Read Temp/Hum) |
| **GPIO 26** | Relay IN | Digital Output (Control Pump) |
| **3V3** | Sensors VCC | Power |
| **GND** | All component GNDs | Ground |

---

## 3. Firmware Implementation (C++ Arduino)
The ESP32 runs C++ firmware (`src/firmware/pwos_esp32/pwos_esp32.ino`) with:
- WiFi auto-reconnect with exponential backoff
- PubSubClient for MQTT (publishes to `pwos/sensor/data`)
- Non-blocking pump control (no `delay()` blocking)
- DHT11 + soil moisture sensor reading
- Watchdog timer for auto-reboot on hangs

### Config
Copy `config.h.example` to `config.h` and edit:
```cpp
#define WIFI_SSID     "YourWiFi"
#define WIFI_PASS     "YourPassword"
#define MQTT_BROKER   "192.168.1.X"   // Your PC's IP
#define MQTT_PORT     1883
```

### JSON Output (matches simulator format)
```json
{
  "device_id": "ESP32_PWOS_001",
  "soil_moisture": 45.2,
  "temperature": 24.5,
  "humidity": 60.0,
  "pump_active": false
}
```

Published to `pwos/sensor/data` — same topic as the simulator.

---

## 4. Backend Adjustments
**Good News:** No changes are required for `app.py`!
*   The backend listens to `pwos/sensor/data`. It doesn't care if the JSON comes from Python or a real ESP32.
*   **Action**: Set `DATA_SOURCE_MODE=hardware` in `.env`
*   **Action**: Power on your physical ESP32

---

## 5. Network Configuration (Phase 1: LAN)
*   **Crucial**: The ESP32 and your PC must be on the **same WiFi network**
*   **Firewall**: Allow inbound TCP on Port 1883 (Mosquitto)
*   **Find your PC's IP**: Run `ipconfig` → look for IPv4 Address

---

## 6. Migration to Cloud (Phase 2)
After LAN testing works:
1. Update `config.h` to use HiveMQ Cloud (TLS, port 8883)
2. Deploy Flask API to Railway
3. Deploy React to Vercel
4. Set `MQTT_MODE=cloud` in Railway environment

---

## 7. Migration Checklist

### Phase 1: LAN
- [x] C++ firmware created (`src/firmware/pwos_esp32/`)
- [x] Config template created (`config.h.example`)
- [x] Serial bridge for USB fallback (`src/hardware/serial_bridge.py`)
- [x] Hardware manager (`src/hardware/hardware_manager.py`)
- [x] Config updated with `DATA_SOURCE_MODE`
- [x] Startup script updated (`start_pwos.bat`)
- [x] Flash tool created (`tools/flash_esp32.bat`)
- [x] Setup guide created (`docs/hardware/guides/hardware_setup.md`)
- [ ] Buy hardware (see [shopping list](hardware_shopping_list.md))
- [ ] Flash firmware to ESP32
- [ ] Calibrate soil sensor
- [ ] Test on LAN

### Phase 2: Cloud
- [ ] Add TLS to firmware for HiveMQ
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Test over internet
