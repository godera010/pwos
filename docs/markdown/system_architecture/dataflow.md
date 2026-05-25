# Dataflow

**How Data Moves from Sensor to Pump — The Complete Pipeline**

---

## Overview

P-WOS has two parallel data pipelines that converge at the Decision Engine:

```
SENSOR PIPELINE:
  ESP32 / Simulator
      │  MQTT (pwos/sensor/data)
      ▼
  app.py on_message()
      │  in-memory update + DB write
      ▼
  PostgreSQL → sensor_readings table

WEATHER PIPELINE:
  OpenWeatherMap API  ──OR──  Weather Simulator (MQTT)
      │                           │ pwos/weather/current
      ▼                           ▼
  weather_api.py (10-min cache)
      │
      ▼
  app.py latest_sensor_data dict (merged with sensor)

INFERENCE PIPELINE:
  GET /api/predict-next-watering
      │  assembled from latest_sensor_data
      ▼
  MLPredictor.predict_next_watering()
      │  12-feature input → Random Forest → Decision Engine
      ▼
  JSON response: action + duration + status + reason
      │
      ▼
  automation_controller.py
      │  POST /api/control/pump
      ▼
  MQTT (pwos/pump/control) → ESP32 / Simulator
```

---

## MQTT Topic Tree

| Topic | Publisher | Subscriber | Payload | Purpose |
|-------|-----------|------------|---------|---------|
| `pwos/sensor/data` | ESP32 / esp32_simulator.py | app.py | JSON sensor reading | Live sensor telemetry |
| `pwos/weather/current` | weather_simulator.py / live_weather_dashboard.py | app.py, weather_api.py | JSON weather state | Weather broadcast |
| `pwos/pump/control` | app.py | ESP32 / esp32_simulator.py | JSON pump command | Irrigation control |
| `pwos/system/mode` | Frontend / Control panel | app.py | Plain text: `AUTO` or `MANUAL` | Mode synchronisation |
| `pwos/system/hardware` | ESP32 (LWT) | app.py | Plain text: `ONLINE` or `OFFLINE` | Hardware heartbeat |

### MQTT Broker

- **Host:** `localhost`
- **Port:** `1883`
- **Protocol:** MQTT v5 (paho-mqtt CallbackAPIVersion.VERSION2)
- **Keep-alive:** 60 seconds

### LWT (Last Will and Testament)

The ESP32 device is configured with a Last Will message on the `pwos/system/hardware` topic. If the device disconnects unexpectedly, the broker automatically publishes `"OFFLINE"` to this topic, which `app.py` picks up and stores in `system_state['hardware_status']`.

---

## Sensor Data Payload

Published by ESP32 or `esp32_simulator.py` to `pwos/sensor/data` every **5 seconds**:

```json
{
    "soil_moisture": 42.7,
    "temperature": 28.3,
    "humidity": 61.0,
    "device_id": "esp32-pwos-01"
}
```

> **Note:** The ESP32 sends `millis()` as its internal timestamp, which the server discards. `app.py` stamps incoming readings with server time (`datetime.now().isoformat()`).

---

## Weather Data Payload

Published to `pwos/weather/current` by the simulator, or fetched from OpenWeatherMap by `weather_api.py`:

```json
{
    "forecast_minutes": 120,
    "forecast_temp": 31.5,
    "forecast_humidity": 45.0,
    "wind_speed": 14.2,
    "precipitation_chance": 60,
    "rain_intensity": 0.0,
    "cloud_cover": 35.0,
    "condition": "Clouds",
    "source": "openweathermap",
    "timestamp": "2026-05-23T14:30:00"
}
```

### Weather Source Priority

```
1. OpenWeatherMap API (if mode = 'openweathermap' AND API is healthy)
   └─ Cache duration: 10 minutes (in-memory + file cache at logs/app/weather_cache.json)

2. MQTT Weather Simulator (if mode = 'simulation' OR API is down)
   └─ Cache duration: 60 seconds

3. Safe Fallback (if both sources unavailable)
   └─ Returns: temp=25°C, humidity=60%, all weather fields zeroed
   └─ weather_source = 'fallback'
```

