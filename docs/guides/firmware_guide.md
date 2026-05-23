# ESP32 Firmware Guide

**P-WOS Production Firmware — C++ / Arduino Framework**

---

## Overview

The P-WOS ESP32 firmware (`src/firmware/pwos_esp32/pwos_esp32.ino`) reads sensors, publishes data to MQTT, listens for pump commands, and reports hardware status. It supports two operating modes:

| Mode | Config | Description |
|------|--------|-------------|
| **WiFi Mode** | `WIFI_ENABLED true` | ESP32 connects directly to MQTT broker over WiFi |
| **USB Mode** | `WIFI_ENABLED false` | ESP32 outputs JSON on serial; PC runs `serial_bridge.py` to forward to MQTT |

---

## Hardware Pinout

| Component | GPIO | Type | Notes |
|-----------|------|------|-------|
| DHT11 (Temp + Humidity) | **14** | Digital | Requires 10kΩ pull-up resistor |
| Soil Moisture Sensor | **34** | ADC (analog) | Resistive sensor, ADC1 channel |
| Relay Module (Pump) | **27** | Digital Output | 5V relay, active HIGH |
| Onboard LED | **2** | Digital Output | Status indicator |

### Wiring Diagram
See [hardware architecture](../hardware/architecture/hardware_architecture.md) and circuit diagrams in `docs/hardware/assets/`.

---

## Setup Instructions

### 1. Install Dependencies (Arduino IDE)
Install these libraries via **Arduino Library Manager**:

| Library | Author | Purpose |
|---------|--------|---------|
| `WiFi` | (built-in) | ESP32 WiFi connectivity |
| `PubSubClient` | Nick O'Leary | MQTT client |
| `DHT sensor library` | Adafruit | DHT11/DHT22 temperature/humidity |
| `ArduinoJson` | Benoit Blanchon | JSON serialization |

### 2. Configure Credentials
```bash
# Copy the example config
cp src/firmware/pwos_esp32/config.h.example src/firmware/pwos_esp32/config.h
```

Edit `config.h`:
```cpp
// WiFi
#define WIFI_SSID     "your_wifi_ssid"
#define WIFI_PASS     "your_wifi_password"
#define WIFI_ENABLED  true

// MQTT Broker
#define MQTT_BROKER   "192.168.137.1"   // PC IP if using mobile hotspot
#define MQTT_PORT     1883
#define MQTT_USER     ""                 // Leave empty if no auth
#define MQTT_PASS     ""

// Device
#define DEVICE_ID     "ESP32_PWOS_001"

// Sensor Calibration
#define SOIL_DRY      3440              // ADC value in dry air
#define SOIL_WET      1480              // ADC value in water
```

### 3. Upload to ESP32
1. Select **Board**: ESP32 Dev Module
2. Select **Port**: COM port for your ESP32
3. Click **Upload**

---

## Sensor Calibration

The soil moisture sensor requires calibration for your specific soil type:

### Calibration Process
1. **Dry reading** — Hold sensor in air, note the ADC value → `SOIL_DRY`
2. **Wet reading** — Submerge sensor in water, note the ADC value → `SOIL_WET`
3. Update `config.h` with your values

### ADC → Percentage Formula
```cpp
float rawPercent = (float)(SOIL_DRY - adcValue) / (float)(SOIL_DRY - SOIL_WET) * 100.0;
float soilMoisture = constrain(rawPercent, 0.0, 100.0);  // Clamp 0-100%
```

### Calibration Tests
Located in `firmware/tests/soil_calibration/` — see test folders for different soil samples.

---

## MQTT Behavior

### Published Topics

| Topic | Payload | Interval | Retained |
|-------|---------|----------|----------|
| `pwos/sensor/data` | JSON: `{"device_id":"...", "soil_moisture":45.5, "temperature":25.3, "humidity":60.2, "pump_active":false}` | Every 5s | No |
| `pwos/system/hardware` | `ONLINE` | On connect | **Yes** |
| `pwos/device/status` | JSON heartbeat: `{"device_id":"...", "uptime":12345, "heap":180000, "rssi":-45, "pump_active":false}` | Every 30s | No |

### Subscribed Topics

