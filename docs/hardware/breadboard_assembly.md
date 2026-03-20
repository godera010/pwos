# P-WOS Breadboard Assembly Guide

A step-by-step tutorial for placing and wiring all components on a breadboard.

---

## What You Need

| # | Item | Qty |
|---|------|-----|
| 1 | ESP32 DevKit V1 | 1 |
| 2 | 830-point Breadboard | 1 |
| 3 | DHT22 Sensor | 1 |
| 4 | Capacitive Soil Moisture Sensor | 1 |
| 5 | 5V Single-Channel Relay Module | 1 |
| 6 | 10kΩ Resistor (optional, for DHT22 pull-up) | 1 |
| 7 | Jumper Wires (Male-to-Male, Male-to-Female) | ~12 |
| 8 | Micro-USB Cable + 5V 2A USB Charger | 1 |
| 9 | Mini Water Pump + Tubing | 1 |
| 10 | East Dragon Adapter (pump power) | 1 |

---

## Understanding Your Breadboard

```
          BREADBOARD (830 tie-points)
     ┌────────────────────────────────────────┐
     │  (+) ● ● ● ● ● ● ● ● ● ● ● ● ● (+) │ ← Power Rail (RED)
     │  (-) ● ● ● ● ● ● ● ● ● ● ● ● ● (-) │ ← Ground Rail (BLUE)
     │                                        │
     │  a  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │
     │  b  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │  Each COLUMN of 5
     │  c  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │  holes (a-e) is
     │  d  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │  connected internally
     │  e  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │
     │     ─ ─ ─ ─ CENTER GAP ─ ─ ─ ─ ─ ─   │ ← Gap separates sides
     │  f  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │
     │  g  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │  Each COLUMN of 5
     │  h  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │  holes (f-j) is
     │  i  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │  connected internally
     │  j  ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │
     │                                        │
     │  (+) ● ● ● ● ● ● ● ● ● ● ● ● ● (+) │ ← Power Rail (RED)
     │  (-) ● ● ● ● ● ● ● ● ● ● ● ● ● (-) │ ← Ground Rail (BLUE)
     └────────────────────────────────────────┘
          1  2  3  4  5 ... ... ... 28 29 30

     KEY RULES:
     • Rows a-e are connected horizontally (same column)
     • Rows f-j are connected horizontally (same column)
     • The center gap SEPARATES a-e from f-j
     • Power rails (+/-) run the full length of the board
     • The ESP32 straddles the center gap
```

---

## Step 1: Place the ESP32

The ESP32 DevKit has **two rows of pins** (15 pins on each side). It straddles the center gap so each pin gets its own column.

```
     Breadboard Columns:   1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
                          ┌──────────────────────────────────────────────
     Row a-e (top):       │     ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●
                          │     ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║
                          │  ┌──╨──╨──╨──╨──╨──╨──╨──╨──╨──╨──╨──╨──╨──┐
     LEFT PINS ──────────▶│  │ 3V3 EN 36 39 34 35 32 33 25 26 27 14 12 │
                          │  │              ESP32 DevKit                │
                          │  │             ┌──[USB]──┐                  │
                          │  │             └─────────┘                  │
                          │  │              ESP32 DevKit                │
     RIGHT PINS ─────────▶│  │ GND 23  22 TX0 RX0 21 19 18  5  17 16  4│
                          │  └──╥──╥──╥──╥──╥──╥──╥──╥──╥──╥──╥──╥──╥──┘
                          │     ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║  ║
     Row f-j (bottom):    │     ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●  ●
                          └──────────────────────────────────────────────

     NOTE: Pin layout varies by board! Check YOUR board's silkscreen labels.
     The labels printed next to each pin on your actual ESP32 are the truth.
```

### How to Do It

1. **Orient the ESP32** with the **USB port facing LEFT** (toward column 1)
2. **Gently press** the ESP32 pins into the breadboard, straddling the center gap
3. The **left row of pins** goes into row `e` (top section)
4. The **right row of pins** goes into row `f` (bottom section)
5. **Don't force it** — wiggle gently if the pins are tight