### Weather Staleness Guard

If `weather_source` is `'stale'`, `'fallback'`, or `'none'`, the ML predictor **zeroes all weather features** before running inference:

```python
features['forecast_minutes'] = 0
features['wind_speed'] = 0.0
features['rain_intensity'] = 0.0
features['is_raining'] = 0
features['is_high_wind'] = 0
```

This is a safety measure: the system won't make rain-avoidance or wind-delay decisions based on stale data. It reverts to purely sensor-based decisions.

---

## What `app.py` Does With Each MQTT Message

### `pwos/sensor/data` handler

```
1. Update in-memory latest_sensor_data dict with soil_moisture, temperature, humidity
2. If WEATHER_API_MODE == 'openweathermap':
       Call weather_api.get_forecast() (returns cached result if < 10 min old)
       Merge weather fields into latest_sensor_data
3. Call log_sensor_data() → INSERT INTO sensor_readings
```

### `pwos/weather/current` handler

```
1. Only process if:
       mode == 'simulation'  OR
       API is currently down (weather_api._api_was_down == True)
2. Update latest_sensor_data with weather fields from the MQTT message
3. Label weather_source as 'simulation' or 'simulation_fallback'
```

### `pwos/system/mode` handler

```
1. Parse plain-text payload: 'AUTO' or 'MANUAL'
2. Update system_state['mode']
3. Log mode synchronisation
```

### `pwos/system/hardware` handler

```
1. Parse plain-text payload: 'ONLINE' or 'OFFLINE'
2. Update system_state['hardware_status']
3. Log hardware status change
```

---

## PostgreSQL Database Schema

Connection pool: **1–20 connections** (ThreadedConnectionPool).

### `sensor_readings` — Every 5-second reading

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `timestamp` | TIMESTAMP | Server-stamped arrival time |
| `soil_moisture` | REAL | 0–100% |
| `temperature` | REAL | °C |
| `humidity` | REAL | 0–100% |
| `device_id` | TEXT | ESP32 device identifier |
| `forecast_minutes` | INTEGER | Minutes until rain (0 = none) |
| `wind_speed` | REAL | km/h |
| `precipitation_chance` | INTEGER | 0–100% |
| `vpd` | REAL | Calculated VPD in kPa |
| `rain_intensity` | REAL | 0–100 scale |
| `cloud_cover` | REAL | 0–100% |
| `forecast_temp` | REAL | °C |
| `forecast_humidity` | REAL | % |
| `weather_condition` | TEXT | 'Clear', 'Rain', etc. |
| `weather_source` | TEXT | 'openweathermap', 'simulation', 'fallback' |

**Index:** `idx_sensor_readings_timestamp ON sensor_readings(timestamp DESC)`

### `watering_events` — Every pump activation

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `timestamp` | TIMESTAMP | When the pump was activated |
| `duration_seconds` | INTEGER | How long the pump ran |
| `trigger_type` | TEXT | 'AUTO' or 'MANUAL' |
| `moisture_before` | REAL | Soil moisture at pump start |
| `moisture_after` | REAL | Soil moisture after pump stops |

**Index:** `idx_watering_events_timestamp ON watering_events(timestamp DESC)`

### `ml_decisions` — Every prediction audit record

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `timestamp` | TIMESTAMP | When the prediction was made |
| `soil_moisture` | REAL | Input moisture |
| `temperature` | REAL | Input temp |
| `humidity` | REAL | Input humidity |
| `vpd` | REAL | Calculated VPD |
| `forecast_minutes` | INTEGER | Rain ETA input |
| `precipitation_chance` | INTEGER | Rain probability |
| `wind_speed` | REAL | Wind speed input |
| `rain_intensity` | REAL | Rain intensity input |
| `decay_rate` | REAL | Predicted decay rate %/hr |
| `decision` | TEXT | NOW / STALL / STOP / MONITOR |
| `confidence` | REAL | ML model confidence % |
| `reason` | TEXT | Human-readable decision reason |
| `recommended_duration` | INTEGER | Pump duration in seconds |
| `features_json` | TEXT | Full feature dict as JSON string |