| Topic | Expected Payload | Action |
|-------|-----------------|--------|
| `pwos/control/pump` | `{"action":"ON","duration":30}` | Activates relay for N seconds |
| `pwos/weather/current` | Weather JSON from backend | Stored for display (future use) |

### Last Will and Testament (LWT)

When connecting to MQTT, the firmware registers a **Last Will and Testament**:
- **Topic**: `pwos/system/hardware`
- **Payload**: `OFFLINE`
- **QoS**: 1
- **Retain**: true

This means:
- On successful connect → firmware publishes `ONLINE` (retained)
- On unexpected disconnect (power loss, WiFi drop, crash) → **broker auto-publishes `OFFLINE`**
- The backend reads this topic to track hardware connectivity in the SystemHealth dashboard

---

## Operating Modes

### WiFi Mode (`WIFI_ENABLED true`)
- Connects to WiFi with exponential backoff (1s → 30s max)
- Connects to MQTT broker with LWT
- Publishes sensor data directly
- Receives pump commands over MQTT
- Auto-reconnects on WiFi/MQTT disconnect

### USB Mode (`WIFI_ENABLED false`)
- No WiFi or MQTT initialization
- Outputs JSON sensor data on serial (115200 baud)
- Accepts JSON pump commands via serial input
- Requires `serial_bridge.py` on the PC to bridge to MQTT

```
ESP32 (USB) → Serial JSON → serial_bridge.py → MQTT Broker → Backend
```

---

## Pump Control

### Non-Blocking Timer
The pump uses a non-blocking timer pattern — it does not block the main loop:
```
1. Receive pump command (MQTT or serial)
2. Set pumpActive = true, record start time + duration
3. Main loop checks: if (millis() - pumpStartMs >= pumpDurationMs) → turn off pump
```

### Safety Features
- **Maximum duration**: Hardware-enforced limit
- **Watchdog timer**: 30-second ESP32 hardware watchdog — auto-reboots on freeze
- **Water detection**: If soil moisture > 85%, pump commands may be rejected by backend

---

## Error Handling

| Error | Recovery |
|-------|----------|
| DHT11 read failure | Retries next cycle; `dhtErrors` counter increments |
| Soil ADC out of range | Clamped to 0-100%; `soilErrors` counter increments |
| WiFi disconnect | Auto-reconnect with exponential backoff (max 30s) |
| MQTT disconnect | Auto-reconnect with exponential backoff (max 30s); LWT fires |
| Serial parse error | Invalid commands silently ignored |
| Watchdog timeout | ESP32 hardware reboot |

---

## LED Patterns

| Pattern | Meaning |
|---------|---------|
| Solid ON | WiFi + MQTT connected, system healthy |
| Slow blink (1s) | WiFi connected, MQTT disconnected |
| Fast blink (250ms) | WiFi disconnected, attempting reconnect |
| OFF | USB mode (no WiFi) |

---

## Firmware Tests

Located in `firmware/tests/` and `src/firmware/tests/`:

| Test | Purpose |
|------|---------|
| `first_blink/` | Basic GPIO — verify LED works |
| `dht11/` | DHT11 sensor read validation |
| `relay_control/` | Relay ON/OFF cycle test |
| `soil_calibration/` | Soil sensor ADC calibration (4 test runs) |
| `mqtt_pump_test/` | MQTT connection + pump command test |
| `mqtt_soil_test/` | MQTT connection + soil data publish test |
| `pin_34_diagnostic/` | ADC pin 34 diagnostic |
| `voltage/` | Power supply voltage test |
| `esp32test/` | Basic ESP32 connectivity |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| DHT11 returns NaN | Check wiring, ensure 10kΩ pull-up on data pin |
| Soil reads 0% always | Check ADC pin 34 wiring, run `pin_34_diagnostic` test |
| WiFi won't connect | Verify SSID/password in `config.h`, check 2.4GHz band |
| MQTT connection fails | Verify broker IP, check firewall, verify Mosquitto is running |
| Pump doesn't activate | Check relay wiring on GPIO 27, verify 5V power to relay |
| System shows OFFLINE | Firmware must publish `ONLINE` to `pwos/system/hardware` — verify LWT code |
| Watchdog reboot | Main loop is blocked — check for infinite loops, large delays |
