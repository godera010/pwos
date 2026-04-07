# P-WOS Hardware & Cloud Architecture

## Overview
This document defines how the physical ESP32 hardware communicates with the backend, replacing the current local simulation.

---

## Architecture Diagram

### Phase 1: LAN (Local Network)

```
┌─────────────────────────────────────────────────────────────────────┐
│                       LAN ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
    ┌─────────────┐  WiFi  │   Mosquitto     │
    │   ESP32     │───────▶│   (localhost)    │
    │   + DHT22   │  MQTT  │   Port 1883     │
    │   + Soil    │        └────────┬────────┘
    │   + Relay   │                 │
    └─────────────┘                 │ Sub: pwos/sensor/data
                                    │ Pub: pwos/control/pump
                                    ▼
                           ┌─────────────────┐
                           │   Flask API     │
                           │   (localhost)   │◀──── OpenWeatherMap API
                           │   :5000         │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │   PostgreSQL    │
                           │   (localhost)   │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │   React App     │
                           │   (localhost)   │
                           │   :5173         │
                           └─────────────────┘
```

### Phase 2: Cloud (Production)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
    ┌─────────────┐  WiFi  │   HiveMQ Cloud  │
    │   ESP32     │───────▶│   (MQTT Broker) │
    │   + DHT22   │  TLS   │   Port 8883     │
    │   + Soil    │        └────────┬────────┘
    │   + Relay   │                 │
    └─────────────┘                 │ Sub: pwos/sensor/data
                                    │ Pub: pwos/control/pump
                                    ▼
                           ┌─────────────────┐
                           │   Flask API     │
                           │   (Railway)     │◀──── OpenWeatherMap API
                           │   /api/*        │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │   PostgreSQL    │
                           │   (Railway)     │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │   React App     │
                           │   (Vercel)      │
                           └─────────────────┘
```

---

## Components

### 1. ESP32 Hardware
**Role:** Field sensor node
**Firmware:** C++ (Arduino Framework)

**Sensors:**
- DHT22 (Temperature + Humidity) → GPIO 25
- Capacitive Soil Moisture Sensor → GPIO 34 (ADC)
- Relay Module (Pump Control) → GPIO 26

**Libraries:**
- `WiFi.h` (built-in)
- `PubSubClient` (MQTT)
- `DHT` (Adafruit)
- `ArduinoJson` (JSON serialization)

**Communication:**
```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Publish sensor data
StaticJsonDocument<384> doc;
doc["device_id"]    = "ESP32_PWOS_001";
doc["soil_moisture"] = readSoilMoisture();
doc["temperature"]   = dht.readTemperature();
doc["humidity"]      = dht.readHumidity();
doc["pump_active"]   = pumpActive;

char payload[384];
serializeJson(doc, payload);
mqttClient.publish("pwos/sensor/data", payload);
```

---

### 2. MQTT Broker

**Phase 1 — LAN:** Local Mosquitto on `localhost:1883` (no TLS, no auth)

**Phase 2 — Cloud:** HiveMQ Cloud
- Free tier: 100 connections, 10GB/month
- TLS encryption, username/password auth

**Setup:**
1. Create account at [hivemq.com/cloud](https://www.hivemq.com/cloud/)
2. Create cluster → Get credentials
3. Store in `.env`:
   ```
   MQTT_MODE=cloud
   MQTT_CLOUD_BROKER=your-cluster.hivemq.cloud
   MQTT_CLOUD_PORT=8883
   MQTT_CLOUD_USER=your-username
   MQTT_CLOUD_PASS=your-password
   ```

---

### 3. Flask API

**Backend changes:** None required.

The backend subscribes to `pwos/sensor/data` via MQTT. It doesn't care if data comes from `esp32_simulator.py` or a real ESP32 — the JSON format is identical.

**Configuration:** Set `DATA_SOURCE_MODE=hardware` in `.env`

---

### 4. Weather API Integration
**Provider:** OpenWeatherMap (Free: 1000 calls/day)

Already implemented in `src/backend/weather_api.py`. In hardware mode, weather data comes from the API (not the weather simulator).

---

## Implementation Phases

### Phase 1: LAN (Build & Test Locally)
- [x] Create C++ Arduino firmware (`src/firmware/pwos_esp32/`)
- [x] Create config.h.example with pin/credential templates
- [x] Create serial bridge for USB fallback
- [x] Create hardware manager with mode selection
- [x] Update config.py with DATA_SOURCE_MODE
- [ ] Flash firmware to ESP32
- [ ] Calibrate sensors
- [ ] Test end-to-end on LAN

### Phase 2: Cloud (Go Online)
- [ ] Add TLS support to firmware (WiFiClientSecure)
- [ ] Deploy Flask to Railway
- [ ] Deploy React to Vercel
- [ ] Test end-to-end over internet

---

## Security Considerations

| Layer | Protection |
|-------|------------|
| MQTT (LAN) | Firewall, local network only |
| MQTT (Cloud) | TLS 1.3, username/password auth |
| API | HTTPS only, CORS whitelist |
| DB | Connection string in environment variables |
| Secrets | `.env` and `config.h` gitignored |

---

## Cost Estimate (Free Tier)

| Service | Free Tier | Limit |
|---------|-----------|-------|
| HiveMQ Cloud | ✅ | 100 connections |
| Railway | ✅ | $5 credit/month |
| OpenWeatherMap | ✅ | 1000 calls/day |
| Vercel | ✅ | Unlimited static |
| PostgreSQL (Railway) | ✅ | 1GB included |

**Total Monthly Cost: $0** (within free tiers)
