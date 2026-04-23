# P-WOS Hardware Components Shopping List
## Everything You Need to Build the Physical System

---

## COMPLETE HARDWARE LIST

### CORE COMPONENTS (Essential)

| # | Component | Specifications | Quantity | Est. Price | Purpose |
|---|-----------|----------------|----------|------------|---------|
| 1 | **ESP32 Development Board** | ESP32-WROOM-32, WiFi + Bluetooth | 1 | $6-10 | Main microcontroller |
| 2 | **Capacitive Soil Moisture Sensor** | DFRobot SEN0193 or equivalent, Analog output | 1 | $5-8 | Measure soil moisture |
| 3 | **DHT22 Temperature & Humidity Sensor** | AM2302, Digital output | 1 | $3-5 | Measure air temp & humidity |
| 4 | **5V Relay Module** | Single channel, optocoupler isolated | 1 | $2-3 | Control pump safely |
| 5 | **Mini Water Pump** | 3-6V DC submersible pump | 1 | $3-5 | Water delivery |
| 6 | **5V Power Supply** | Micro-USB, 2A minimum | 1 | $5-8 | Power ESP32 |
| 7 | **Breadboard** | 830 tie-points, full size | 1 | $3-5 | Prototyping connections |
| 8 | **Jumper Wires** | Male-to-Male, Male-to-Female set | 1 pack | $3-5 | Connections |

**Subtotal (Core): $30-49**

---

### POWER & WIRING

| # | Component | Specifications | Quantity | Est. Price | Purpose |
|---|-----------|----------------|----------|------------|---------|
| 9 | **Battery Pack for Pump** | 4x AA batteries (6V) with holder | 1 | $3-5 | Pump power supply |
| 10 | **USB Cable** | Micro-USB, 1m+ | 1 | $2-3 | ESP32 power/programming |
| 11 | **Resistors** | 10kΩ (pull-up/pull-down) | 3-5 | $1 | Circuit protection |
| 12 | **Diode** | 1N4007 (flyback protection) | 1 | $0.50 | Protect from pump kickback |

**Subtotal (Power): $6.50-9.50**

---

### ENCLOSURE & MOUNTING (Recommended)

| # | Component | Specifications | Quantity | Est. Price | Purpose |
|---|-----------|----------------|----------|------------|---------|
| 13 | **Waterproof Box** | IP65 rated, 15x10x8cm | 1 | $8-12 | Protect electronics |
| 14 | **Silicone Tubing** | 4mm inner diameter, 1-2m | 1 | $3-5 | Water delivery |
| 15 | **Cable Glands** | M12 or similar, waterproof | 2-3 | $2-4 | Seal cable entry |
| 16 | **Plant Pot/Container** | 20-30cm diameter | 1 | $5-10 | Test bed |
| 17 | **Soil** | Potting mix, 5L | 1 bag | $3-5 | Growing medium |
| 18 | **Test Plant** | Small herb or vegetable | 1 | $3-5 | Subject for testing |

**Subtotal (Enclosure): $24-41**

---

### OPTIONAL UPGRADES

| # | Component | Specifications | Quantity | Est. Price | Purpose |
|---|-----------|----------------|----------|------------|---------|
| 19 | **OLED Display** | 0.96" I2C, 128x64 | 1 | $4-6 | Local status display |
| 20 | **Water Level Sensor** | Float switch or ultrasonic | 1 | $2-4 | Monitor reservoir |
| 21 | **Light Sensor** | BH1750 or photoresistor | 1 | $1-3 | Measure light intensity |
| 22 | **Solar Panel** | 6V 1W with charge controller | 1 | $10-15 | Solar power option |
| 23 | **Rechargeable Batteries** | 18650 Li-ion with holder | 2 | $8-12 | Portable power |
| 24 | **Peristaltic Pump** | 12V, more precise dosing | 1 | $8-15 | Upgrade from mini pump |
| 25 | **Flow Sensor** | YF-S201 or similar | 1 | $3-5 | Measure water volume |

