# P-WOS Breadboard Assembly Guide

Schematics for the **GL No.12** breadboard with the hardware we have.

> See [breadboard.md](breadboard.md) for the raw board layout reference.

---

## Your Components

| # | Item | Status |
|---|------|--------|
| 1 | ESP32-WROOM-32 DevKit (**38-pin — 19 per side**) | ✅ |
| 2 | GL No.12 Breadboard (840 holes, 64 columns) | ✅ |
| 3 | DHT11 Temperature & Humidity Sensor | ✅ |
| 4 | Water Sensor (resistive, used as moisture sensor) | ✅ |
| 5 | Mini DC 5V Submersible Pump | ✅ |
| 6 | Jumper Wires (M-M + M-F) | ✅ |
| 7 | USB Cable (Micro-USB) | ✅ |
| 8 | East Dragon AC/DC Adapter (external pump power) | ✅ |
| 9 | 5V Relay Module | ❌ **Missing** |

---

## Your GL No.12 Breadboard Layout

This is the **exact layout** of your board. All schematics below reference these rows and columns.

```
                                                              BusBoard.com / GL No.12
┌──────────────────────────────────────────────────────────────────────┐
│-    ─────────────────────────────  ─────────────────────────────    -│  ← BLUE (−) GND
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │  ← BUS (grouped 5s)
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │  ← BUS (grouped 5s)
│+    ═════════════════════════════  ═════════════════════════════    +│  ← RED (+) 3.3V
│     1   5   10   15   20   25   30   35   40   45   50   55   60     │
│A  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  J│
│B  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  I│
│C  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  H│
│D  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  G│
│E  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  F│
│                GL No.12                    BREADBOARD                │
│F  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  E│
│G  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  D│
│H  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  C│
│I  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  B│
│J  □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□□  A│
│    60   55   50   45   40   35   30   25   20   15   10    5   1     │
│+    ═════════════════════════════  ═════════════════════════════    +│  ← RED (+)
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │  ← BUS
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │  ← BUS
│-    ─────────────────────────────  ─────────────────────────────    -│  ← BLUE (−) GND
└──────────────────────────────────────────────────────────────────────┘

KEY:
  ═══  Red  (+) power rail — SPLIT at center (left 25 + right 25 holes)
  ───  Blue (−) ground rail — SPLIT at center (left 25 + right 25 holes)
  A–E  Top terminal rows (each column of 5 holes A–E is connected)
  F–J  Bottom terminal rows (each column of 5 holes F–J is connected)
  Row labels are MIRRORED: left edge reads A/B/C/D/E/F/G/H/I/J
                           right edge reads J/I/H/G/F/E/D/C/B/A
  1–64 Column numbers (top: left→right, bottom: right→left — MIRRORED)

  ⚠️  Bus rails are SPLIT at center! Bridge with a jumper if needed.
```

---

## ESP32 Pin Map (38-pin DevKit — 19 per side)

> ⚠️ **This is YOUR exact board** as verified from photos of your silkscreen labels.
> **Pin 1 (USB end) = 5V, Pin 19 (far end) = 3V3.**

