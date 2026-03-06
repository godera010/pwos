# Backend Architecture & Guide

**P-WOS Backend — Flask API, ML Pipeline, and Control Logic**

---

## System Architecture

```
ESP32 Simulator
      │
      ▼ MQTT
┌─────────────┐
│ Mosquitto   │
│ Broker      │
└─────┬───────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐
│ MQTT        │────▶│ SQLite DB   │
│ Subscriber  │     └─────────────┘
└─────────────┘           │
                          ▼
                  ┌─────────────┐
                  │ Flask API   │◀──── React Dashboard
                  └─────┬───────┘
                        │
                        ▼
                  ┌─────────────┐
                  │ ML Predictor│
                  │ (17 feat)   │
                  └─────────────┘
```

---

## Core Files

| File | Purpose |
|------|---------|
| `app.py` | Flask API — single entry point for all HTTP endpoints |
| `database.py` | SQLite persistence with parameterized queries |
| `mqtt_subscriber.py` | MQTT bridge — subscribes to sensor data, writes to DB |
| `automation_controller.py` | Autopilot loop — polls `/api/predict-next-watering` |
| `weather_api.py` | OpenWeatherMap integration with caching |
| `scheduler.py` | Periodic task scheduling |
| `log_config.py` | Centralized logging configuration |

---

## models/ Subdirectory

| File | Purpose |
|------|---------|
| `ml_predictor.py` | VPD-aware prediction engine (17 features, 6 decision states) |
| `train_model.py` | Random Forest training pipeline |
| `data_collector.py` | Training data preparation |
| `artifacts/rf_model.pkl` | Serialized trained model |

### ML Feature Categories

| Category | Features |
|----------|----------|
| **Sensor** | soil_moisture, temperature, humidity |
| **Time** | hour, day_of_week, is_daytime, is_hot_hours |
| **Trends** | moisture_rolling_6, temp_rolling_6, moisture_change_rate |
| **Weather** | forecast_minutes, rain_intensity, wind_speed, is_raining |
| **Physics** | vpd, is_extreme_vpd, is_high_wind |

### Decision States

`WATER_NOW` · `STALL` · `STOP` · `MONITOR` · Safety rails for rain, wind (>20km/h), saturation (>85%)

---

## ai_service/ Subdirectory

| File | Purpose |
|------|---------|
| `retrain_pipeline.py` | Automated model retraining |
| `data_extractor.py` | Data extraction for training |

---

## Weather System Flow

```
live_weather_dashboard.py  →  weather_api.py  →  OpenWeatherMap (or simulated)
        │                                               │
        ▼                                               ▼
  MQTT broadcast  ────────────────────────────▶  esp32_simulator.py reacts
  (pwos/weather/current)                         (adjusts soil moisture)
```

1. `live_weather_dashboard.py` fetches forecast via `weather_api.py` every 60s
2. If API key present → real OpenWeatherMap data; otherwise → simulated
3. Broadcasts weather to MQTT (`pwos/weather/current`)
4. `esp32_simulator.py` listens and adjusts soil moisture accordingly

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Flask** (not FastAPI) | Simpler, better docs, sufficient throughput |
| **Single-file API** (not blueprints) | Project size doesn't warrant splitting |
| **Polling** (not WebSockets) | Dashboard updates every 5s; simpler implementation |
| **SQLite** | Zero config, portable; easy PostgreSQL migration later |
| **Random Forest** | Works with tabular data, no scaling needed, <10ms inference |

---

## API Endpoints

```
GET  /api/status                  System status + latest reading
GET  /api/sensor-data?limit=100   Historical sensor readings
GET  /api/predict                 ML prediction with confidence
POST /api/control/pump            Manual pump control
POST /api/auto-control            Automated ML decision
GET  /api/predict-next-watering   Next watering prediction
```

---

## Logging

All backend services log to `logs/app/`. See [`logs/LOG_STRUCTURE.md`](../logs/LOG_STRUCTURE.md).

| Service | Log File |
|---------|----------|
| `app.py` | `app.log` |
| `mqtt_subscriber.py` | `db_subscriber.log` |
| `automation_controller.py` | `autopilot.log` |
| `weather_api.py` | `weather_api.log` |
| `scheduler.py` | `scheduler.log` |
| `database.py` | `database.log` |
| `ml_predictor.py` | `ml_predictor.log` |
| `train_model.py` | `train_model.log` |
| `data_collector.py` | `data_collector.log` |
| `retrain_pipeline.py` | `retrain_pipeline.log` |
| `data_extractor.py` | `data_extractor.log` |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `MQTT_BROKER` | MQTT broker host (default: `localhost`) |
| `MQTT_PORT` | MQTT broker port (default: `1883`) |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key |
| `DB_HOST` / `DB_PORT` / `DB_NAME` | PostgreSQL connection (future) |

---

## Run Commands

```bash
# Start backend API
python src/backend/app.py

# Start MQTT subscriber
python src/backend/mqtt_subscriber.py

# Start automation controller
python src/backend/automation_controller.py

# Train ML model
python src/backend/models/train_model.py
```
