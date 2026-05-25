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
┌─────────────┐     ┌─────────────────────────────┐
│ Flask API   │────▶│ PostgreSQL (ThreadedPool)   │
│ (app.py)    │     │ Indexes: timestamp DESC      │
│ + MQTT Sub  │     └─────────────────────────────┘
└─────┬───────┘           │
      │                   ▼
      ├──── React Dashboard (REST + MQTT WebSocket)
      │
      ▼
┌───────────────────────────────────────────────┐
│ ML Predictor (Crop-Aware, Region-Aware)        │
│  • 12 features (incl. crop thresholds)         │
│  • Settings injected in-memory (no disk I/O)   │
└───────────────────────────────────────────────┘
```

---

## Core Files

| File | Purpose |
|------|---------|
| `app.py` | Flask API — single entry point for all HTTP endpoints **and** integrated MQTT subscriber. CORS-locked to local origins. |
| `database.py` | PostgreSQL persistence via `psycopg2` with `ThreadedConnectionPool` (1–20 connections) and descending timestamp indexes. |
| `automation_controller.py` | Autopilot loop — polls `/api/predict-next-watering`; uses dynamic crop safety limits from `/api/settings`. |
| `weather_api.py` | Visual Crossing / OpenWeatherMap integration with caching and simulation fallback. |
| `scheduler.py` | Periodic task scheduling. |
| `log_config.py` | Centralized logging configuration. |

> **Note:** MQTT subscription is integrated directly into `app.py` — there is no separate `mqtt_subscriber.py`. The `on_message` handler routes plain-text topics (mode, hardware) before JSON topics (sensor, weather).

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

## Database Connection Pooling

`database.py` uses a **`ThreadedConnectionPool`** (min=1, max=20) wrapped in a custom `PoolConnectionWrapper`:

```python
# database.py — connection pool initialization
from psycopg2 import pool as psycopg2_pool