> ⚠️ **IMPORTANT:** The pin labels on **your actual ESP32 board** are what matter. The diagram above is typical but your board's layout might differ slightly. Always read the silkscreen printed on the board itself.

---

## Step 2: Set Up Power Rails

Connect the ESP32's power pins to the breadboard power rails.

```
     ESP32 Pin          Breadboard
     ─────────          ──────────
     3V3  ───────────── (+) Red Power Rail (top)
     GND  ───────────── (-) Blue Ground Rail (top)
```

### How to Do It

1. Find the **3V3** pin on your ESP32 (usually top-left area)
2. Use a **red jumper wire** from the 3V3 pin's column (any hole a-e in that column) to the top **(+) red rail**
3. Find the **GND** pin on your ESP32 (usually bottom-left area)
4. Use a **black jumper wire** from the GND pin's column (any hole f-j in that column) to the top **(-) blue rail**

Now the top power rail has **3.3V** and **GND** available anywhere along its length.

```
     (+) ── 3.3V ─── ● ● ● ● ● ● ● ● ● ● ● ● ● ── Available everywhere
     (-) ── GND ──── ● ● ● ● ● ● ● ● ● ● ● ● ● ── Available everywhere
```

---

## Step 3: Connect the DHT22 Sensor

The DHT22 has **3 or 4 pins** (depending on module type):

```
     DHT22 Module (3-pin breakout):
     ┌─────────┐
     │  DHT22  │
     │ ┌─────┐ │
     │ │     │ │
     │ └─────┘ │
     │  ●  ●  ●│
     └──┬──┬──┬┘
        │  │  │
       VCC DATA GND

     If you have a 4-pin raw DHT22:
     Pin 1 = VCC, Pin 2 = DATA, Pin 3 = NC (unused), Pin 4 = GND
```

### Wiring

| DHT22 Pin | Connects To | Wire Color |
|-----------|-------------|------------|
| **VCC** | (+) Power Rail (3.3V) | Red |
| **DATA** | ESP32 **GPIO 25** | Yellow/Green |
| **GND** | (-) Ground Rail | Black |

### Optional Pull-Up Resistor

Add a **10kΩ resistor** between **VCC** and **DATA** for reliable readings:

```
     (+) 3.3V Rail ──┬──── DHT22 VCC
                     │
                  [10kΩ]   ← Resistor bridges VCC to DATA
                     │
     GPIO 25 ────────┴──── DHT22 DATA
     
     (-) GND Rail ──────── DHT22 GND
```

### How to Do It

1. **Place the DHT22** on the breadboard to the RIGHT of the ESP32 (around column 20-22)
2. If it's a breakout module with pins, push the pins into empty columns
3. **Red wire:** DHT22 VCC pin → (+) power rail
4. **Black wire:** DHT22 GND pin → (-) ground rail
5. **Yellow wire:** DHT22 DATA pin → same column as ESP32's GPIO 25 pin
6. **Resistor (optional but recommended):** Bridge between the VCC column and DATA column of the DHT22

---

## Step 4: Connect the Soil Moisture Sensor

The capacitive soil moisture sensor has a cable with **3 wires**:

```
     Soil Moisture Sensor:
     ┌──────────────┐
     │   ████████   │   ← Sensing area (goes in soil)
     │   ████████   │
     │   ████████   │
     │              │
     │   ┌──────┐   │
     │   │ chip │   │   ← Electronics
     │   └──────┘   │
     │  ●    ●    ● │
     └──┬────┬────┬─┘
        │    │    │
       VCC  GND  AOUT (Analog Output)
```

### Wiring

| Sensor Wire | Connects To | Wire Color |
|-------------|-------------|------------|
| **VCC** | (+) Power Rail (3.3V) | Red |
| **GND** | (-) Ground Rail | Black |
| **AOUT** | ESP32 **GPIO 34** | Blue/White |

### How to Do It