**Index:** `idx_ml_decisions_timestamp ON ml_decisions(timestamp DESC)`

### `system_logs` — System events and activity

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `timestamp` | TIMESTAMP | Event time |
| `level` | TEXT | 'INFO', 'ERROR', 'SUCCESS', 'ACTION' |
| `source` | TEXT | Component name |
| `message` | TEXT | Log message |

**Index:** `idx_system_logs_timestamp ON system_logs(timestamp DESC)`

### `model_versions` — ML model retraining history

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL PK | Auto-increment |
| `timestamp` | TIMESTAMP | When this version was trained |
| `version_tag` | TEXT | e.g. `v20260319_092225` |
| `accuracy` | REAL | Overall accuracy |
| `precision` | REAL | Class 1 precision |
| `recall` | REAL | Class 1 recall |
| `f1_score` | REAL | Class 1 F1 |
| `training_samples` | INTEGER | Number of training samples |
| `model_path` | TEXT | Path to the .pkl file |
| `is_active` | BOOLEAN | Whether this is the live model |

---

## Pump Control Flow

When the autopilot issues a `NOW` command:

```
automation_controller.py
  POST /api/control/pump
  Body: { "action": "ON", "duration": 30, "trigger_source": "AUTO" }

app.py /api/control/pump handler:
  1. Validate action ("ON" or "OFF")
  2. Record moisture_before from latest sensor reading
  3. Publish MQTT message to pwos/pump/control:
         { "command": "ON", "duration": 30 }
  4. Log watering event to watering_events table
  5. Return 200 OK

ESP32 / Simulator receives MQTT on pwos/pump/control:
  → Activates pump relay for specified duration
  → Soil moisture begins rising (+0.4%/tick at 5s intervals in simulator)
```

---

## The Inference Request Path (Full Detail)

```
GET /api/predict-next-watering (automation_controller.py every 5s)
    │
    ▼
app.py assembles current_data from latest_sensor_data dict:
    - Sensor: soil_moisture, temperature, humidity, timestamp
    - Weather: forecast_minutes, wind_speed, rain_intensity, 
               precipitation_chance, cloud_cover, forecast_temp,
               forecast_humidity, weather_condition, weather_source
    - System: hardware_status
    │
    ▼
app.py calls MLPredictor.predict_next_watering(current_data, history_df, active_settings)
    - history_df: last 6 readings from sensor_readings (for rolling averages)
    - active_settings: { active_crop, active_region } (from operational_settings.json)
    │                    ← loaded once per startup, injected in-memory (no disk I/O per request)
    ▼
MLPredictor assembles 12-feature vector:
    soil_moisture, temperature, humidity, wind_speed, rain_intensity,
    vpd (calculated), is_extreme_vpd, is_raining, is_high_wind,
    crop_target_moisture, crop_critical_moisture, region_evap_multiplier
    + derived: moisture_change_rate, moisture_rolling_6, temp_rolling_6
    │
    ▼
Random Forest (100 trees, depth=10) → prediction (0 or 1) + probability
    │
    ▼
Decision Engine → action, status, reason, duration
    │
    ▼
Response JSON returned to automation_controller.py
    │
    ▼
Decision logged to ml_decisions table
```

---

## Error Paths

| Error | What Happens |
|-------|-------------|
| MQTT broker unreachable | `app.py` logs warning, continues. Re-attempts connection are handled by paho-mqtt internally. |
| No sensor data received | `/api/sensor-data/latest` returns 404. Autopilot logs and retries in 5s. |
| ML model not loaded | `MLPredictor.predict_next_watering()` returns `{'error': 'Model not loaded'}`. |
| OpenWeatherMap API down | `weather_api.py` falls back to MQTT simulator data. Logs recovery when API comes back. |
| PostgreSQL connection failed | `ThreadedConnectionPool` raises exception. `app.py` logs critical error. |
| Sensor moisture < 1% (disconnected) | `check_sensor_validity()` returns False → `STOP / SENSOR_ERROR` |
| Weather source = 'stale' | All weather features zeroed in predictor. Sensor-only decision. |

---

*P-WOS v2.0 | System Behaviour — Dataflow*
