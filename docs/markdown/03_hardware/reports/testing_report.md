# P-WOS Hardware Testing Report

This report tracks the step-by-step verification of the P-WOS hardware components using the provided test sketches and the final firmware.

---

## 🧪 Test Suite 01: Blink Test (Sanity Check)
**Path:** `src/firmware/tests/01_blink_test/01_blink_test.ino`

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| USB Connection | ESP32 detected on COM port | 🔲 Pending |
| Firmware Upload | Upload successful | 🔲 Pending |
| Serial Monitor | Prints "ESP32 is alive!" at 115200 baud | 🔲 Pending |
| Onboard LED | Blue LED (GPIO 2) blinks every 1s | 🔲 Pending |

**Notes:**
- 

---

## 🧪 Test Suite 02: DHT11 Sensor Test
**Path:** `src/firmware/tests/02_dht22_test/02_dht22_test.ino` (Diagnostic Mode)

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Timing Protocol | Set to `DHT11` (Blue casing) | ✅ Verified |
| Pin Scanning | Detects sensor on Col 11 (GPIO 25) | 🔲 Pending |
| Temperature | Valid reading (e.g., 20-30°C) | 🔲 Pending |
| Humidity | Valid reading (e.g., 30-70%) | 🔲 Pending |

**Notes:**
- 

---

## 🧪 Test Suite 03: Water Level Sensor Test
**Path:** `src/firmware/tests/03_water_sensor_test/03_water_sensor_test.ino`

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Dry Reading | Raw ADC < 100 (🏜️ DRY) | 🔲 Pending |
| Touch Test | ADC jumps to 500-2000 with wet finger | 🔲 Pending |
| Submerged | ADC > 2000 (🌊 SUBMERGED) | 🔲 Pending |
| Sensitivity | Values change linearly with water level | 🔲 Pending |

**Notes:**
- 

---

## 🧪 Test Suite 04: Combined Sensors
**Path:** `src/firmware/tests/04_all_sensors_test/04_all_sensors_test.ino`

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Simultaneous | Both sensors read correctly in same loop | 🔲 Pending |
| Stability | No `NaN` errors during 10+ readings | 🔲 Pending |
| Status LED | Slow blink indicates all sensors OK | 🔲 Pending |
| Final Verdict | Reports "ALL SENSORS WORKING" | 🔲 Pending |

**Notes:**
- 

---

## 🚀 Final Integration: P-WOS Main Firmware
**Path:** `src/firmware/pwos_esp32/pwos_esp32.ino`

### Phase A: USB Mode (Local Bridge)
| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Config | `WIFI_ENABLED` set to `false` | 🔲 Pending |
| Serial JSON | Valid JSON string printed every 60s | 🔲 Pending |
| Serial Bridge | `serial_bridge.py` forwards data to MQTT | 🔲 Pending |
| Pump Control | `PUMP ON` serial command activates relay | 🔲 Pending |

### Phase B: WiFi Mode (Direct MQTT)
| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| WiFi Connect | ESP32 connects to local router | 🔲 Pending |
| MQTT Connect | Connects to Mosquitto on PC IP | 🔲 Pending |
| Data Stream | Data appears in `pwos/sensor/data` | 🔲 Pending |
| Remote Pump | Dashboard/MQTT command triggers relay | 🔲 Pending |

---

## 📝 Summary of Failures & Fixes
*   **Problem:** 
*   **Cause:** 
*   **Fix:** 