```
                        ┌──────────────────────────────────────┐
                        │         ┌───[USB]───┐                │
                        │         └───────────┘                │
          5V (VIN)      │ ●  1                           1  ● │  CLK          ⛔
   GPIO 11 (CMD)   ⛔   │ ●  2                           2  ● │  SD0          ⛔
   GPIO 10 (SD3)   ⛔   │ ●  3                           3  ● │  SD1          ⛔
   GPIO 9  (SD2)   ⛔   │ ●  4                           4  ● │  GPIO 15
      GPIO 13           │ ●  5                           5  ● │  GPIO 2 (LED)
      GND               │ ●  6                           6  ● │  GPIO 0 (BOOT)
      GPIO 12           │ ●  7                           7  ● │  GPIO 4
      GPIO 14           │ ●  8                           8  ● │  GPIO 16
      GPIO 27           │ ●  9                           9  ● │  GPIO 17
   ►  GPIO 27           │ ● 10                          10  ● │  GPIO 5
   ►  GPIO 14           │ ● 11                          11  ● │  GPIO 18
      GPIO 23           │ ● 12                          12  ● │  GPIO 19
      GPIO 32           │ ● 13                          13  ● │  GND
      GPIO 35           │ ● 14                          14  ● │  GPIO 21
   ►  GPIO 34 (ADC)     │ ● 15                          15  ● │  RXD (RX0)
      GPIO 39 (SN/VN)   │ ● 16                          16  ● │  TXD (TX0)
      GPIO 36 (SP/VP)   │ ● 17                          17  ● │  GPIO 22
                  EN    │ ● 18                          18  ● │  GPIO 23
                 3V3    │ ● 19                          19  ● │  GND
                        └──────────────────────────────────────┘

  ► Pins we use:
    GPIO 34  = Water Sensor signal (analog input)  — Left pin 15  → Col 15
    GPIO 14  = DHT11 data (digital)                — Left pin 8  → Col 8
    GPIO 27  = Relay IN (future)                   — Left pin 9  → Col 9
    GPIO 2   = Onboard LED (built-in)              — Right pin 5  → Col 5
    3V3      = 3.3V for sensors                    — Left pin 19  → Col 19
    GND      = Common ground                       — Left pin 6   → Col 6
    5V (VIN) = 5V from USB (for relay — future)    — Left pin 1   → Col 1
```

> ⚠️ **Pins 1–4 on the left (5V, CMD, SD3, SD2) and pins 1–3 on the right (CLK, SD0, SD1) are flash/internal pins. Do NOT connect sensors to these — they may cause crashes.**

---

## The 5 vs 4 Row Split — THIS IS NORMAL ✅

When you place the ESP32 on the breadboard, its body is **so wide** that it covers one side of the center gap **completely** (all 5 rows) and **nearly covers** the other side (4 of 5 rows). This means you have **only 1 free row total** under the ESP32 footprint.

Depending on how you push it in, you get one of two orientations:

```
  ════════════════════════════════════════════════════════════════════
  ORIENTATION A:  "4 vs 5"  — Free row on TOP (Row A)
  ════════════════════════════════════════════════════════════════════

  (+) bus  ═══════════     ← Red power rail
  (-) bus  ───────────     ← Blue ground rail

  Row A  ○ ○ ○ ○ ○ ○ ○    ← FREE ✅ (only accessible row!)
  Row B  ■ ■ ■ ■ ■ ■ ■    ← ESP32 LEFT PINS go here
  Row C  ████████████████  ← BLOCKED by ESP32 body
  Row D  ████████████████  ← BLOCKED by ESP32 body
  Row E  ████████████████  ← BLOCKED by ESP32 body
         ═══ center gap ═══
  Row F  ████████████████  ← BLOCKED by ESP32 body
  Row G  ████████████████  ← BLOCKED by ESP32 body
  Row H  ████████████████  ← BLOCKED by ESP32 body
  Row I  ████████████████  ← BLOCKED by ESP32 body
  Row J  ■ ■ ■ ■ ■ ■ ■    ← ESP32 RIGHT PINS go here
                              (NO free row on this side — all 5 covered)
  (-) bus  ───────────
  (+) bus  ═══════════

  RESULT:  Top side = 4 rows used (B,C,D,E) → Row A is FREE
           Bottom side = 5 rows used (F,G,H,I,J) → NOTHING free


  ════════════════════════════════════════════════════════════════════
  ORIENTATION B:  "5 vs 4"  — Free row on BOTTOM (Row J)
  ════════════════════════════════════════════════════════════════════

  (+) bus  ═══════════
  (-) bus  ───────────

  Row A  ■ ■ ■ ■ ■ ■ ■    ← ESP32 LEFT PINS go here
                              (NO free row on this side — all 5 covered)
  Row B  ████████████████  ← BLOCKED by ESP32 body
  Row C  ████████████████  ← BLOCKED by ESP32 body
  Row D  ████████████████  ← BLOCKED by ESP32 body
  Row E  ████████████████  ← BLOCKED by ESP32 body
         ═══ center gap ═══
  Row F  ████████████████  ← BLOCKED by ESP32 body
  Row G  ████████████████  ← BLOCKED by ESP32 body
  Row H  ████████████████  ← BLOCKED by ESP32 body
  Row I  ■ ■ ■ ■ ■ ■ ■    ← ESP32 RIGHT PINS go here
  Row J  ○ ○ ○ ○ ○ ○ ○    ← FREE ✅ (only accessible row!)

  (-) bus  ───────────
  (+) bus  ═══════════

  RESULT:  Top side = 5 rows used (A,B,C,D,E) → NOTHING free
           Bottom side = 4 rows used (F,G,H,I) → Row J is FREE
```

