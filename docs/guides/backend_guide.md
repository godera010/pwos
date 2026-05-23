# Backend Architecture & Guide

**P-WOS Backend — Flask API, ML Pipeline, and Control Logic**

---

## System Architecture

```
ESP32 Hardware / Simulator
       │
       ▼ MQTT
┌─────────────┐
│ Mosquitto   │
│ Broker      │
└─────┬───────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐
│ Flask API   │────▶│ PostgreSQL  │
│ (app.py)    │     │ Database    │
│ + MQTT Sub  │     └─────────────┘
└─────┬───────┘           │
      │                   ▼
      ├──── React Dashboard (REST + WebSocket)
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
| `app.py` | Flask API — single entry point for all HTTP endpoints **and** integrated MQTT subscriber |
| `database.py` | PostgreSQL persistence via psycopg2 with parameterized queries |
| `automation_controller.py` | Autopilot loop — polls `/api/predict-next-watering` and issues pump commands |
| `weather_api.py` | OpenWeatherMap integration with caching and simulation fallback |
| `scheduler.py` | Periodic task scheduling |
| `log_config.py` | Centralized logging configuration |

> **Note:** MQTT subscription is integrated directly into `app.py` — there is no separate `mqtt_subscriber.py` service. The `on_message` handler routes plain-text topics (mode, hardware) before JSON topics (sensor, weather).

---

## MQTT Message Handling

The `on_message` handler in `app.py` processes topics in two phases:

### Phase 1: Plain-Text Topics (no JSON parsing)
| Topic | Payload | Action |
|-------|---------|--------|
| `pwos/system/mode` | `AUTO` / `MANUAL` | Updates `system_state['mode']` |
| `pwos/system/hardware` | `ONLINE` / `OFFLINE` | Updates `system_state['hardware_status']` |

### Phase 2: JSON Topics (parsed via `json.loads`)
| Topic | Payload | Action |
|-------|---------|--------|
| `pwos/sensor/data` | `{"soil_moisture": ..., "temperature": ..., "humidity": ...}` | Updates `latest_sensor_data`, logs to PostgreSQL |
| `pwos/weather/current` | `{"forecast_minutes": ..., "condition": ..., ...}` | Updates weather data (simulation or fallback mode) |

This two-phase structure prevents `json.loads()` from crashing on plain-text payloads like `ONLINE`.

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

`WATER_NOW` · `STALL` · `STOP` · `MONITOR` · `HARDWARE_OFFLINE` · Safety rails for rain, wind (>20km/h), saturation (>85%)

When the ESP32 hardware status is `OFFLINE`, the predict endpoint returns `HARDWARE_OFFLINE` / `STOP` as a safety interlock.

---

## ai_service/ Subdirectory

| File | Purpose |
|------|---------|
| `retrain_pipeline.py` | Automated model retraining |
| `data_extractor.py` | Data extraction for training |

---

## Weather System Flow

```
weather_api.py  →  OpenWeatherMap API (real) or Simulation (fallback)
       │
       ▼
 MQTT broadcast  ─────────────────────▶  ESP32 reacts
 (pwos/weather/current)                  (adjusts soil moisture in sim)
```

1. `weather_api.py` fetches forecast data from OpenWeatherMap (if API key configured)
2. Falls back to simulation weather if API is unavailable
3. The backend broadcasts weather to MQTT (`pwos/weather/current`) for the ESP32/simulator
4. In the `on_message` handler, weather data updates `latest_sensor_data` for ML features

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Flask** (not FastAPI) | Simpler, better docs, sufficient throughput |
| **Single-file API** (not blueprints) | Project size doesn't warrant splitting |
| **Integrated MQTT** (in `app.py`) | Eliminates need for separate subscriber process |
| **PostgreSQL** (migrated from SQLite) | Production-grade, supports aggregation queries (`DATE_TRUNC`), concurrent access |
| **WebSocket for Dashboard** | Live sensor data via `useMqtt` hook; REST for historical/analytics |
| **Random Forest** | Works with tabular data, no scaling needed, <10ms inference |

---

## API Endpoints

```
GET  /api/health                      System health check
GET  /api/system/state                System mode + hardware status
POST /api/system/state                Set mode (AUTO/MANUAL)
GET  /api/sensor-data/latest          Latest sensor reading + weather
GET  /api/sensor-data/history         Historical sensor readings
GET  /api/predict-next-watering       ML prediction with confidence
POST /api/control/pump                Manual pump control
GET  /api/watering-events             Pump activation history
GET  /api/analytics/aggregated        Time-bucketed analytics data
GET  /api/weather/forecast            Current weather forecast
GET  /api/statistics                  System-wide statistics
GET  /api/logs                        Recent system log entries
```

---

## Logging

All backend services log to `logs/app/`. See [`logs/LOG_STRUCTURE.md`](../../logs/LOG_STRUCTURE.md).

| Service | Log File |
|---------|----------|
| `app.py` | `app.log` |
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

| Variable | Purpose | Default |
|----------|---------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `pwos` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | (empty) |
| `MQTT_BROKER` | MQTT broker host | `localhost` |
| `MQTT_PORT` | MQTT broker port | `1883` |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | (none — uses simulation) |

---

## Run Commands

```bash
# Start backend API (includes MQTT subscriber)
python src/backend/app.py

# Start automation controller
python src/backend/automation_controller.py

# Train ML model
python src/backend/models/train_model.py
```