1. The soil sensor has a cable — use **Male-to-Male jumper wires** or plug directly if the connector fits
2. **Red wire:** Sensor VCC → (+) power rail
3. **Black wire:** Sensor GND → (-) ground rail
4. **Blue wire:** Sensor AOUT → same column as ESP32's GPIO 34 pin

> 💡 **TIP:** GPIO 34 is an **input-only** ADC pin on the ESP32, perfect for reading analog sensors.

---

## Step 5: Connect the Relay Module

The relay module has **3 control pins** on one side and **3 screw terminals** on the other:

```
     Relay Module:
     ┌──────────────────────────┐
     │                          │
     │  ┌──────┐  [LED] [LED]  │
     │  │RELAY │               │
     │  │      │               │
     │  └──────┘               │
     │                          │
     │  ●      ●      ●        │  ← Control Pins (bottom or side)
     └──┬──────┬──────┬────────┘
        │      │      │
       VCC    GND     IN (Signal)
     
     Screw Terminals (other side):
     ┌──┐  ┌──┐  ┌──┐
     │NO│  │COM│  │NC│
     └──┘  └──┘  └──┘
      │      │      │
      │      │      └── NC = Normally Closed (don't use)
      │      └── COM = Common (power input)
      └── NO = Normally Open (connects to COM when relay activates)
```

### Wiring — Control Side (to ESP32)

| Relay Pin | Connects To | Wire Color |
|-----------|-------------|------------|
| **VCC** | ESP32 **VIN** pin (5V from USB) | Red |
| **GND** | (-) Ground Rail | Black |
| **IN** | ESP32 **GPIO 26** | Orange |

> ⚠️ **The relay needs 5V**, not 3.3V! Use the ESP32's **VIN** pin, which outputs 5V directly from USB. Do NOT use the 3.3V power rail for the relay.

### How to Do It

1. The relay module is usually too big for the breadboard — **place it beside the breadboard**
2. Use **Male-to-Female jumper wires** to connect (female end plugs onto relay pins)
3. **Red wire:** Relay VCC → ESP32 VIN pin column
4. **Black wire:** Relay GND → (-) ground rail
5. **Orange wire:** Relay IN → same column as ESP32's GPIO 26 pin

---

## Step 6: Wire the Pump Circuit (Separate Power)

The pump gets its own power from the East Dragon adapter, switched by the relay.

```
     PUMP CIRCUIT (completely separate from ESP32 power):
     
     East Dragon Adapter
          │
          ├── (+) wire ──────── Relay COM terminal (screw in)
          │
          │                     Relay NO terminal ──── Pump (+) wire
          │
          └── (-) wire ──────────────────────────── Pump (-) wire


     When ESP32 activates GPIO 26:
       → Relay clicks ON
       → NO connects to COM
       → Adapter power flows through pump
       → Pump runs!
     
     When ESP32 deactivates GPIO 26:
       → Relay clicks OFF
       → NO disconnects from COM
       → No power to pump
       → Pump stops
```

### How to Do It

1. **Identify the adapter wires** — strip ~5mm of insulation from each wire if not already stripped
2. Usually: wire with a **white stripe or text = positive (+)**, plain wire = negative (-)
3. **If unsure**: use a multimeter to check polarity, or test with the pump directly for a second
4. **Screw the (+) adapter wire** into the relay **COM** terminal
5. **Connect a wire** from relay **NO** terminal to the **pump's (+) wire** (red)
6. **Connect the pump's (-) wire** (black) to the **adapter's (-) wire**
7. **Twist and tape** or use wire connectors for secure connections

> ⚠️ **SAFETY:** Make sure the adapter is UNPLUGGED while you're wiring the screw terminals!

---

## Complete Wiring Summary