**Subtotal (Optional): $36-60**

---

## DETAILED COMPONENT SPECIFICATIONS

### 1. ESP32 Development Board

**Recommended Models:**
- ESP32-WROOM-32 DevKit V1
- ESP32 NodeMCU-32S
- DOIT ESP32 DevKit

**Key Features Needed:**
- WiFi 802.11 b/g/n
- Built-in Bluetooth (not required but useful)
- Micro-USB port for programming
- 3.3V logic level
- Multiple GPIO pins (at least 5 free pins)
- ADC pins for analog sensors
- Onboard voltage regulator

**Where to Buy:**
- AliExpress: $4-6
- Amazon: $8-10
- Local electronics store: $10-15

---

### 2. Capacitive Soil Moisture Sensor

**Why Capacitive (NOT Resistive):**
- ✅ Corrosion resistant
- ✅ Long lifespan
- ✅ More accurate
- ❌ Resistive sensors corrode quickly

**Recommended Models:**
- DFRobot SEN0193
- Adafruit STEMMA
- Generic capacitive v1.2

**Output:** Analog voltage (0-3V typically)

**Calibration Required:**
- Dry soil reading
- Wet soil reading
- Map to 0-100% scale

---

### 3. DHT22 Sensor

**Alternative:** DHT11 (cheaper but less accurate)

**Comparison:**

| Feature | DHT22 | DHT11 |
|---------|-------|-------|
| Temperature Range | -40 to 80°C | 0 to 50°C |
| Temperature Accuracy | ±0.5°C | ±2°C |
| Humidity Range | 0-100% | 20-90% |
| Humidity Accuracy | ±2-5% | ±5% |
| Price | $3-5 | $1-2 |

**Recommendation:** Use DHT22 for better accuracy

---

### 4. Relay Module

**Specifications:**
- 5V trigger voltage
- Single channel sufficient
- Optocoupler isolation (important!)
- 10A rating (overkill but safe)
- Active low or active high (note which!)

**Why Relay Needed:**
- Pump runs on separate power source
- Protects ESP32 from high current
- Provides electrical isolation

**Wiring:**
- VCC → ESP32 3.3V or 5V
- GND → ESP32 GND
- IN → ESP32 GPIO pin
- COM/NO → Pump circuit

---

### 5. Water Pump

**Mini Submersible Pump Specs:**
- Voltage: 3-6V DC
- Current: 100-300mA
- Flow rate: 80-120 L/hour
- Lift height: 40-80cm

**Alternatives:**

| Pump Type | Pros | Cons | Price |
|-----------|------|------|-------|
| Mini DC | Cheap, simple | Low precision | $3-5 |
| Peristaltic | Very precise, no siphoning | More expensive | $10-15 |
| Solenoid Valve | Precise timing | Needs pressurized water | $5-8 |

**For Testing:** Mini DC pump is perfect

---

### 6. Power Considerations

**ESP32 Power:**
- Voltage: 5V via USB or 3.3V on VIN
- Current draw: 80-160mA (WiFi active)
- Power via: Micro-USB adapter (recommended for testing)

**Pump Power:**
- Separate circuit from ESP32
- 4x AA batteries (6V) works well
- DO NOT power pump from ESP32 pins!

**Future:** Solar panel + rechargeable batteries for outdoor deployment

---

## WIRING DIAGRAM