### ⭐ Recommended: Use Orientation A (4 vs 5) — Row A free on top

**Why?** Row A is closest to the **top bus strips** (power/ground rails), making it easy to run short wires from the ESP32 pins to power.

- **Left pins (3V3 side) → Row B** (top half)
- **Right pins (GND side) → Row J** (bottom half, outermost row)
- **Free row = Row A only** (top side)

> ⚠️ **Critical:** You only have **1 free row** (Row A) to access ESP32 pins via the breadboard. For all other connections, you **must use M-F jumper wires** clipped directly onto the ESP32 header pins poking up from the top.

> 💡 **Columns 20–64** are completely clear of the ESP32 — all 10 rows (A–J) are fully accessible there. Place sensors in this free zone.

---

## PHASE 1 — Sensors Only (Build Now)

### Step 1: Place the ESP32

The ESP32 has **19 pins per side**. It occupies **columns 1–19** on the breadboard.

- **Push the ESP32 so the free row is on TOP** (Orientation A)
- **Left pins** go into **Row B** (columns 1–19)
- **Right pins** go into **Row J** (columns 1–19)
- **USB port faces LEFT** (toward column 1 / off the edge of the board)
- **Row A is your only free row** under the ESP32 — use it wisely!

> ⚠️ **If your ESP32 clicks into the "5 vs 4" orientation instead** (free row on bottom = Row J), that works too. Just mentally swap: wherever the instructions say "Row A", use "Row J" instead, and use M-F jumpers from the top-side pins since Row A won't be accessible.

```
  Col: 1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19
       ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║
  B: ╔═╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╧═══╗
     ║  5V CMD SD3 SD2 G13 GND G12 G14 G27 G27 G23 G32 G35 G34  SN  SP  EN 3V3 ║ ← LEFT
     ║  [USB►]                       ESP32                                          ║
     ║ CLK SD0 SD1 G15  G2  G0  G4 G16 G17  G5 G18 G19 GND G21 RXD TXD G22 G23 GND ║ ← RIGHT
  J: ╚═╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╤═══╝
       ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║   ║

  Each ESP32 pin occupies its own column (1–19).
  USB PORT IS ON THE LEFT (Column 1 side).

  PIN → COLUMN REFERENCE (YOUR ESP32 — VERIFIED FROM PHOTOS):
  ┌────────────────────────────────────┬────────────────────────────────────┐
  │ LEFT SIDE (Row B)                  │ RIGHT SIDE (Row J)                 │
  ├──────────┬─────────────────────────┼──────────┬─────────────────────────┤
  │ Col  1   │ 5V (VIN)               │ Col  1   │ CLK           ⛔       │
  │ Col  2   │ CMD (GPIO 11)  ⛔       │ Col  2   │ SD0           ⛔       │
  │ Col  3   │ SD3 (GPIO 10)  ⛔       │ Col  3   │ SD1           ⛔       │
  │ Col  4   │ SD2 (GPIO 9)   ⛔       │ Col  4   │ GPIO 15                │
  │ Col  5   │ GPIO 13                 │ Col  5   │ GPIO 2 (LED)           │
  │ Col  6   │ GND            ★        │ Col  6   │ GPIO 0 (BOOT)          │
  │ Col  7   │ GPIO 12                 │ Col  7   │ GPIO 4                  │
  │ Col  8   │ GPIO 14                 │ Col  8   │ GPIO 16                │
  │ Col  9   │ GPIO 27                 │ Col  9   │ GPIO 17                │
  │ Col 9   │ GPIO 27 ►               │ Col 9   │ GPIO 5                  │
  │ Col 8   │ GPIO 14 ►               │ Col 8   │ GPIO 18                │
  │ Col 12   │ GPIO 23                 │ Col 12   │ GPIO 19                │
  │ Col 13   │ GPIO 32                 │ Col 13   │ GND                     │
  │ Col 14   │ GPIO 35                 │ Col 14   │ GPIO 21                │
  │ Col 15   │ GPIO 34 (ADC) ►         │ Col 15   │ RXD (RX0)              │
  │ Col 16   │ GPIO 39 (SN/VN)         │ Col 16   │ TXD (TX0)              │
  │ Col 17   │ GPIO 36 (SP/VP)         │ Col 17   │ GPIO 22                │
  │ Col 18   │ EN                      │ Col 18   │ GPIO 23                │
  │ Col 19   │ 3V3            ★        │ Col 19   │ GND                     │
  └──────────┴─────────────────────────┴──────────┴─────────────────────────┘

  ► = Pin we use for P-WOS
  ★ = Power/ground pin we tap
  ⛔ = Internal flash SPI — do NOT connect anything
```

