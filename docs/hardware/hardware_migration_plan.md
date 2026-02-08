# P-WOS Hardware Migration Plan
**Status:** Draft
**Goal:** Transition from `esp32_simulator.py` to physical ESP32 hardware.

---

## 1. Hardware Requirements
To replace the simulator, you will need:
*   **Microcontroller:** ESP32 Dev Kit V1
*   **Sensors:**
    *   Capacitive Soil Moisture Sensor v1.2 (Analog)
    *   DHT22 or DHT11 (Temperature & Humidity)
*   **Actuator:**
    *   5V Relay Module (to control the Water Pump)
    *   5V Mini Water Pump + Tubing
*   **Power:** 5V Power Supply or USB Power Bank

---

## 2. Wiring Diagram (Conceptual)
| ESP32 Pin | Component | Description |
| :--- | :--- | :--- |
| **GPIO 34** | Soil Sensor (Aout) | Analog Input (Read Moisture) |
| **GPIO 4** | Relay IN | Digital Output (Control Pump) |
| **GPIO 14** | DHT22 Data | Digital Input (Read Temp/Hum) |
| **3V3** | Sensors VCC | Power |
| **GND** | Sensors GND | Ground |

---

## 3. Firmware Implementation (MicroPython)
The ESP32 needs to run code that mimics the simulator's MQTT behavior.

### `main.py` Config
```python
MQTT_BROKER = "192.168.1.XXX" # Your PC's IP address
TOPIC_PUB = "pwos/sensors"
TOPIC_SUB = "pwos/control/pump"
```

### Logic Loop
1.  **Connect** to WiFi and MQTT Broker.
2.  **Subscribe** to `pwos/control/pump`.
3.  **Loop**:
    *   Read Analog Value from GPIO 34.
    *   Map 4095 (Dry) -> 0 (Wet) to 0-100% Moisture.
    *   Read DHT22.
    *   **Publish** JSON to `pwos/sensors`:
        ```json
        {
          "device_id": "REAL_ESP32_01",
          "soil_moisture": 45.2,
          "temperature": 24.5,
          "humidity": 60.0,
          "pump_active": false
        }
        ```
    *   **Listen** for incoming "ON" messages to trigger Relay (GPIO 4).
    *   Sleep for 60 seconds (Deep Sleep optional).

---

## 4. Backend Adjustments
**Good News:** No changes are required for `app.py`!
*   The backend listens to `pwos/sensors`. It doesn't care if the JSON comes from Python or a real ESP32.
*   **Action**: Stop running `src/simulation/esp32_simulator.py`.
*   **Action**: Start your physical ESP32.

---

## 5. Network Configuration
*   **Crucial**: The ESP32 and your Laptop (running the broker) must be on the **same WiFi network**.
*   **Firewall**: You must allow inbound connections on Port 1883 on your Laptop.

---

## 6. Real Weather Integration
The `weather_simulator.py` currently generates fake rain. For the real world:
*   We need a new script: `src/integrations/real_weather_api.py`.
*   It should query **OpenWeatherMap API**.
*   It should publish to `pwos/weather/current` just like the simulator did.

---

## 7. Migration Checklist
- [ ] Buy Hardware.
- [ ] Install MicroPython on ESP32.
- [ ] Write `boot.py` (WiFi Connect) and `main.py` (MQTT Logic).
- [ ] Test turning Relay ON/OFF via Dashboard.
- [ ] Calibrate Soil Sensor (Air = 0%, Water = 100%).
- [ ] Replace `weather_simulator.py` with Weather API script.
