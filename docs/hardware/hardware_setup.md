# Hardware Setup Guide

Step-by-step guide to setting up the ESP32 hardware for P-WOS.

---

## Prerequisites

- ESP32-WROOM-32 DevKit V1 (or compatible)
- DHT22 sensor, capacitive soil moisture sensor, 5V relay module
- USB cable (Micro-USB or USB-C depending on your board)
- See [hardware_shopping_list.md](hardware_shopping_list.md) for the full BOM

---

## 1. Install Arduino IDE & ESP32 Support

### Option A: Arduino IDE (GUI)

1. Download [Arduino IDE 2.x](https://www.arduino.cc/en/software)
2. Open **File → Preferences**
3. In **Additional Board Manager URLs**, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Board Manager**
5. Search **"esp32"** → Install **"esp32 by Espressif Systems"**

### Option B: Arduino CLI (Command Line)

```bash
# Install Arduino CLI
winget install Arduino.ArduinoCLI

# Add ESP32 board support
arduino-cli config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32
```

---

## 2. Install Required Libraries

### Arduino IDE
Go to **Sketch → Include Library → Manage Libraries** and install:

| Library | Author | Purpose |
|---------|--------|---------|
| **PubSubClient** | Nick O'Leary | MQTT communication |
| **DHT sensor library** | Adafruit | DHT22 sensor |
| **Adafruit Unified Sensor** | Adafruit | Dependency for DHT |
| **ArduinoJson** | Benoit Blanchon | JSON serialization |

### Arduino CLI
```bash
arduino-cli lib install "PubSubClient"
arduino-cli lib install "DHT sensor library"
arduino-cli lib install "ArduinoJson"
arduino-cli lib install "Adafruit Unified Sensor"
```

---

## 3. Wiring

Connect components to ESP32 as follows:

```
ESP32 Pin           Component
────────────────────────────────────────
GPIO 34 (ADC)   →   Soil Moisture Sensor (A0 / Analog Out)
GPIO 25         →   DHT22 Data Pin
GPIO 26         →   Relay IN (Pump Control)
3.3V            →   DHT22 VCC, Soil Sensor VCC
GND             →   All GNDs
```

### Pump Circuit (Separate Power!)
```
Battery Pack (+) → Relay COM
Relay NO         → Pump (+)
Pump (-)         → Battery Pack (-)
```

> ⚠️ **NEVER** power the pump directly from ESP32 pins. Always use the relay with a separate power source.

See [hardware_shopping_list.md](hardware_shopping_list.md) for detailed wiring diagrams.

---

## 4. Configure Firmware

```bash
# Navigate to firmware directory
cd src/firmware/pwos_esp32

# Create your config from template
copy config.h.example config.h
```

### Choose Your Connection Mode

| Mode | When to Use | Config |
|------|-------------|--------|
| **USB** | No WiFi setup yet, testing hardware, calibrating sensors | `WIFI_ENABLED false` |
| **WiFi** | ESP32 on your local network, full system operation | `WIFI_ENABLED true` |

### USB Mode (No WiFi)

Edit `config.h` — only the mode flag matters:
```cpp
#define WIFI_ENABLED  false   // ← USB mode

// WiFi/MQTT fields are ignored in USB mode
// but keep them filled for when you switch later
```

The ESP32 outputs sensor JSON on serial. The **serial bridge** on your PC reads it and publishes to Mosquitto.

### WiFi Mode

Edit `config.h` with your network details:
```cpp
#define WIFI_ENABLED  true    // ← WiFi mode

#define WIFI_SSID     "YourWiFiName"
#define WIFI_PASS     "YourWiFiPassword"
#define MQTT_BROKER   "192.168.1.100"   // Your PC's LAN IP
#define MQTT_PORT     1883
```

#### Finding Your PC's IP Address
```bash
ipconfig
# Look for "IPv4 Address" under your WiFi adapter
```

---

## 5. Flash Firmware

### Option A: Arduino IDE
1. Open `src/firmware/pwos_esp32/pwos_esp32.ino`
2. **Tools → Board** → Select **"ESP32 Dev Module"**
3. **Tools → Port** → Select your ESP32's COM port
4. Click **Upload** (→ button)

### Option B: Flash Script
```bash
tools\flash_esp32.bat
```

### Option C: Arduino CLI
```bash
arduino-cli compile --fqbn esp32:esp32:esp32 src/firmware/pwos_esp32
arduino-cli upload -p COM3 --fqbn esp32:esp32:esp32 src/firmware/pwos_esp32
```

---

## 6. Verify

### USB Mode Serial Output

Open Serial Monitor at **115200 baud**. You should see:

```
============================================
  P-WOS ESP32 Firmware v1.1
  Mode: USB (Serial bridge)
============================================

[INIT] DHT22 initialized
[INIT] WiFi DISABLED — USB serial mode
[INIT] Send JSON pump commands via serial:
[INIT]   {"action":"ON","duration":30}

[READY] P-WOS ESP32 Running
[INFO]  Publish interval: 60s
============================================

[SERIAL] {"device_id":"ESP32_PWOS_001","soil_moisture":45.20,...}
```

**USB Serial Commands** — type in Serial Monitor:

| Command | Action |
|---------|--------|
| `STATUS` | Print current sensor readings |
| `PUMP ON` | Start pump for 30 seconds |
| `PUMP OFF` | Stop pump immediately |
| `READ` | Force a sensor reading now |
| `{"action":"ON","duration":15}` | JSON pump command (same as MQTT) |

### WiFi Mode Serial Output

```
============================================
  P-WOS ESP32 Firmware v1.1
  Mode: WiFi (MQTT direct)
============================================

[INIT] DHT22 initialized
[WiFi] Connecting to: YourWiFi......
[WiFi] Connected! IP: 192.168.1.42
[WiFi] RSSI: -45 dBm
[MQTT] Connecting to 192.168.1.100:1883...
[MQTT] Connected!
[MQTT] Subscribed to: pwos/control/pump

[READY] P-WOS ESP32 Running
============================================

[DATA] M:45.2% T:24.5C H:60.3% Pump:OFF
```

### Status LED Patterns

| LED Pattern | USB Mode | WiFi Mode |
|-------------|----------|-----------|
| Fast blink (10Hz) | — | No WiFi connection |
| Medium blink (2Hz) | — | WiFi OK, no MQTT |
| Quick pulse | Pump running | Pump running |
| Slow blink (1Hz) | Normal operation | — |
| Solid ON | — | All connected |

---

## 7. Calibrate Soil Sensor

1. Set `SAMPLE_INTERVAL` to `5000` in `config.h` (5 seconds for fast readings)
2. Flash firmware
3. Open Serial Monitor
4. **Dry reading:** Hold sensor in air → note the ADC value from serial output
5. **Wet reading:** Insert sensor in a glass of water → note the ADC value
6. Update `config.h`:
   ```cpp
   #define SOIL_DRY   3500   // Your dry reading
   #define SOIL_WET   1500   // Your wet reading
   ```
7. Set `SAMPLE_INTERVAL` back to `60000` (60 seconds)
8. Re-flash firmware

---

## 8. Windows Firewall (WiFi Mode Only)

For the ESP32 to reach your PC's Mosquitto broker, allow port 1883:

1. Open **Windows Defender Firewall** → **Advanced Settings**
2. **Inbound Rules** → **New Rule**
3. **Port** → **TCP** → **1883**
4. **Allow the connection**
5. Name: "Mosquitto MQTT"

> Not needed for USB mode — the serial bridge runs on your PC and talks to localhost.

---

## 9. Run P-WOS with Hardware

### Using the Startup Script

```bash
start_pwos.bat
# Select [2] HARDWARE
# Then select [A] USB or [B] WiFi
```

### Manual Launch — USB Mode

```bash
# Terminal 1: MQTT Broker
mosquitto -v

# Terminal 2: Serial Bridge (reads ESP32 USB, publishes to MQTT)
python src\hardware\serial_bridge.py

# Terminal 3: Database Subscriber
cd src\backend && python mqtt_subscriber.py

# Terminal 4: API Server
cd src\backend && python app.py

# Terminal 5: React
cd src\frontend && npm run dev
```

### Manual Launch — WiFi Mode

```bash
# Terminal 1: MQTT Broker
mosquitto -v

# Terminal 2: Database Subscriber
cd src\backend && python mqtt_subscriber.py

# Terminal 3: API Server
cd src\backend && python app.py

# Terminal 4: React
cd src\frontend && npm run dev

# ESP32 publishes directly to Mosquitto — no bridge needed
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| ESP32 not detected (no COM port) | Install [CP2102 driver](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers) or [CH340 driver](http://www.wch.cn/downloads/CH341SER_EXE.html) |
| WiFi won't connect | Check SSID/password in config.h. ESP32 only supports 2.4GHz WiFi. |
| MQTT won't connect | Check your PC's IP in config.h. Ensure Mosquitto is running. Check firewall. |
| Soil readings stuck at 0% or 100% | Recalibrate SOIL_DRY and SOIL_WET values |
| DHT22 read errors | Check wiring. Try adding a 10kΩ pull-up resistor between Data and VCC. |
| Relay clicks but pump doesn't run | Check pump circuit wiring. Ensure battery is charged. |
