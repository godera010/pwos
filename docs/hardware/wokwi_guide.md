# P-WOS Wokwi Simulation Guide
## Testing ESP32 Firmware Without Hardware

---

## What Is Wokwi and Why Are We Using It?

**Wokwi** is an electronics simulator that runs inside VS Code. It simulates a real ESP32 and connected sensors — so you can fully test and debug the firmware code without owning any physical hardware yet.

### Why We Use It for P-WOS

When you order the ESP32 and sensors, they take time to arrive. Wokwi lets you:

- **Test the firmware logic** — sensor reading, pump control, MQTT publishing — before hardware arrives
- **Debug code safely** — no risk of damaging a real sensor or relay
- **Simulate edge cases** — you can instantly set soil moisture to 0% or 100% that would take hours to recreate in real soil
- **Verify JSON output** — confirm the data format the ESP32 sends matches what the backend expects
- **Test pump commands** — send `{"action":"ON","duration":15}` and watch it respond instantly

The simulation firmware (`pwos_wokwi.ino`) is designed to behave **identically** to the real firmware in terms of logic — same JSON format, same MQTT topics, same pump command handling. The only differences are that physical hardware is replaced with simulated components.

---

## How Real vs Simulated Components Compare

| Real Hardware | Wokwi Replacement | How to Control It |
|--------------|-------------------|-------------------|
| DHT22 sensor (temp + humidity) | Wokwi DHT22 component | Click it → edit temperature/humidity values |
| Capacitive soil moisture sensor | Potentiometer (knob) | Turn left = dry, turn right = wet |
| 5V Relay Module | Relay component | Controlled automatically by firmware |
| Water pump | Blue LED | LED ON = pump would be running |
| Status LED (GPIO 2) | Green LED | Blink patterns same as real firmware |
| Your WiFi network | Wokwi virtual WiFi | Auto-connects, nothing to configure |
| Local Mosquitto broker | Public HiveMQ broker | `broker.hivemq.com` — no account needed |

---

## File Structure

All Wokwi simulation files live in their own folder, separate from the real firmware:

```
src/firmware/
├── pwos_esp32/                   ← Real firmware (flash to physical ESP32)
│   ├── pwos_esp32.ino
│   ├── config.h.example
│   └── config.h                  (you create this, gitignored)
│
└── pwos_wokwi/                   ← Wokwi simulation (run in VS Code)
    ├── pwos_wokwi.ino            ← Simulation sketch (same logic as real)
    ├── diagram.json              ← Virtual circuit wiring
    ├── wokwi.toml                ← Tells Wokwi where the compiled binary is
    ├── build_wokwi.bat           ← Script to compile the sketch
    └── build/                    ← Compiled output (created when you build)
        ├── esp32.esp32.esp32/
        │   └── pwos_wokwi.ino.elf   ← Wokwi reads this to simulate
        ├── pwos_wokwi.ino.bin
        └── ...
```

**Key rule:** The real firmware (`pwos_esp32/`) and the simulation (`pwos_wokwi/`) are completely independent. Changes to one do not affect the other.

---

## Dependencies

### 1. VS Code (already installed)

### 2. Wokwi VS Code Extension (already installed)
- Extension ID: `wokwi.wokwi-vscode`
- Verify: Press `Ctrl+Shift+X` → search for "Wokwi" → should show as installed

### 3. Arduino CLI (already installed at `C:\arduino-cli\`)
- Used to compile the `.ino` sketch into a binary `.elf` file that Wokwi can simulate
- Verify by running in a terminal:
  ```powershell
  C:\arduino-cli\arduino-cli.exe version
  ```
  Expected output: `arduino-cli  Version: 1.4.1 ...`

### 4. ESP32 Board Core (already installed)
- The compiler toolchain for ESP32 chips
- Verify:
  ```powershell
  C:\arduino-cli\arduino-cli.exe core list
  ```
  Expected output:
  ```
  ID          Installed  Latest  Name
  esp32:esp32 3.3.7      3.3.7   esp32
  ```

### 5. Arduino Libraries (already installed)
- Verify:
  ```powershell
  C:\arduino-cli\arduino-cli.exe lib list
  ```
  You should see all four of these:
  ```
  DHT sensor library    1.4.7
  ArduinoJson           7.4.3
  PubSubClient          2.8.0
  Adafruit Unified Sensor 1.1.15
  ```