```
ESP32 Connections:
┌─────────────────────────────────────────┐
│                 ESP32                    │
│                                          │
│  [3.3V] ─────┬──────────────────────┐   │
│              │                       │   │
│  [GND]  ─────┼──────┬────────────┐  │   │
│              │      │            │  │   │
│  [GPIO 34] ──┼──────┼────────┐   │  │   │
│  (ADC)       │      │        │   │  │   │
│              │      │        │   │  │   │
│  [GPIO 25] ──┼──────┼────┐   │   │  │   │
│              │      │    │   │   │  │   │
│  [GPIO 26] ──┼──────┼─┐  │   │   │  │   │
│              │      │ │  │   │   │  │   │
└──────────────┼──────┼─┼──┼───┼───┼──┼───┘
               │      │ │  │   │   │  │
               ▼      ▼ ▼  ▼   ▼   ▼  ▼
            ┌────┐ ┌────┐  ┌────┐ ┌────┐
            │DHT │ │Soil│  │Relay│ │ +  │
            │ 22 │ │Mois│  │     │ │Rail│
            └────┘ └────┘  └────┘ └────┘
              │      │       │
              │      │       └──► Pump Control
              │      │
              │      └──────────► Moisture Reading
              │
              └─────────────────► Temp & Humidity


Pump Circuit (Separate):
┌──────────────────────────────────────────┐
│    Battery Pack (6V)                     │
│         (+)         (-)                  │
│          │           │                   │
│          │           │                   │
│          ▼           ▼                   │
│     ┌────────────────────┐              │
│     │   Relay Module     │              │
│     │                    │              │
│     │  COM ─┐            │              │
│     │       │            │              │
│     │  NO ──┼─────► [+] Pump [-]        │
│     │       │              │            │
│     │       └──────────────┘            │
│     └────────────────────────────────── │
│                                    │     │
│                                    └─► Battery GND
└──────────────────────────────────────────┘
```

---

## PIN CONNECTIONS

```
ESP32 Pin     →  Component             →  Notes
──────────────────────────────────────────────────────
GPIO 34 (ADC) →  Soil Moisture (A0)    →  Analog input
GPIO 25       →  DHT22 Data Pin        →  Digital input
GPIO 26       →  Relay IN (Pump)       →  Digital output
GPIO 2        →  Onboard LED           →  Status indicator
3.3V          →  DHT22 VCC, Sensors    →  Power
GND           →  All component GNDs    →  Ground
```

---

## ASSEMBLY STEPS

### Step 1: Test Components Individually
1. Connect ESP32 to computer via USB
2. Test DHT22: Read temperature/humidity
3. Test soil sensor: Read dry vs wet values
4. Test relay: Click on/off with GPIO
5. Test pump: Connect to battery, verify flow

### Step 2: Breadboard Assembly
1. Place ESP32 on breadboard
2. Connect power rails (3.3V, GND)
3. Add DHT22 with connections
4. Add soil moisture sensor
5. Add relay module
6. Connect pump to relay output

### Step 3: Software Upload
1. Install Arduino IDE 2.x (see [hardware_setup.md](hardware_setup.md))
2. Add ESP32 board support (Espressif)
3. Install libraries: PubSubClient, DHT, ArduinoJson, Adafruit Unified Sensor
4. Copy `config.h.example` → `config.h`, fill in WiFi + MQTT credentials
5. Upload `src/firmware/pwos_esp32/pwos_esp32.ino` to ESP32
6. Open Serial Monitor (115200 baud) and verify output

### Step 4: Integration Test
1. Power on system
2. Check sensor readings
3. Test manual pump activation
4. Verify MQTT connectivity
5. Connect to API

### Step 5: Enclosure
1. Drill holes for cables
2. Install cable glands
3. Mount ESP32 inside
4. Secure relay module
5. Route sensor cables outside
6. Seal enclosure

---

## SHOPPING LINKS (Examples)

### Budget Option (~$40):
**AliExpress/eBay Bundle:**
- ESP32 + DHT22 + Soil Sensor + Relay Kit: $15-20
- Water pump: $3-5
- Breadboard + wires: $5-8
- Power supplies: $8-10
- Enclosure + tubing: $10-12

**Total: ~$40-55**