---

### Step 2: Set Up Power Rails

Connect 3.3V and GND from the ESP32 to the **top power rails**.

**Your wires:**
- **M-M** (pin on both ends): Both ends plug into breadboard holes. Use for ESP32 + DHT11.
- **M-F** (pin on one end, socket on the other): Socket clips onto a sensor pin. Use for water sensor.

**Why M-M for ESP32?** When the ESP32 is seated on the breadboard, its pins go **down into the holes**. There's nothing sticking up to clip onto. You access them through **Row A** (the only free row), which is electrically connected to the ESP32 pin in Row B below it.

```
  TOP POWER RAILS (the ones closest to Row A):

  (−) BLUE strip  ──────────────────  = GND
  (+) RED strip   ══════════════════  = 3.3V
                  1       6              19
  Row A: ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○ ○  ← FREE ROW
  Row B: ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  ← ESP32 LEFT PINS
               5V       GND                         3V3

  WIRE 1 — ⚪ White M-M (3.3V to power rail):
    Pin 1: Plug into Col 19, Row A  (this connects to 3V3 in Row B)
    Pin 2: Plug into Top (+) RED strip (any hole)

  WIRE 2 — 🟤 Brown M-M (GND to ground rail):
    Pin 1: Plug into Col 6, Row A  (this connects to GND in Row B)
    Pin 2: Plug into Top (−) BLUE strip (any hole)

  ⚠️  The bus strips are SPLIT at the center of the board.
      If you need power on both halves, bridge with a short jumper.
```

**After this step:** Any hole on the RED (+) strip = 3.3V, any hole on the BLUE (−) strip = GND.

---

### Step 3: Wire the DHT11

The DHT11 stays **off the breadboard** — just like the water sensor. It has 3 pins sticking out. Clip **M-F sockets** onto them.

```
  DHT11 MODULE (on breakout board):
  ┌──────────────────────────┐
  │                          │
  │      DHT11 Sensor        │
  │      (Blue Casing)       │
  │                          │
  │     ●      ●      ●     │
  └─────┬──────┬──────┬─────┘
        │      │      │      ← pins sticking OUT (clip sockets here!)
        S      +      −
     (Signal)(VCC)  (GND)

  ⚠️ Check YOUR sensor labels. Usually: S = Signal, Middle = VCC (+), - = GND.

  WIRING (all M-F — socket clips onto sensor pin, pin plugs into breadboard):
  ┌─────┬──────────────────────────────────────────────────────────────┐
  │ #   │ Description                                                    │
  ├─────┼──────────────────────────────────────────────────────────────┤
  │ 3   │ 🟢 Green M-F:  Socket on (+) ─► Pin into (+) RED strip    │
  │ 4   │ 🟤 Brown M-F:  Socket on (S) ─► Pin into Col 8, Row A    │
  │ 5   │ ⚪ White M-F:  Socket on (−) ─► Pin into (−) BLUE strip   │
  └─────┴──────────────────────────────────────────────────────────────┘

  💡 Wire 4: The pin end goes into Col 8, Row A. This connects
     to GPIO 14 (ESP32 left pin in Row B at the same column).

  CIRCUIT:

  (+) RED strip ◄──── 🟢 Green M-F ─── DHT11 + (VCC)

  Col 8, Row A (GPIO 14) ◄─ 🟤 Brown M-F ─ DHT11 S (Signal)

  (−) BLUE strip ◄─── ⚪ White M-F ──── DHT11 − (GND)
```

