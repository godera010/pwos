# P-WOS Wokwi Simulation Guide

<!-- NAV_START -->
<div align="center">
  <a href="..\..\..\README.md">🏠 Home (Root)</a> |
  <a href="..\..\README.md">💻 Source Code</a> |
  <a href="..\..\..\docs\README.md">📚 Documentation</a> |
  <a href="..\..\..\docs\hardware\README.md">⚙️ Hardware</a> |
  <a href="..\..\..\data\README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->


Test the ESP32 firmware in the browser — no hardware, no flashing required.

**Wokwi folder:** `src/firmware/wokwi_sim/`

---

## What Wokwi Simulates

| Real Component | Wokwi Replacement |
|---------------|-------------------|
| DHT22 (Temp + Humidity) | Wokwi DHT22 component (edit values in diagram) |
| Capacitive Soil Sensor | Potentiometer (turn to change moisture %) |
| 5V Relay + Pump | Blue LED (LED ON = pump running) |
| Status LED | Green LED (blink patterns same as real firmware) |
| Your WiFi network | Wokwi built-in WiFi (`Wokwi-GUEST`) |
| Your Mosquitto (local) | Public HiveMQ test broker (no account required) |

---

## Method A: Wokwi VS Code Extension (Recommended)

The cleanest way — run the simulation directly from VS Code.

### Setup (One-time)

1. **Install the Wokwi extension** in VS Code:
   - Open VS Code
   - Press `Ctrl+Shift+X` (Extensions)
   - Search: **"Wokwi Simulator"**
   - Click Install

