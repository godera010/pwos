# P-WOS Phase 1 Report: ESP32 Setup & First Upload

**Project:** Plant Water Optimization System (P-WOS)  
**Phase:** 1 — ESP32 Hardware Setup & Verification  
**Date:** 2026-03-30  
**Status:** ✅ COMPLETED  

---

## Table of Contents

1. [Objective](#objective)
2. [Hardware Used](#hardware-used)
3. [Step 1: Physical Placement on Breadboard](#step-1-physical-placement-on-breadboard)
4. [Step 2: USB Connection & Initial Power Test](#step-2-usb-connection--initial-power-test)
5. [Step 3: Driver Installation (CP2102)](#step-3-driver-installation-cp2102)
6. [Step 4: Arduino IDE Setup](#step-4-arduino-ide-setup)
7. [Step 5: First Code Upload — Blink Test](#step-5-first-code-upload--blink-test)
8. [Step 6: Serial Monitor Verification](#step-6-serial-monitor-verification)
9. [Difficulties Encountered & Solutions](#difficulties-encountered--solutions)
10. [ESP32 Chip Specifications](#esp32-chip-specifications)
11. [Phase 1 Conclusion](#phase-1-conclusion)

---

## Objective

Set up the ESP32-WROOM-32 microcontroller on the GL No.12 breadboard, establish a data connection with the PC, install all necessary drivers and software, and verify the board is fully functional by uploading and running our first C/C++ program.

---

## Hardware Used

| # | Component | Specification | Notes |
|---|-----------|---------------|-------|
| 1 | ESP32 DevKit | WROOM-32, 38-pin (19 per side), D0WD-V3 rev3.1 | Main microcontroller |
| 2 | GL No.12 Breadboard | 840 holes, 64 columns, rows A–J, split bus strips | Prototyping board |
| 3 | USB Cable | Micro-USB, data-capable | PC ↔ ESP32 communication |
| 4 | PC | Windows OS | Development machine |

---

## Step 1: Physical Placement on Breadboard

### What We Did

Placed the 38-pin ESP32 on the GL No.12 breadboard, straddling the center gap.

### Key Discovery: The 4 vs 5 (or 5 vs 4) Row Split

When placing the ESP32 on the breadboard, we discovered that the ESP32 board body is **wider than the breadboard's center gap**. This causes an asymmetric placement:

- **One side of the center gap is completely covered** — all 5 rows (A–E or F–J) are occupied by the ESP32 pins and body
- **The other side has 4 rows covered**, leaving **only 1 free row** accessible

This is **completely normal** for wide ESP32 DevKit boards and does not indicate a problem.

### Placement Details

```
  CROSS-SECTION (through columns 1–19):

  (+) bus  ═══════════     ← Red power rail
  (-) bus  ───────────     ← Blue ground rail

  Row A  ○ ○ ○ ○ ○ ○ ○    ← FREE ✅ (the ONLY accessible row)
  Row B  ■ ■ ■ ■ ■ ■ ■    ← ESP32 LEFT PINS
  Row C  ████████████████  ← BLOCKED by body
  Row D  ████████████████  ← BLOCKED by body
  Row E  ████████████████  ← BLOCKED by body
         ═══ center gap ═══
  Row F  ████████████████  ← BLOCKED by body
  Row G  ████████████████  ← BLOCKED by body
  Row H  ████████████████  ← BLOCKED by body
  Row I  ████████████████  ← BLOCKED by body
  Row J  ■ ■ ■ ■ ■ ■ ■    ← ESP32 RIGHT PINS (no free row below)

  (-) bus  ───────────
  (+) bus  ═══════════
```

**Implication for wiring:**
- Left-side pins (3V3, GPIO 25, GPIO 34, GPIO 26, etc.) → accessible via **Row A**
- Right-side pins (GND, GPIO 23, etc.) → must use **M-F jumper wires** clipped onto header pins (no free row available)

### ESP32 Pinout (as placed on breadboard)

```
  Col: 1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19

  B: ╔═══════════════════════════════════════════════════════════════════════════╗
     ║ 3V3 EN  VP  VN  34  35  32  25  26  27  14  12 GND SD2 SD2 SD3 CMD  5V  ║ ← LEFT
     ║                   [USB►]              ESP32                              ║
     ║ GND  23  22  TX  RX  21 GND  19  18   5  17  16   4   0   2  15 SD1 SD0 ║ ← RIGHT
  J: ╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## Step 2: USB Connection & Initial Power Test

### What We Did

Connected the ESP32 to the PC using a micro-USB cable.

### Observation

When plugged in:
- The **blue LED** (GPIO 2) flashed **twice** and then turned off
- This indicates the ESP32 received power and executed its factory boot sequence — **completely normal behavior**
- Windows played the USB connection "ba-dum" sound — confirming the data cable is working (not a charge-only cable)

### Concern Addressed

> *"It turned on, flashing, and then off"*

**Resolution:** The blue LED flashing twice and turning off is the ESP32's factory firmware booting. The board was receiving power correctly with no short circuits. A steady red power LED (if present on the board) confirms constant power delivery.

---

## Step 3: Driver Installation (CP2102)

### The Problem

After plugging in the ESP32:
- Arduino IDE's **Tools → Port** menu was **greyed out** (could not be clicked)
- The ESP32 was not recognized as a serial device

### Diagnosis

Opened **Windows Device Manager** and found:

```
Other devices
  └── ⚠️ CP2102 USB to UART Bridge Controller    ← Yellow warning triangle!
```

The ESP32's onboard USB-to-Serial chip (Silicon Labs **CP2102**) was detected by Windows, but the required driver was not installed.

### Solution

1. **Right-clicked** on `CP2102 USB to UART Bridge Controller` in Device Manager
2. Selected **"Update driver"**
3. Selected **"Search automatically for drivers"**
   - *Alternative: Download the official driver from [Silicon Labs CP210x VCP Drivers](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers), unzip, and point "Browse my computer" to the unzipped folder*
4. Driver installed successfully

### Result

After installation:
- The yellow triangle **disappeared**
- Device moved from "Other devices" to:

```
Ports (COM & LPT)
  └── ✅ Silicon Labs CP210x USB to UART Bridge (COM6)
```

- Arduino IDE's **Tools → Port** now showed **COM6** and was clickable

---

## Step 4: Arduino IDE Setup

### 4.1: Install ESP32 Board Package

1. Opened **Arduino IDE**
2. Went to **Tools → Board → Boards Manager**
3. Searched for **"esp32"**
4. Found **"esp32 by Espressif Systems"** — clicked **Install**
   - Package version: **3.3.7**
   - Download size: ~200MB
   - Includes toolchains, libraries, and all ESP32 board definitions

### 4.2: Configure Board Settings

Navigated to **Tools** menu and set the following:

| Setting | Value | How to Set |
|---------|-------|------------|
| **Board** | `ESP32 Dev Module` | Tools → Board → esp32 → ESP32 Dev Module |
| **Port** | `COM6` | Tools → Port → COM6 |
| **Upload Speed** | `921600` | Default — left unchanged |
| **CPU Frequency** | `240MHz (WiFi/BT)` | Default — left unchanged |
| **Flash Frequency** | `80MHz` | Default — left unchanged |
| **Flash Mode** | `QIO` | Default — left unchanged |
| **Flash Size** | `4MB (32Mb)` | Default — left unchanged |
| **Partition Scheme** | `Default 4MB with spiffs` | Default — left unchanged |

> **Only Board and Port needed to be changed.** All other settings were left at their defaults.

---

## Step 5: First Code Upload — Blink Test

### The Code (C/C++)

This was our first program uploaded to the ESP32. It blinks the onboard blue LED (connected to GPIO 2) and prints a message to the serial monitor:

```cpp
void setup() {
  pinMode(2, OUTPUT);        // Set GPIO 2 (blue LED) as output
  Serial.begin(115200);      // Start serial communication at 115200 baud
  Serial.println("ESP32 is alive on COM6!");
}

void loop() {
  digitalWrite(2, HIGH);     // Turn blue LED ON
  delay(500);                // Wait 500 milliseconds
  digitalWrite(2, LOW);      // Turn blue LED OFF
  delay(500);                // Wait 500 milliseconds
  Serial.println("Blink!");  // Print to serial monitor
}
```

### Compile Output (Verify)

```
In file included from ...esp_bt.h:16,
  from ...esp32-hal-bt.c:30:
...esp_bredr_cfg.h:18:9: note: '#pragma message: BT: forcing BR/EDR max sync conn eff
  to 1 (Bluedroid HFP requires SCO/eSCO)'

Sketch uses 283472 bytes (21%) of program storage space. Maximum is 1310720 bytes.
Global variables use 22068 bytes (6%) of dynamic memory, leaving 305612 bytes for
  local variables. Maximum is 327680 bytes.
```

> The `#pragma message` lines are **informational notes** from the Bluetooth library — NOT errors. The compile was successful.

### Upload Output

```
esptool v5.1.0
Serial port COM6:
Connecting.....
Connected to ESP32 on COM6:
Chip type:          ESP32-D0WD-V3 (revision v3.1)
Features:           Wi-Fi, BT, Dual Core + LP Core, 240MHz, Vref calibration in eFuse,
                    Coding Scheme None
Crystal frequency:  40MHz
MAC:                f8:b3:b7:20:30:c0

Uploading stub flasher...
Running stub flasher...
Stub flasher running.
Changing baud rate to 921600...
Changed.

Configuring flash size...
Flash will be erased from 0x00001000 to 0x00007fff...
Flash will be erased from 0x00008000 to 0x00008fff...
Flash will be erased from 0x0000e000 to 0x0000ffff...
Flash will be erased from 0x00010000 to 0x00055fff...

Compressed 25024 bytes to 16034...
Writing at 0x00001000 [==============================] 100.0% 16034/16034 bytes...
Wrote 25024 bytes (16034 compressed) at 0x00001000 in 0.5 seconds (441.9 kbit/s).
Hash of data verified.

Compressed 3072 bytes to 146...
Writing at 0x00008000 [==============================] 100.0% 146/146 bytes...
Wrote 3072 bytes (146 compressed) at 0x00008000 in 0.0 seconds (574.7 kbit/s).
Hash of data verified.

Compressed 8192 bytes to 47...
Writing at 0x0000e000 [==============================] 100.0% 47/47 bytes...
Wrote 8192 bytes (47 compressed) at 0x0000e000 in 0.1 seconds (1046.9 kbit/s).
Hash of data verified.

Compressed 283616 bytes to 155797...
Writing at 0x00010000 [==>                           ]  10.5% 16384/155797 bytes...
Writing at 0x0001bcf8 [=====>                        ]  21.0% 32768/155797 bytes...
Writing at 0x00028f25 [========>                     ]  31.5% 49152/155797 bytes...
Writing at 0x0002e4c0 [===========>                  ]  42.1% 65536/155797 bytes...
Writing at 0x000340f9 [==============>               ]  52.6% 81920/155797 bytes...
Writing at 0x00039475 [=================>            ]  63.1% 98304/155797 bytes...
Writing at 0x0003e974 [=====================>        ]  73.6% 114688/155797 bytes...
Writing at 0x0004404c [========================>     ]  84.1% 131072/155797 bytes...
Writing at 0x0004c2cc [===========================>  ]  94.6% 147456/155797 bytes...
Writing at 0x00052434 [==============================] 100.0% 155797/155797 bytes...
Wrote 283616 bytes (155797 compressed) at 0x00010000 in 2.6 seconds (857.6 kbit/s).
Hash of data verified.

Hard resetting via RTS pin...
```

### Result

✅ **Blue LED started blinking every 500ms immediately after upload completed.**

---

## Step 6: Serial Monitor Verification

### How to Open

1. In Arduino IDE: **Tools → Serial Monitor** (or click the 🔍 magnifying glass icon)
2. Set baud rate to **115200** (dropdown at bottom-right of the Serial Monitor window)

> ⚠️ **The baud rate must match the value set in the code:** `Serial.begin(115200)`. If set to a different value (e.g., 9600), the output will appear as garbled/unreadable characters.

### Expected Serial Output

```
ESP32 is alive on COM6!
Blink!
Blink!
Blink!
Blink!
...  (repeats every 1 second)
```

Each `Blink!` line appears every 1 second (500ms ON + 500ms OFF = 1 second per cycle).

---

## Difficulties Encountered & Solutions

### Issue 1: Breadboard Row Split Confusion

| | Detail |
|---|---|
| **Problem** | ESP32 body is wider than the breadboard center gap, causing an asymmetric 4 vs 5 (or 5 vs 4) row split instead of the expected symmetric placement |
| **Symptom** | One side of the breadboard under the ESP32 had no accessible free rows |
| **Concern** | Was the breadboard defective? Was the ESP32 too big? |
| **Solution** | This is **completely normal** for wide ESP32 DevKit boards. The board spans 9 of 10 rows, leaving only 1 free row. Sensors are placed in columns 20–64 where all 10 rows are fully open |

### Issue 2: Arduino IDE Port Greyed Out

| | Detail |
|---|---|
| **Problem** | After plugging in the ESP32, the `Tools → Port` menu was greyed out and unclickable |
| **Symptom** | Could not select COM port to upload code |
| **Root Cause** | The CP2102 USB-to-UART Bridge chip on the ESP32 was missing its Windows driver |
| **Diagnosis** | Device Manager showed `CP2102 USB to UART Bridge Controller` under "Other devices" with a yellow ⚠️ warning triangle |
| **Solution** | Right-click → Update driver → Search automatically (or download from [Silicon Labs](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)) |
| **Result** | Driver installed, device moved to `Ports (COM & LPT)` as **COM6**, port became selectable in Arduino IDE |

### Issue 3: Compile Warnings (Not Errors)

| | Detail |
|---|---|
| **Problem** | Compilation output showed `#pragma message` notes about Bluetooth |
| **Symptom** | Appeared like error messages in the console |
| **Solution** | These are **informational notes**, not errors. The key indicator of success is the final line: `Sketch uses X bytes (Y%) of program storage space` |

---

## ESP32 Chip Specifications

These details were automatically reported by `esptool` during the upload process:

| Property | Value |
|----------|-------|
| **Chip Type** | ESP32-D0WD-V3 |
| **Revision** | v3.1 |
| **Features** | Wi-Fi, Bluetooth, Dual Core + LP Core |
| **CPU Speed** | 240MHz |
| **Crystal Frequency** | 40MHz |
| **MAC Address** | `f8:b3:b7:20:30:c0` |
| **Flash Size** | 4MB |
| **Calibration** | Vref calibration in eFuse |
| **Coding Scheme** | None |
| **esptool Version** | v5.1.0 |
| **Upload Speed** | 921600 baud (857.6 kbit/s actual throughput) |

---

## Phase 1 Conclusion

### What Was Achieved

1. ✅ ESP32-WROOM-32 (38-pin) physically placed on GL No.12 breadboard
2. ✅ Breadboard row split (4 vs 5) understood and documented
3. ✅ USB data cable confirmed working
4. ✅ CP2102 driver installed — COM6 recognized
5. ✅ Arduino IDE configured with ESP32 Dev Module board package v3.3.7
6. ✅ First C/C++ program (blink test) compiled, uploaded, and running
7. ✅ Blue LED (GPIO 2) blinking as programmed
8. ✅ Serial communication verified at 115200 baud

### What Comes Next — Phase 2: Sensor Wiring

With the ESP32 proven to be fully functional, the next step is to:

1. Wire the **power rails** (3.3V and GND from ESP32 to breadboard bus strips)
2. Connect the **DHT22** temperature & humidity sensor (columns 25–27)
3. Connect the **Water Sensor** (via M-F jumper wires to GPIO 34)
4. Upload the full **P-WOS firmware** (`pwos_wokwi.ino`)
5. Verify live sensor readings via Serial Monitor

> See [breadboard_assembly.md](../guides/breadboard_assembly.md) for the complete wiring guide.  
> See [hardware_progress.md](hardware_progress.md) for the phase tracking checklist.