```
     ┌─────────────────── BREADBOARD ────────────────────┐
     │                                                    │
     │  (+) 3.3V Rail ◄── ESP32 3V3 pin                  │
     │  (-) GND Rail  ◄── ESP32 GND pin                  │
     │                                                    │
     │  ┌──────────────────────────────────────────────┐  │
     │  │              ESP32 DevKit V1                 │  │
     │  │         (powered via USB cable)              │  │
     │  │                                              │  │
     │  │  GPIO 25 ─── yellow ──▶ DHT22 DATA           │  │
     │  │  GPIO 34 ─── blue ────▶ Soil Sensor AOUT     │  │
     │  │  GPIO 26 ─── orange ──▶ Relay IN             │  │
     │  │  VIN ─────── red ─────▶ Relay VCC (5V)       │  │
     │  └──────────────────────────────────────────────┘  │
     │                                                    │
     │  DHT22:      VCC → (+) rail    GND → (-) rail     │
     │  Soil:       VCC → (+) rail    GND → (-) rail     │
     │  Relay:      GND → (-) rail                        │
     │                                                    │
     └────────────────────────────────────────────────────┘

     ┌─────────── PUMP CIRCUIT (separate) ────────────────┐
     │                                                     │
     │  East Dragon (+) ──▶ Relay COM                      │
     │                      Relay NO ──▶ Pump (+)          │
     │  East Dragon (-) ──────────────▶ Pump (-)           │
     │                                                     │
     └─────────────────────────────────────────────────────┘
```

---

## Wire Color Guide

| Wire Color | Purpose | From → To |
|------------|---------|-----------|
| 🔴 Red | 3.3V Power | ESP32 3V3 → (+) rail |
| ⚫ Black | Ground | ESP32 GND → (-) rail |
| 🔴 Red | Relay 5V | ESP32 VIN → Relay VCC |
| 🟡 Yellow | DHT22 Data | ESP32 GPIO 25 → DHT22 DATA |
| 🔵 Blue | Soil Data | ESP32 GPIO 34 → Soil AOUT |
| 🟠 Orange | Relay Signal | ESP32 GPIO 26 → Relay IN |
| ⚫ Black | DHT22 GND | DHT22 GND → (-) rail |
| ⚫ Black | Soil GND | Soil GND → (-) rail |
| ⚫ Black | Relay GND | Relay GND → (-) rail |

---

## Checklist Before Powering On

- [ ] ESP32 straddles the center gap properly (no bent pins)
- [ ] 3V3 connected to (+) rail, GND to (-) rail
- [ ] DHT22: VCC → (+), GND → (-), DATA → GPIO 25
- [ ] Soil sensor: VCC → (+), GND → (-), AOUT → GPIO 34
- [ ] Relay: VCC → VIN (5V!), GND → (-), IN → GPIO 26
- [ ] Pump: Adapter (+) → COM, NO → Pump (+), Adapter (-) → Pump (-)
- [ ] No loose wires or short circuits
- [ ] Pump adapter is UNPLUGGED during assembly
- [ ] USB cable connected to ESP32

---

## Powering On (Order Matters!)

1. **Double-check all connections** one more time
2. **Plug USB cable** into ESP32 → blue LED should light up
3. **Open Serial Monitor** (115200 baud) → verify sensor readings
4. **Calibrate soil sensor** → see [hardware_setup.md](hardware_setup.md#7-calibrate-soil-sensor)
5. **Only then plug in the pump adapter** → test with `PUMP ON` command in Serial Monitor
6. Run `start_pwos.bat` → select Hardware → USB mode

---

## Common Mistakes to Avoid

| Mistake | What Happens | Fix |
|---------|-------------|-----|
| ESP32 pins not in center gap | Pins short-circuit | Re-seat ESP32, one row each side of gap |
| Using 3.3V for relay | Relay doesn't click | Use VIN (5V) for relay VCC |
| Using 5V for DHT22/Soil | Can damage sensors over time | Use 3.3V from (+) rail |
| Forgetting pull-up resistor on DHT22 | Intermittent read errors | Add 10kΩ between VCC and DATA |
| Pump wired to ESP32 power | ESP32 resets/browns out | Always use separate power for pump |
| Wrong relay terminal (NC instead of NO) | Pump runs when it should be off | Use NO (Normally Open) terminal |
| Adapter polarity reversed | Pump spins backward (or not at all) | Swap the + and - wires |