### Premium Option (~$70):
**Amazon/Local Store:**
- Quality ESP32 DevKit: $10-12
- DFRobot Soil Sensor: $8-10
- DHT22: $5
- Relay module: $3
- Better pump (peristalric): $12-15
- Professional enclosure: $15-20
- Flow sensor: $5
- OLED display: $6

**Total: ~$65-80**

---

## TOOLS NEEDED

**Essential:**
- Soldering iron (if not using breadboard permanently)
- Wire strippers
- Small screwdriver set
- Multimeter (for testing)
- Drill (for enclosure holes)

**Nice to Have:**
- Hot glue gun (cable management)
- Heat shrink tubing
- Label maker
- Helping hands/third hand tool

---

## RECOMMENDED PURCHASE ORDER

### Week 1 (Immediate):
1. ESP32 development board
2. Breadboard + jumper wires
3. USB cable + power supply

**Why:** Start coding and testing WiFi/MQTT while waiting for sensors

### Week 2:
4. DHT22 sensor
5. Soil moisture sensor
6. Relay module

**Why:** Add sensors one at a time, test each

### Week 3:
7. Water pump
8. Battery holder + batteries
9. Tubing

**Why:** Complete the system, start watering tests

### Week 4:
10. Enclosure
11. Cable glands
12. Plant + soil

**Why:** Final assembly and deployment

---

## TOTAL COST SUMMARY

| Category | Budget | Premium |
|----------|--------|---------|
| Core Electronics | $30-40 | $50-60 |
| Power & Wiring | $7-10 | $10-15 |
| Enclosure | $15-20 | $25-35 |
| Optional Upgrades | $0 | $30-50 |
| **TOTAL** | **$52-70** | **$115-160** |

**Recommended Budget:** **$60-80** (good quality, no fancy upgrades)

---

## WHERE TO BUY

### Online (Cheapest):
- **AliExpress:** Best prices, 2-4 week shipping
- **eBay:** Slightly faster, similar prices
- **Banggood:** Good electronics selection

### Online (Fast):
- **Amazon:** 1-2 day shipping, higher prices
- **Adafruit:** Quality components, maker-friendly
- **SparkFun:** Educational focus, good docs

### Local:
- Electronics hobby shops
- Hardware stores (for enclosure, tubing)
- Garden centers (plant, soil, pot)

---

## ALTERNATIVE COMPONENTS

### If Hard to Find:

**ESP32 Alternatives:**
- Arduino MKR WiFi 1010 (more expensive but easier)
- ESP8266 (cheaper but less powerful)
- Raspberry Pi Zero W (overkill but works)

**Sensor Alternatives:**
- Soil: Any capacitive sensor (avoid resistive!)
- DHT22: DHT11 (cheaper, less accurate)
- Can add more sensors later (pH, light, etc.)

**Pump Alternatives:**
- Gravity feed + solenoid valve
- Aquarium air pump + check valve
- Manual watering with logging only

---

## SAFETY NOTES

⚠️ **Important:**
- Never connect pump directly to ESP32 pins (use relay!)
- Keep electronics dry (use enclosure)
- Don't let soil sensor touch metal (corrosion)
- Use flyback diode with relay (protect from voltage spikes)
- Don't overwater (start with short durations)
- Monitor system for first few days

---

## FINAL CHECKLIST

Before ordering, verify you have:

**Core System:**
- [ ] ESP32 board
- [ ] Soil moisture sensor (capacitive)
- [ ] DHT22 sensor
- [ ] Relay module
- [ ] Water pump
- [ ] Power supplies (USB + batteries)
- [ ] Breadboard
- [ ] Jumper wires

**Assembly:**
- [ ] Enclosure
- [ ] Tubing
- [ ] Cables/connectors
- [ ] Tools

**Testing:**
- [ ] Plant pot
- [ ] Soil
- [ ] Test plant
- [ ] Water reservoir

**Total Investment:** ~$60-80 for complete working system

---

🛒 **Ready to order! Start with the Week 1 components and build incrementally.**
