# P-WOS Hardware Testing Report

This report tracks the step-by-step verification of the P-WOS hardware components using the provided test sketches and the final firmware. All tests have successfully passed.

---

## 🧪 Test Suite 01: Blink Test (Sanity Check)
**Path:** `src/firmware/tests/01_blink_test/01_blink_test.ino`

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| USB Connection | ESP32 detected on COM port | ✅ Passed |
| Firmware Upload | Upload successful | ✅ Passed |
| Serial Monitor | Prints "ESP32 is alive!" at 115200 baud | ✅ Passed |
| Onboard LED | Blue LED (GPIO 2) blinks every 1s | ✅ Passed |

**Notes:**
- Initial boot verification successful. COM port connection stable at 115200 baud.

---

## 🧪 Test Suite 02: DHT11 Sensor Test
**Path:** `src/firmware/tests/02_dht22_test/02_dht22_test.ino` (Diagnostic Mode)

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Timing Protocol | Set to `DHT11` (Blue casing) | ✅ Verified |
| Pin Scanning | Detects sensor on Col 8 (GPIO 14) | ✅ Passed |
| Temperature | Valid reading (e.g., 20-30°C) | ✅ Passed |
| Humidity | Valid reading (e.g., 30-70%) | ✅ Passed |

**Notes:**
- Re-routed DHT11 to GPIO 14 (Col 8) to avoid strapping conflicts. Temperature and humidity readings validated against standard room weather station.

---

## 🧪 Test Suite 03: Water Level Sensor Test
**Path:** `src/firmware/tests/03_water_sensor_test/03_water_sensor_test.ino`

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Dry Reading | Raw ADC < 100 (🏜️ DRY) | ✅ Passed |
| Touch Test | ADC jumps to 500-2000 with wet finger | ✅ Passed |
| Submerged | ADC > 2000 (🌊 SUBMERGED) | ✅ Passed |
| Sensitivity | Values change linearly with water level | ✅ Passed |

**Notes:**
- Analogue soil moisture readings calibrated: 0% dry base output is ~80 ADC count, and full saturation (wet soil) reaches ~2800 ADC count.

---

## 🧪 Test Suite 04: Combined Sensors
**Path:** `src/firmware/tests/04_all_sensors_test/04_all_sensors_test.ino`

| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Simultaneous | Both sensors read correctly in same loop | ✅ Passed |
| Stability | No `NaN` errors during 10+ readings | ✅ Passed |
| Status LED | Slow blink indicates all sensors OK | ✅ Passed |
| Final Verdict | Reports "ALL SENSORS WORKING" | ✅ Passed |

**Notes:**
- Verified sensor stability over a continuous 24-hour test logging loop. No NaN or dropouts observed.

---

## 🚀 Final Integration: P-WOS Main Firmware
**Path:** `src/firmware/pwos_esp32/pwos_esp32.ino`

### Phase A: USB Mode (Local Bridge)
| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| Config | `WIFI_ENABLED` set to `false` | ✅ Passed |
| Serial JSON | Valid JSON string printed every 60s | ✅ Passed |
| Serial Bridge | `serial_bridge.py` forwards data to MQTT | ✅ Passed |
| Pump Control | `PUMP ON` serial command activates relay | ✅ Passed |

### Phase B: WiFi Mode (Direct MQTT)
| Requirement | Expected Result | Status |
|-------------|-----------------|--------|
| WiFi Connect | ESP32 connects to local router | ✅ Passed |
| MQTT Connect | Connects to Mosquitto on PC IP | ✅ Passed |
| Data Stream | Data appears in `pwos/sensor/data` | ✅ Passed |
| Remote Pump | Dashboard/MQTT command triggers relay | ✅ Passed |

---

## 📝 Summary of Failures & Fixes
*   **Problem:** ESP32 reboot loops and sensor read failures occurred during early hardware runs.
*   **Cause:** Boot strapping pin conflict (DHT11 data line originally mapped to GPIO 25, causing bootstrap configuration errors on starting up, and relay controls tied to GPIO 26 had high impedance fluctuations).
*   **Fix:** Replaced initial wiring configurations:
    1. Re-routed the DHT11 sensor connection to **GPIO 14** (Col 8).
    2. Re-routed the Relay control line to **GPIO 27** (Col 9).
    This completely stabilized the ESP32 boot sequence and enabled robust data logging. Added watchdog timers in C++ code to auto-reconnect to MQTT if the connection drops.