### 6. Wokwi License (Free)
- The VS Code extension requires a free license key
- Get one at: [wokwi.com/license](https://wokwi.com/license)
- Activate: Press `F1` → `Wokwi: Request a new License` → follow the browser prompt

---

## Verification Checklist

Before running the simulation, confirm each item:

```
[ ] VS Code is open with the pwos project folder
[ ] Wokwi extension shows as installed (Ctrl+Shift+X → "Wokwi")
[ ] C:\arduino-cli\arduino-cli.exe version  → shows v1.4.1
[ ] arduino-cli core list                   → shows esp32:esp32 3.3.7
[ ] arduino-cli lib list                    → shows all 4 libraries
[ ] src\firmware\pwos_wokwi\build\ folder exists and contains .elf file
[ ] Wokwi license is activated (F1 → "Wokwi: Request a new License")
```

To check if the `.elf` file exists:
```powershell
Test-Path "src\firmware\pwos_wokwi\build\esp32.esp32.esp32\pwos_wokwi.ino.elf"
# Should print: True
```

---

## How to Run

### Step 1 — Compile the Firmware (only needed once, or after code changes)

Double-click `src\firmware\pwos_wokwi\build_wokwi.bat`

Or in a terminal from the project root:
```powershell
C:\arduino-cli\arduino-cli.exe compile --fqbn esp32:esp32:esp32 "src\firmware\pwos_wokwi" --output-dir "src\firmware\pwos_wokwi\build"
```

Wait for:
```
Sketch uses 929984 bytes (70%) of program storage space.
Global variables use 46832 bytes (14%) of dynamic memory.
```
That means it compiled successfully.

> You only need to recompile when you **change the `.ino` code**. If you only changed `diagram.json`, no recompile needed.

---

### Step 2 — Open the Sketch in VS Code

Open `src/firmware/pwos_wokwi/pwos_wokwi.ino` in VS Code.

---

### Step 3 — Start the Simulation

Press **`F1`** → type **`Wokwi: Start Simulator`** → press **Enter**

The Wokwi panel opens on the right side of VS Code, showing the circuit diagram. Press the **▶ Play** button.

---

### Step 4 — Watch the Serial Monitor

The Serial Monitor opens at the bottom automatically. You will see:

```
============================================
  P-WOS ESP32 — WOKWI SIMULATION
============================================
  Soil: Turn potentiometer to adjust
  Pump: Blue LED = pump running
  Send pump commands in Serial Monitor:
    PUMP ON  /  PUMP OFF  /  STATUS  /  READ

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

## Interacting With the Simulation

### Adjust Soil Moisture
- In the Wokwi circuit panel, find the **potentiometer** (labelled "Soil Moisture")
- Click and drag it:
  - **Left** → soil dries out → lower moisture %
  - **Right** → soil gets wetter → higher moisture %
- Type `STATUS` in the Serial Monitor to confirm the change

### Adjust Temperature / Humidity
- Click the **DHT22** component in the circuit panel
- A settings panel appears — change the `temperature` and `humidity` values
- Click away to apply — the next reading will use the new values

### Serial Monitor Commands
Type these in the Serial Monitor input box and press **Enter**:

| Command | What It Does |
|---------|-------------|
| `STATUS` | Print current soil %, temp, humidity, pump state |
| `READ` | Force an immediate sensor reading (don't wait 10s) |
| `PUMP ON` | Start pump for 30 seconds → blue LED lights up |
| `PUMP OFF` | Stop pump immediately → blue LED turns off |
| `HELP` | Show available commands |
| `{"action":"ON","duration":15}` | JSON pump command — same format as the real dashboard sends |

### Status LED (Green LED) Blink Patterns

| Pattern | Meaning |
|---------|---------|
| Fast blink (10Hz) | No WiFi — still connecting |
| Medium blink (2Hz) | WiFi OK, MQTT not connected yet |
| Quick pulse | Pump is active |
| Solid ON | Everything connected and running normally |

---

## What to Test

### Test 1: Basic Sensor Reading
1. Start the simulation
2. Wait for `[READY]` in Serial Monitor
3. Type `READ`
4. Confirm you see soil, temp, and humidity values in the output

### Test 2: Soil Moisture Changes
1. Turn the potentiometer fully left → type `STATUS` → moisture should be near 0%
2. Turn the potentiometer fully right → type `STATUS` → moisture should be near 100%
3. Set it somewhere in the middle (e.g. 40%)

### Test 3: Pump Control
1. Type `PUMP ON` in Serial Monitor
2. Watch the **blue LED** light up in the circuit view
3. Check Serial Monitor for `[PUMP] ON for 30s`
4. Type `PUMP OFF`
5. Blue LED turns off, Serial Monitor shows `[PUMP] OFF (ran for Xs)`

### Test 4: JSON Pump Command
1. Type exactly: `{"action":"ON","duration":10}`
2. Pump starts for 10 seconds
3. This confirms the firmware can parse the same JSON format the dashboard will send

### Test 5: Temperature Change
1. Click the DHT22 component → set temperature to `35.0`
2. Type `READ`
3. Confirm `Temp:35.0°C` in the output

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| "Wokwi: Start Simulator" not in F1 menu | Extension not installed | Press `Ctrl+Shift+X` → install "Wokwi Simulator" |
| "License required" popup | Not yet activated | `F1` → `Wokwi: Request a new License` → sign up free |
| "ELF file not found" error | Sketch not compiled | Run `build_wokwi.bat` first |
| WiFi shows FAILED | Wokwi WiFi delay | Normal — MQTT will auto-retry and connect |
| MQTT state=-2 | Public broker busy | Wait 30s — it retries automatically |
| Soil always reads 0% | Potentiometer wiring | Check `diagram.json` has potentiometer on GPIO 34 |
| DHT22 reads NaN | Wokwi component issue | Click DHT22 in circuit, verify it has temperature/humidity values set |
| Compile fails — library not found | Missing library | Run: `C:\arduino-cli\arduino-cli.exe lib install "DHT sensor library" "ArduinoJson" "PubSubClient" "Adafruit Unified Sensor"` |

---

## Moving From Simulation to Real Hardware

When your ESP32 and sensors arrive:

1. Open `src/firmware/pwos_esp32/config.h.example`
2. Copy it to `config.h` and fill in your WiFi + MQTT credentials
3. Set `WIFI_ENABLED` to `false` (USB mode) or `true` (WiFi mode)
4. Flash the real firmware: run `tools\flash_esp32.bat` or use Arduino IDE
5. Follow the full hardware setup: `docs/hardware/hardware_setup.md`

The JSON your real ESP32 sends will be **identical** to what the simulation sent — so the backend, database, and AI model require zero changes.