> 💡 **Pull-up resistor:** Your breakout board (black PCB) already has a 10kΩ resistor built-in. No extra components needed!

> 💡 **DHT11 vs DHT22:** Your blue sensor is a DHT11. It uses a different timing protocol than the white DHT22. Ensure your code uses `DHT11` or you will get `NaN` errors.

---

### Step 4: Wire the Water Sensor

The water sensor has 3 pins (**S**, **+**, **−**) with header pins sticking out. These are the ONLY pins you clip **M-F sockets** onto.

```
  WATER SENSOR MODULE:
  ┌──────────────────────────┐
  │  │ │ │ │ │ │ │ │ │ │    │  ← Exposed traces
  │  │ │ │ │ │ │ │ │ │ │    │    (dip in water/soil)
  │                          │
  │    ┌────────────────┐    │
  │    │   Electronics  │    │
  │    └────────────────┘    │
  │     ●      ●      ●     │
  └─────┬──────┬──────┬─────┘
        │      │      │      ← pins sticking OUT (you can clip sockets here!)
        S      +      −
     (Signal)(VCC)  (GND)

  ⚠️ Check YOUR sensor — pin order may differ. Read the PCB labels!

  WIRING (all M-F — socket clips onto sensor pin, pin plugs into breadboard):
  ┌─────┬──────────────────────────────────────────────────────────────┐
  │ #   │ Description                                                    │
  ├─────┼──────────────────────────────────────────────────────────────┤
  │ 6   │ 🔴 Red M-F:    Socket on (+) ─► Pin into (+) RED strip    │
  │ 7   │ 🟣 Purple M-F: Socket on (−) ─► Pin into (−) BLUE strip   │
  │ 8   │ 🔵 Blue M-F:   Socket on (S) ─► Pin into Col 15, Row A    │
  └─────┴──────────────────────────────────────────────────────────────┘

  💡 Wire 8: The pin end goes into Col 15, Row A. This connects
     to GPIO 34 (ESP32 left pin in Row B at the same column).

  CIRCUIT:

  (+) RED strip ◄──── 🔴 Red M-F ──── Water Sensor + (VCC)

  Col 15, Row A (GPIO 34) ◄─ 🔵 Blue M-F ─ Water Sensor S (Signal)

  (−) BLUE strip ◄─── 🟣 Purple M-F ── Water Sensor − (GND)
```

> 💡 **GPIO 34 is input-only** with a built-in ADC — perfect for reading the sensor's analog voltage.

---

### Phase 1 — Complete Board View

