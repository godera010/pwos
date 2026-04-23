# firmware/ - ESP32 Firmware

**P-WOS Embedded Device Code (C++ Arduino)**

---

## 📁 Structure

```
firmware/
├── pwos_esp32/
│   ├── pwos_esp32.ino       # Main Arduino sketch (C++)
│   ├── config.h.example     # Credential template (copy to config.h)
│   └── config.h             # Your credentials (gitignored)
└── firmware.md              # This file
```

---

## Purpose

This directory contains the C++ firmware that runs on the ESP32 microcontroller. It reads sensors (DHT22, soil moisture), publishes data to MQTT, and controls a relay-driven water pump.

## Technology

- **Language:** C++ (Arduino Framework)
- **Platform:** ESP32-WROOM-32
- **Libraries:** WiFi, PubSubClient, DHT, ArduinoJson
- **IDE:** Arduino IDE 2.x or Arduino CLI

## Quick Start

```bash
# 1. Create config
copy src\firmware\pwos_esp32\config.h.example src\firmware\pwos_esp32\config.h
# Edit config.h with your WiFi + MQTT credentials

# 2. Flash to ESP32
tools\flash_esp32.bat
```

See [docs/hardware/hardware_setup.md](../../docs/hardware/hardware_setup.md) for detailed instructions.

## Pin Assignments

| Pin | Component | Direction |
|-----|-----------|-----------|
| GPIO 34 | Soil Moisture (ADC) | Input |
| GPIO 25 | DHT22 (Data) | Input |
| GPIO 26 | Relay (Pump) | Output |
| GPIO 2  | Status LED | Output |

## MQTT Topics

| Topic | Direction | Payload |
|-------|-----------|---------|
| `pwos/sensor/data` | OUT | `{"soil_moisture": 45.2, "temperature": 24.5, ...}` |
| `pwos/control/pump` | IN | `{"action": "ON", "duration": 30}` |
| `pwos/device/status` | OUT | `{"uptime_ms": 120000, "wifi_rssi": -45, ...}` |