self._pool = psycopg2_pool.ThreadedConnectionPool(1, 20, **conn_params)
```

The `PoolConnectionWrapper` transparently returns connections to the pool on `close()`, making the pool invisible to all existing query code. It also detects `psycopg2` mocking in unit tests and bypasses the pool, ensuring full test compatibility.

**Performance Impact**: Eliminates TCP connection overhead on every API call (previously ~5ms per request saved), supporting 20 concurrent connections under load.

---

## Database Indexes

On `init_database()`, the following descending indexes are created if they do not already exist:

```sql
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_watering_events_timestamp ON watering_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_decisions_timestamp    ON ml_decisions    (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp     ON system_logs     (timestamp DESC);
```

**Impact**: All history and analytics queries that `ORDER BY timestamp DESC LIMIT N` are now index-scans (O(log N)) instead of full-table scans (O(N)).

---

## ML Inference Optimization

The prediction path in `app.py` loads settings once per request from the in-memory `operational_settings` dict and passes them directly to `MLPredictor.predict_next_watering(active_settings=...)`:

```python
# app.py — optimized prediction path
settings = load_settings()   # in-memory dict, no disk I/O
result = ml_predictor.predict_next_watering(
    sensor_data=latest_sensor_data,
    active_settings=settings   # injected directly
)
```

Previously, `ml_predictor.py` was reading `operational_settings.json` from disk on every prediction cycle (~10-second I/O bottleneck eliminated).

---

## Pump Settling — threading.Timer

The post-pump moisture capture uses `threading.Timer` instead of `threading.Thread` with `time.sleep`:

```python
# app.py — safe settling check
timer = threading.Timer(duration + 5, capture_post_moisture)
timer.daemon = True
timer.start()
```

This prevents thread leaks under high-frequency pump commands.

---

## models/ Subdirectory

| File | Purpose |
|------|---------|
| `ml_predictor.py` | Multi-crop prediction engine (12 features, 4 actions, in-memory settings) |
| `train_model.py` | Random Forest training pipeline (630k sample multi-crop dataset) |
| `data_collector.py` | Legacy training data preparation |
| `artifacts/rf_model.pkl` | Serialized trained model |

### ML Feature Categories

| Category | Features |
|----------|----------|
| **Sensor** | soil_moisture, temperature, humidity |
| **Weather** | wind_speed, rain_intensity |
| **Physics** | vpd, is_extreme_vpd, is_raining, is_high_wind |
| **Crop Context** | crop_target_moisture, crop_critical_moisture, region_evap_multiplier |

> **Note:** The Random Forest model uses 12 features. Additional derived features (hour, day_of_week, is_daytime, is_hot_hours, forecast_minutes, moisture_change_rate, moisture_rolling_6, temp_rolling_6) are calculated at inference time and used only by the Decision Engine.

### Decision Actions

`NOW` · `STALL` · `STOP` · `MONITOR` — with 13 status sub-codes: CRITICAL, DRY_TRIGGER, PREHEAT, EMERGENCY, VPD_DELAY, WIND_DELAY, RAIN_EXPECTED, RAINING, SATURATED, HARDWARE_OFFLINE, WATCHING, OPTIMAL, FALSE_DRY_CHECK

When the ESP32 hardware status is `OFFLINE`, the predict endpoint returns `HARDWARE_OFFLINE` / `STOP` as a safety interlock.

---

## ai_service/ Subdirectory

| File | Purpose |
|------|---------|
| `retrain_pipeline.py` | Automated model retraining |
| `data_extractor.py` | Multi-crop + multi-region data augmentation (PostgreSQL → 630k CSV) |

---

## Automation Controller — Dynamic Crop Safety Limits

`automation_controller.py` fetches live settings from `/api/settings` and uses crop-specific thresholds for safety overrides:

```python
# Old (hardcoded):
if moisture < 15:   force_auto_mode()
if moisture >= 95:  force_pump_off()

# New (crop-aware):
settings = get_settings()
if moisture < settings['crop_critical_moisture']:  force_auto_mode()
if moisture >= settings['crop_high_threshold']:    force_pump_off()
```

Also corrected the internal health-check endpoint from `/sensors/latest` → `/sensor-data/latest`.

---

## Coordinate-Based Region Resolver

`app.py` resolves the active agro-ecological region from the system's GPS coordinates:

```python
def resolve_region_from_coordinates(lat, lon):
    if -22.5 <= lat <= -19.0 and 25.0 <= lon <= 30.0:
        return 'matabeleland', 1.5   # Bulawayo — semi-arid
    elif -21.0 <= lat <= -17.5 and 32.0 <= lon <= 34.0:
        return 'manicaland', 0.6    # Eastern Highlands — humid
    else:
        return 'mashonaland', 1.0   # Harare — sub-humid (default)
```

Input validation ensures lat ∈ [-90, 90] and lon ∈ [-180, 180] with descriptive `400 Bad Request` responses.

---

## CORS Configuration

Allowed origins are restricted to local development servers:

```python
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:3000", "http://127.0.0.1:3000"])
```

---

## Weather System Flow

```
weather_api.py  →  Visual Crossing / OpenWeatherMap (real) or Simulation (fallback)
       │
       ▼
 MQTT broadcast  ─────────────────────▶  ESP32 reacts
 (pwos/weather/current)                  (adjusts soil moisture in sim)
```

Regional weather CSVs (Bulawayo, Harare, Mutare — 15 days hourly) are used during training dataset generation in `data_extractor.py`.

---

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Flask** (not FastAPI) | Simpler, better docs, sufficient throughput |
| **Single-file API** (not blueprints) | Project size doesn't warrant splitting |
| **Integrated MQTT** (in `app.py`) | Eliminates need for separate subscriber process |
| **PostgreSQL** (migrated from SQLite) | Production-grade, `DATE_TRUNC` aggregation, concurrent access |
| **ThreadedConnectionPool** | Handles 20 concurrent connections; pool transparent to query code |
| **In-memory settings injection** | Eliminates 10s disk I/O per prediction cycle |
| **WebSocket for Dashboard** | Live sensor data via `useMqtt` hook; REST for historical/analytics |
| **Random Forest** | Tabular data, no scaling, <10ms inference, interpretable feature importances |

---

## API Endpoints

```
GET  /api/health                      System health check
GET  /api/system/state                System mode + hardware status
POST /api/system/state                Set mode (AUTO/MANUAL)
GET  /api/sensor-data/latest          Latest sensor reading + weather
GET  /api/sensor-data/history         Historical sensor readings
GET  /api/predict-next-watering       ML prediction with confidence (crop-aware)
POST /api/control/pump                Manual pump control
GET  /api/watering-events             Pump activation history
GET  /api/analytics/aggregated        Time-bucketed analytics data
GET  /api/weather/forecast            Current weather forecast
GET  /api/statistics                  System-wide statistics
GET  /api/logs                        Recent system log entries
GET  /api/settings                    Current operational settings (crop, region, thresholds)
POST /api/settings                    Update settings (crop, coordinates, mode)
```

---

## Logging

All backend services log to `logs/app/`. See [`logs/LOG_STRUCTURE.md`](../../../../logs/LOG_STRUCTURE.md).

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
| `VISUAL_CROSSING_API_KEY` | Visual Crossing API key | (used for regional weather download) |

---

## Run Commands

```bash
# Start backend API (includes MQTT subscriber)
python src/backend/app.py

# Start automation controller (crop-aware autopilot)
python src/backend/automation_controller.py

# Train multi-crop ML model
python src/backend/models/train_model.py

# Download regional weather data (Visual Crossing)
python scripts/download_weather_data.py
```