2. **Get a free Wokwi license:**
   - Go to [wokwi.com](https://wokwi.com) → Sign Up (free)
   - Go to [wokwi.com/license](https://wokwi.com/license)
   - Copy your license key
   - In VS Code: Press `Ctrl+Shift+P` → type **"Wokwi: Request a new License"** → paste key

3. **Install Arduino CLI** (needed for compiling):
   ```bash
   winget install Arduino.ArduinoCLI
   arduino-cli core install esp32:esp32
   arduino-cli lib install "DHT sensor library" "ArduinoJson" "PubSubClient" "Adafruit Unified Sensor"
   ```

### Run the Simulation

1. Open VS Code in the project root:
   ```bash
   code c:\Users\Godwin\Documents\projects\pwos
   ```

2. Navigate to `src/firmware/wokwi_sim/`

3. Open `pwos_wokwi.ino`

4. **Compile first** (Wokwi needs a binary):
   ```bash
   arduino-cli compile --fqbn esp32:esp32:esp32 src/firmware/wokwi_sim
   ```

5. Press `F1` → **"Wokwi: Start Simulator"**
   - The circuit loads automatically from `diagram.json`
   - Press ▶ Play

---

## Method B: Wokwi Website (No install needed)

Fastest to get started — runs entirely in the browser.

### Steps

1. Go to [wokwi.com](https://wokwi.com)
2. Click **"New Project"** → select **"ESP32"**
3. You will see a code editor and a circuit view

### Upload the Files

**Tab 1 — Sketch (code editor):**
- Delete all existing code
- Copy the entire contents of [`pwos_wokwi.ino`](pwos_wokwi.ino) and paste it

**Tab 2 — diagram.json:**
- Click the `diagram.json` tab (or open it in the file panel)
- Delete all existing content
- Copy the entire contents of [`diagram.json`](diagram.json) and paste it

### Press Play

Click the ▶ **Play** button. The Serial Monitor opens automatically at the bottom.

---

## What to Expect in the Serial Monitor

When the simulation starts you will see:

```
============================================
  P-WOS ESP32 — WOKWI SIMULATION
============================================
  Soil: Turn potentiometer to adjust
  Pump: Blue LED = pump running
  Send pump commands in Serial Monitor:
    PUMP ON  /  PUMP OFF  /  STATUS  /  READ
============================================

[INIT] DHT22 initialized
[WiFi] Connecting to Wokwi-GUEST......
[WiFi] Connected! IP: 10.0.0.2
[MQTT] Connecting to broker.hivemq.com:1883...
[MQTT] Connected!
[MQTT] Subscribed to: pwos/control/pump

[READY] Simulation running!
[INFO]  Publishing every 10s
============================================

[DATA] Soil:34.5% Temp:24.5°C Hum:60.0% Pump:OFF
[SERIAL] {"device_id":"ESP32_PWOS_WOKWI_001","soil_moisture":34.5,...}
[MQTT]  Published → pwos/sensor/data
```

---

## Interactive Tests

Type these commands in the Serial Monitor input box and press Enter:

### Test 1: Check Sensor Readings
```
STATUS
```
→ Prints current soil, temperature, humidity, pump state

### Test 2: Force a Reading
```
READ
```
→ Reads sensors immediately without waiting for the 10s interval

### Test 3: Simulate the Pump

Turn the pump ON for 15 seconds:
```
PUMP ON
```
Watch the **blue LED** light up in the Wokwi circuit view.

Turn it off manually:
```
PUMP OFF
```

Or send a JSON command (same format as the dashboard):
```
{"action":"ON","duration":20}
```

### Test 4: Adjust Soil Moisture

In the Wokwi circuit view:
- Find the **potentiometer** labelled "Soil Moisture"
- Click and turn it left → moisture drops toward 0%
- Turn it right → moisture rises toward 100%
- Type `STATUS` after each turn to confirm the reading changed

### Test 5: Adjust DHT22 Temperature

In the Wokwi circuit view:
- Click the **DHT22 component**
- Change the `temperature` value (double-click to edit)
- Click somewhere else to apply
- Type `STATUS` to confirm the new temperature is being read

---

## Monitor MQTT Live (Optional but Cool)

You can see the ESP32 data arrive on MQTT in real time using **MQTT Explorer**:

1. Download [MQTT Explorer](https://mqtt-explorer.com) (free, Windows)
2. Connect to: `broker.hivemq.com` port `1883` (no username/password)
3. Press Connect
4. In the topic tree, look for `pwos/sensor/data`
5. You will see the JSON payload from your simulated ESP32 updating every 10 seconds!

You can also **send pump commands from MQTT Explorer**:
- Topic: `pwos/control/pump`
- Payload: `{"action":"ON","duration":10}`
- Click Publish
- Watch the blue LED light up in Wokwi!

---

## Differences vs Real Firmware (`pwos_esp32.ino`)

| Feature | Real Firmware | Wokwi Simulation |
|---------|--------------|-----------------|
| Watchdog timer | ✅ Enabled (30s) | ❌ Removed (unsupported) |
| WiFi | Your home network | Wokwi-GUEST (simulated) |
| MQTT Broker | Your Mosquitto (LAN) | broker.hivemq.com (public) |
| Soil sensor | Capacitive ADC, inverted | Potentiometer, direct |
| SOIL_DRY/WET | 3500/1500 | 100/3900 (pot range) |
| Sample interval | 60 seconds | 10 seconds (faster for testing) |
| Pump | Real relay + DC pump | Blue LED indicator |
| WIFI_ENABLED flag | Configurable | Always `true` |
| Source field in JSON | Not present | `"source":"wokwi_sim"` |

> Everything else — the JSON format, MQTT topics, pump command handling, sensor logic, LED blink patterns — is **identical to the real firmware**.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| WiFi shows FAILED | This is OK — MQTT will retry. Wokwi WiFi sometimes takes a moment. |
| MQTT shows Failed (state=-2) | broker.hivemq.com is down. Try `test.mosquitto.org` instead. |
| DHT22 always reads NaN | Click the DHT22 in the circuit and check its temperature/humidity values. |
| Soil always reads 0% | Turn the potentiometer right. Make sure it is wired to GPIO 34 in diagram.json. |
| Blue LED doesn't turn on | Check relay is wired from GPIO 26 → IN, and blue LED from relay NC → A. |
| No MQTT output in Explorer | Check you are connected to `broker.hivemq.com`, not localhost. |

---

## File Reference

| File | Purpose |
|------|---------|
| [`pwos_wokwi.ino`](pwos_wokwi.ino) | Wokwi-adapted firmware sketch |
| [`diagram.json`](diagram.json) | Virtual circuit wiring |
| [`wokwi.toml`](wokwi.toml) | Project config (libraries) |

Real firmware: [`../pwos_esp32/pwos_esp32.ino`](../pwos_esp32/pwos_esp32.ino)
\n\n