```
  Orientation A: "4 vs 5" — Row A free on top, bottom fully covered

                                                            GL No.12
┌──────────────────────────────────────────────────────────────────────┐
│(-)  ─────GY──────WT──────PR──────  ─────────────────────────────  (-)│
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │
│(+)  ═YW══════GN══════RD══════════  ═════════════════════════════  (+)│
│     1   5   10   15   20   25   30   35   40   45   50   55   60     │
│     │  │GY  │BN  │BL  │YW                                            │
│A   ·●··●····●····●····●··········●·DHT11··●···················J│  ← FREE ROW
│    ┌───┼──────────────────────────┼────┼──────────────────────────┐  │
│B   │5V │CMD SD3 SD2 G13 GND G12 G14│G27 G27│G23 G32 G35 G34│  │  ← LEFT PINS
│    │   │                          │   ▲   ▲          ▲           │  │
│    │   │  [USB►]   ESP32          │   │   │          │           │  │
│    │   │                          │  G27 G14        G34          │  │
│C   │   │  [███████ blocked by ESP32 body ████████████████████]   │ H│
│D   │   │  [███████ blocked by ESP32 body ████████████████████]   │ G│
│E   │   │  [███████ blocked by ESP32 body ████████████████████]   │ F│
│    │   │             ═══ center gap ═══                          │  │
│F   │   │  [███████ blocked by ESP32 body ████████████████████]   │ E│
│G   │   │  [███████ blocked by ESP32 body ████████████████████]   │ D│
│H   │   │  [███████ blocked by ESP32 body ████████████████████]   │ C│
│I   │   │  [███████ blocked by ESP32 body ████████████████████]   │ B│
│    │   │              ▼              │                           │  │
│J   │CLK│SD0 SD1 G15 G2 G0 G4 G16│G17 G5│G18 G19 GND G21 RXD│  │ A│  ← RIGHT PINS
│    └───┼─────────────────────────┼───┼────┼───────────────────────┘  │
│    60   55   50   45   40   35   30   25   20   15   10    5   1     │
│(+)  ═════════════════════════════  ═════════════════════════════  (+)│
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │
│     □□□□□ □□□□□ □□□□□ □□□□□ □□□□□  □□□□□ □□□□□ □□□□□ □□□□□ □□□□□     │
│(-)  ─────────────────────────────  ─────────────────────────────  (-)│
└──────────────────────────────────────────────────────────────────────┘
  ⚠️ Bottom side: ALL 5 rows (F–J) covered — NO free row!
     Row J has the right-side pins but nothing below it to tap.
     Access right-side pins via M-F jumpers clipped onto header pins.

  OFF-BOARD (via M-F jumpers):
  ┌─────────────────────────────────────────────────┐
  │  DHT11 SENSOR                                   │
  │    S ── 🟤 Brown  ──► Col 8, Row A (GPIO 14)   │
  │    + ── 🟢 Green  ──► Top (+) bus                │
  │    − ── ⚪ White  ──► Top (−) bus                │
  ├─────────────────────────────────────────────────┤
  │  WATER SENSOR                                   │
  │    S ── 🔵 Blue   ──► Col 15, Row A (GPIO 34)   │
  │    + ── 🔴 Red    ──► Top (+) bus                │
  │    − ── 🟣 Purple ──► Top (−) bus                │
  └─────────────────────────────────────────────────┘
```

---

### Phase 1 — Wire List (8 total)

| # | Color | Type | Pin 1 / Socket | Pin 2 / Hole | Purpose |
|---|-------|------|----------------|-------------|--------|
| 1 | 🟡 Yellow | **M-M** | Col 19, Row A | (+) RED strip | 3.3V power |
| 2 | ⚫ Grey | **M-M** | Col 6, Row A | (−) BLUE strip | Ground |
| 3 | 🟢 Green | **M-F** | Socket on DHT11 **(+)** | Pin in (+) RED strip | DHT11 VCC |
| 4 | 🟤 Brown | **M-F** | Socket on DHT11 **(S)** | Pin in Col 8, Row A | DHT11 DATA → GPIO 14 |
| 5 | ⚪ White | **M-F** | Socket on DHT11 **(−)** | Pin in (−) BLUE strip | DHT11 GND |
| 6 | 🔴 Red | **M-F** | Socket on Sensor **(+)** | Pin in (+) RED strip | Sensor VCC |
| 7 | 🟣 Purple | **M-F** | Socket on Sensor **(−)** | Pin in (−) BLUE strip | Sensor GND |
| 8 | 🔵 Blue | **M-F** | Socket on Sensor **(S)** | Pin in Col 15, Row A | Sensor → GPIO 34 |

**Total: 2× M-M + 6× M-F**

| Wire Type | Colors Used | Remaining Spare |
|-----------|-------------|----------------|
| M-M (7 available) | White, Brown, Green, Yellow, Grey | Purple, Blue |
| M-F (7 available) | Red, Purple, Blue | Brown, Grey, White, Green |

---

## PHASE 2 — Add Relay + Pump (When Acquired)

When you get a **5V single-channel relay module**, add these 3 wires:

### Relay Control Wiring (M-F jumpers — relay sits off-board)

| # | Color | Type | From | To | Purpose |
|---|-------|------|------|----|---------|
| 9 | ⚪ White | M-F | Socket on Relay **VCC** | Pin in Col 1, Row A (5V VIN) | Relay power (5V!) |
| 10 | 🟤 Brown | M-F | Socket on Relay **GND** | Pin in (−) BLUE strip | Relay ground |
| 11 | 🟢 Green | M-F | Socket on Relay **IN** | Pin in Col 9, Row A (GPIO 27) | Relay signal |

