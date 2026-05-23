# P-WOS Hardware Progress Log

## Phase 1: ESP32 Setup & Verification ✅ COMPLETED

**Date:** 2026-03-30  
**Status:** ✅ Complete

### Hardware Verified

| Component | Detail | Status |
|-----------|--------|--------|
| **ESP32 Board** | ESP32-D0WD-V3 (revision v3.1) | ✅ Working |
| **Chip Features** | Wi-Fi, Bluetooth, Dual Core, 240MHz | ✅ Confirmed |
| **MAC Address** | `f8:b3:b7:20:30:c0` | ✅ Recorded |
| **USB Cable** | Micro-USB Data Cable | ✅ Data transfer working |
| **Serial Chip** | CP2102 USB to UART Bridge | ✅ Driver installed |
| **COM Port** | COM6 | ✅ Recognized |
| **Breadboard** | GL No.12 (840 holes, 64 columns) | ✅ ESP32 seated |
| **Pin Count** | 38-pin (19 per side) | ✅ Confirmed |
| **Blue LED** | GPIO 2 — Blink test passed | ✅ Blinking |
| **Upload** | 921600 baud, flash verified | ✅ Successful |

### Breadboard Placement

- **Orientation:** 4 vs 5 (or 5 vs 4) — one side fully covered, 1 free row
- **ESP32 spans:** Columns 1–19
- **Free columns:** 20–64 (45 columns available for sensors)
- **Free row:** Row A (top side) — used for pin access
- **Bottom side:** Fully covered — right-side pins accessed via M-F jumpers

### Driver Installation

- **Issue:** CP2102 USB to UART Bridge Controller appeared under "Other devices" with yellow triangle
- **Resolution:** Installed Silicon Labs CP2102 driver
- **Result:** Device moved to `Ports (COM & LPT)` as COM6

### Blink Test Results

```
Sketch uses 283472 bytes (21%) of program storage space. Maximum is 1310720 bytes.
Global variables use 22068 bytes (6%) of dynamic memory, leaving 305612 bytes for local variables.

Chip type:          ESP32-D0WD-V3 (revision v3.1)
Features:           Wi-Fi, BT, Dual Core + LP Core, 240MHz
Crystal frequency:  40MHz
MAC:                f8:b3:b7:20:30:c0
Upload speed:       921600 baud
Result:             ✅ Blue LED blinking, Serial output confirmed
```

### Arduino IDE Configuration

| Setting | Value |
|---------|-------|
| Board | ESP32 Dev Module |
| Port | COM6 |
| Upload Speed | 921600 |
| ESP32 Package | esp32 by Espressif Systems v3.3.7 |

---

## Phase 2: Sensor Wiring ⏳ NEXT

**Status:** 🔲 Not started

### Tasks
- [ ] Wire 3.3V (Col 1, Row A) → Top (+) bus strip
- [ ] Wire GND (Col 13, Row A) → Top (−) bus strip
- [ ] Place DHT22 at columns 25–27
- [ ] Wire DHT22 VCC → (+) bus
- [ ] Wire DHT22 DATA → Col 8, Row A (GPIO 25)
- [ ] Wire DHT22 GND → (−) bus
- [ ] Connect Water Sensor (+) → (+) bus via M-F
- [ ] Connect Water Sensor (−) → (−) bus via M-F
- [ ] Connect Water Sensor (S) → Col 5, Row A (GPIO 34) via M-F

### After Wiring
- [ ] Upload P-WOS firmware (pwos_wokwi.ino)
- [ ] Open Serial Monitor at 115200 baud
- [ ] Verify DHT22 temperature & humidity readings
- [ ] Verify Water Sensor analog readings
- [ ] Calibrate SOIL_DRY and SOIL_WET constants

---

## Phase 3: Relay + Pump Integration ⏳ FUTURE

**Status:** 🔲 Blocked — Need 5V Relay Module

### Tasks
- [ ] Acquire 5V single-channel relay module
- [ ] Wire relay VCC → VIN (5V) via M-F jumper
- [ ] Wire relay GND → (−) bus
- [ ] Wire relay IN → Col 9, Row A (GPIO 26)
- [ ] Verify external power adapter voltage with multimeter
- [ ] Wire pump through relay (COM/NO terminals)
- [ ] Test PUMP ON / PUMP OFF commands via Serial Monitor
- [ ] Integration test with full P-WOS system

---

## Hardware Inventory

| # | Item | Model/Spec | Status |
|---|------|-----------|--------|
| 1 | ESP32 DevKit | WROOM-32, 38-pin, D0WD-V3 rev3.1 | ✅ Working |
| 2 | Breadboard | GL No.12, 840 holes, 64 columns | ✅ In use |
| 3 | DHT22 Sensor | Temperature & Humidity | ✅ Available |
| 4 | Water Sensor | Resistive, analog output | ✅ Available |
| 5 | Mini Pump | DC 5V Submersible | ✅ Available |
| 6 | Jumper Wires | M-M and M-F assortment | ✅ Available |
| 7 | USB Cable | Micro-USB, data-capable | ✅ Working on COM6 |
| 8 | External Power | East Dragon AC/DC Adapter | ✅ Available (voltage TBD) |
| 9 | Relay Module | 5V Single-Channel | ❌ Not yet acquired |
