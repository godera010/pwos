# P-WOS Hardware & Cloud Architecture

## Overview
This document defines how the physical ESP32 hardware will communicate with the cloud-based backend, replacing the current local simulation.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRODUCTION ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
    ┌─────────────┐  WiFi  │   HiveMQ Cloud  │
    │   ESP32     │───────▶│   (MQTT Broker) │
    │   + DHT22   │  MQTT  │   Free Tier     │
    │   + Soil    │        └────────┬────────┘
    └─────────────┘                 │
                                    │ Subscribe: pwos/sensor/data
                                    │ Publish:   pwos/control/pump
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
**Firmware:** MicroPython with `umqtt.simple`

**Sensors:**
- DHT22 (Temperature + Humidity)
- Capacitive Soil Moisture Sensor
- Relay Module (Pump Control)

**Communication:**
```python
# ESP32 MicroPython Pseudocode
from umqtt.simple import MQTTClient

BROKER = "broker.hivemq.com"
TOPIC_DATA = "pwos/sensor/data"
TOPIC_CONTROL = "pwos/control/pump"

client = MQTTClient("ESP32_PWOS", BROKER)
client.connect()
client.publish(TOPIC_DATA, json.dumps(sensor_data))
```

---

### 2. Cloud MQTT Broker (HiveMQ)
**Why HiveMQ?**
- Free tier: 100 connections, 10GB/month
- TLS encryption
- No server to manage

**Setup:**
1. Create account at [hivemq.com/cloud](https://www.hivemq.com/cloud/)
2. Create cluster → Get credentials
3. Store in `.env`:
   ```
   MQTT_BROKER=your-cluster.hivemq.cloud
   MQTT_PORT=8883
   MQTT_USER=your-username
   MQTT_PASS=your-password
   ```

---

### 3. Flask API (Railway Deployment)
**Changes Required:**
- `mqtt_subscriber.py` → Connect to HiveMQ (TLS)
- `database.py` → Switch to PostgreSQL
- `weather_simulator.py` → Replace with OpenWeatherMap API

**Deployment:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

---

### 4. Weather API Integration
**Provider:** OpenWeatherMap (Free: 1000 calls/day)

**Endpoint:**
```
GET https://api.openweathermap.org/data/2.5/forecast
    ?lat={LAT}&lon={LON}&appid={API_KEY}
```

**Response Parsing:**
```python
def get_rain_forecast_hours() -> int:
    """Returns minutes until rain, or 0 if no rain predicted."""
    response = requests.get(WEATHER_URL)
    for forecast in response.json()["list"]:
        if forecast["weather"][0]["main"] == "Rain":
            return minutes_from_now(forecast["dt"])
    return 0
```

---

## Implementation Phases

### Phase A: Prepare Codebase (Before Hardware)
- [ ] Create `src/config.py` for environment variables
- [ ] Update `mqtt_subscriber.py` for TLS connection
- [ ] Create `src/backend/weather_api.py` (real API)
- [ ] Add PostgreSQL support to `database.py`
- [ ] Test with simulation against HiveMQ Cloud

### Phase B: Hardware Arrives
- [ ] Flash MicroPython firmware to ESP32
- [ ] Calibrate sensors
- [ ] Test end-to-end data flow

### Phase C: Full Deployment
- [ ] Deploy Flask to Railway
- [ ] Deploy React to Vercel
- [ ] Configure custom domain (optional)

---

## Security Considerations

| Layer | Protection |
|-------|------------|
| MQTT | TLS 1.3 encryption, username/password auth |
| API | HTTPS only, CORS whitelist |
| DB | Connection string in environment variables |
| Secrets | Never commit `.env` to Git |

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
