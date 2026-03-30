# P-WOS Phase 2 — Hardware Test Firmwares

Minimal test sketches to verify your ESP32 + DHT22 + Water Sensor wiring **before** using the full P-WOS firmware. Each test is self-contained — no WiFi, no MQTT, no `config.h` needed.

---

## 📋 Prerequisites

### Hardware (Already Done)
- ESP32-WROOM-32 on breadboard (Phase 1 ✅)
- DHT22 + Water Sensor wired per `docs/hardware/breadboard_assembly.html`
- USB cable connected to PC

### Software Needed

**1. Arduino IDE 2.x** — [Download](https://www.arduino.cc/en/software)

**2. ESP32 Board Package:**
1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Board Manager**
5. Search **"esp32"** → Install **"esp32 by Espressif Systems"**

**3. Board Settings** (Tools menu):
| Setting | Value |
|---------|-------|
| Board | ESP32 Dev Module |
| Upload Speed | 921600 |
| CPU Frequency | 240MHz |
| Flash Frequency | 80MHz |
| Flash Mode | QIO |
| Flash Size | 4MB |
| Partition Scheme | Default 4MB |
| Port | (your ESP32 COM port) |

**4. DHT Library** (needed for tests 02 and 04):
1. Go to **Sketch → Include Library → Manage Libraries**
2. Search **"DHT sensor library"**
3. Install **"DHT sensor library" by Adafruit** (version 1.4.x)
4. When prompted, also install **"Adafruit Unified Sensor"** → Yes

---

## 🧪 Test Sequence

Run the tests **in order**. Each test builds on the previous one's success.

### Test 01 — Blink (ESP32 Alive Check)
```
📂 tests/01_blink_test/01_blink_test.ino
```

**What it does:** Blinks the onboard LED and prints to Serial.
**Why run first:** Confirms the ESP32 board works, USB upload works, and Serial Monitor is functional. If THIS fails, the problem is your board/IDE setup — not your sensor wiring.

**No external wiring needed.** No libraries needed.

**Steps:**
1. Open `01_blink_test.ino` in Arduino IDE
2. Select your board and COM port
3. Click **Upload** ▶️
4. Open **Serial Monitor** (Tools → Serial Monitor, or Ctrl+Shift+M)
5. Set baud rate to **115200**
6. Watch for `[OK] LED ON` messages and the onboard LED blinking

**✅ PASS:** LED blinks AND serial output appears.

---

### Test 02 — DHT22 (Temperature & Humidity)
```
📂 tests/02_dht22_test/02_dht22_test.ino
```

**What it does:** Reads temperature and humidity from the DHT22 every 3 seconds.
**Requires:** DHT sensor library (see Prerequisites).

**Steps:**
1. Open `02_dht22_test.ino` in Arduino IDE
2. Upload and open Serial Monitor at 115200 baud
3. Watch for temperature and humidity readings
4. Confirm values are sensible (temp 15-40°C, humidity 20-90%)

**✅ PASS:** Real temperature and humidity values appear with ✅ marks.

**If it fails:**
| Symptom | Fix |
|---------|-----|
| `NaN` readings | Check all 3 DHT22 wires (Green=VCC, Brown=Data, White=GND) |
| Always 0.00 | Brown wire not in Col 11 Row A, or not clipped to DHT22 S pin |
| Compile error | DHT library not installed |

---

### Test 03 — Water Sensor (Analog ADC)
```
📂 tests/03_water_sensor_test/03_water_sensor_test.ino
```

**What it does:** Reads raw ADC values from the water sensor every 2 seconds.
**No libraries needed.**

**Steps:**
1. Open `03_water_sensor_test.ino` in Arduino IDE
2. Upload and open Serial Monitor at 115200 baud
3. Leave sensor DRY for a few readings (should read near 0)
4. Touch sensor pads with a WET finger (values should jump to 500+)
5. Optionally dip sensor tip in water (values 2000+)

**✅ PASS:** Values change when you wet the sensor.

**If it fails:**
| Symptom | Fix |
|---------|-----|
| Always 0 | Red wire (VCC) not connected to inner strip |
| Always 4095 | Purple wire (GND) not connected to outer strip |
| Erratic values | Blue wire (Signal) loose in Col 15 |

---

### Test 04 — All Sensors Combined (Final Check)
```
📂 tests/04_all_sensors_test/04_all_sensors_test.ino
```

**What it does:** Runs both sensors simultaneously. Prints a combined report every 10 readings and a **final PASS/FAIL verdict** after 50 readings.
**Requires:** DHT sensor library.

**Steps:**
1. Open `04_all_sensors_test.ino` in Arduino IDE
2. Upload and open Serial Monitor at 115200 baud
3. Let it run for at least 10 readings
4. During the test, dip the water sensor in water at least once
5. Wait for the final report

**✅ PASS:** Final report shows "ALL SENSORS WORKING — Ready for full firmware!"

---

## 🔌 Pin Reference

| GPIO | Component | Test # | Wire Color | Breadboard |
|------|-----------|--------|------------|------------|
| 25 | DHT22 Data | 02, 04 | Brown (W4) | Col 11, Row A |
| 34 | Water Sensor Signal | 03, 04 | Blue (W8) | Col 15, Row A |
| 2 | Onboard LED | All | (built-in) | — |

---

## ❓ FAQ

**Q: Do I need WiFi for these tests?**
A: No! All tests run offline — Serial Monitor only.

**Q: The upload fails with "Failed to connect to ESP32"**
A: Hold the **BOOT** button on the ESP32 while uploading. Release after you see "Connecting..."

**Q: Serial Monitor shows garbage characters**
A: Wrong baud rate. Set it to **115200** in the Serial Monitor dropdown.

**Q: Can I run just Test 04 and skip the others?**
A: You can, but if it fails you won't know if the problem is the ESP32 itself, the DHT22, or the water sensor. The sequence helps you isolate issues.

---

## ✅ After All Tests Pass

Your hardware is verified! Next steps:
1. Copy `config.h.example` → `config.h` in `pwos_esp32/`
2. Fill in your WiFi + MQTT credentials
3. Flash the full `pwos_esp32.ino` firmware
4. Connect to your P-WOS backend