> ⚠️ Relay needs **5V** from VIN — NOT 3.3V. The VIN pin is at **Col 1** (nearest to USB).
> For the relay, you may need to run wires from a breadboard column to the relay module off-board.

### Pump Circuit (Separate Power — Through Relay)

```
  East Dragon Adapter                          Pump
       │                                         │
       ├── (+) ──► Relay COM terminal            │
       │           Relay NO terminal ──► Pump (+) ┘
       │
       └── (−) ─────────────────────► Pump (−)

  GPIO 27 HIGH → Relay activates → COM connects to NO → Pump runs
  GPIO 27 LOW  → Relay releases  → Circuit open      → Pump stops
```

> ⚠️ **Check adapter voltage with multimeter first!** Pump is rated 3–6V.
> If adapter is >6V, use a separate 5V USB charger or 4×AA battery pack instead.

---

## Startup Checklist

### Before Power-On

- [ ] ESP32 placed: 19 pins each side, straddling center gap. One side fully covered, 1 free row on the other
- [ ] No bent pins — all 38 pins inserted cleanly
- [ ] Wire 1:  🟡 Yellow **M-M** — Col 19 Row A → (+) RED strip (3.3V)
- [ ] Wire 2:  ⚫ Grey **M-M** — Col 6 Row A → (−) BLUE strip (GND)
- [ ] Wire 3:  🟢 Green **M-F** — Socket on DHT11 (+) → Pin in (+) RED strip
- [ ] Wire 4:  🟤 Brown **M-F** — Socket on DHT11 (S) → Pin in Col 8 Row A (DHT11 DATA → GPIO 14)
- [ ] Wire 5:  ⚪ White **M-F** — Socket on DHT11 (−) → Pin in (−) BLUE strip
- [ ] Wire 6:  🔴 Red **M-F** — Socket on Sensor + → Pin in (+) RED strip
- [ ] Wire 7:  🟣 Purple **M-F** — Socket on Sensor − → Pin in (−) BLUE strip
- [ ] Wire 8:  🔵 Blue **M-F** — Socket on Sensor S → Pin in Col 15 Row A (GPIO 34)
- [ ] No exposed wire ends touching
- [ ] USB port side is accessible (not blocked by wires)

### Power On

1. Plug USB into ESP32 and PC
2. Onboard blue LED (GPIO 2) should blink
3. Arduino IDE → Tools → Port → select COM port
4. Serial Monitor → **115200 baud**
5. Expected output:
   ```
   ============================================
     P-WOS ESP32 Firmware
     Commands: STATUS | READ | PUMP ON | PUMP OFF
   ============================================
   [READY] Publishing every 5s
   [DATA] Soil:XX.X%  Temp:XX.X°C  Hum:XX.X%  Pump:OFF
   ```
6. Type `STATUS` to get a reading on demand

### Calibrate Water Sensor

1. **In air (dry):** Note the soil % value in serial output
2. **Dipped in water:** Note the value
3. Update firmware constants:
   ```cpp
   #define SOIL_DRY   <dry_value>    // what you read dry
   #define SOIL_WET   <wet_value>    // what you read wet
   ```
4. Re-flash and verify readings make sense (0% = dry, 100% = wet)

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| ESP32 not straddling center gap | Short circuit / no power | Pins must be on opposite sides of center gap |
| 5v4 row split — one side fully covered? | Normal! | ESP32 is too wide — covers 5 rows on one side, 4 on the other. Only 1 free row total |
| 3.3V for relay | Relay doesn't click | Use VIN (5V from USB) for relay VCC |
| 5V for DHT11 or water sensor | Sensor damage | Use 3.3V rail only for sensors |
| Bus strip not bridged at center | Power only on half the board | Add short jumper across the split |
| Wrong GPIO column | No readings | Verify silkscreen labels on YOUR board |
| Pump on ESP32 power | ESP32 resets/browns out | Always use separate power for pump |
| NC terminal instead of NO | Pump runs when it shouldn't | Use NO (Normally Open) on relay |
| Using flash pins (SD0/SD1/SD2/SD3/CMD/CLK) | ESP32 crashes | These are internal flash pins — leave them unconnected |
