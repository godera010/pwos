# P-WOS API Reference

**Base URL:** `http://localhost:5000`  
**Version:** 2.0

The P-WOS API provides access to sensor data, ML predictions, system control, and simulation. Built with Flask, returns JSON.

---

## 1. System Status

### Health Check
```
GET /api/health
```
```json
{
    "status": "online",
    "timestamp": "2026-02-08T10:00:00",
    "database": {
        "total_readings": 2041,
        "total_waterings": 5,
        "avg_moisture": 55.2
    }
}
```

### System State
```
GET /api/system/state
POST /api/system/state  (body: {"mode": "AUTO" | "MANUAL"})
```

---

## 2. Sensor Data

### Latest Reading
```
GET /api/sensor-data/latest
```
```json
{
    "soil_moisture": 45.5,
    "temperature": 23.1,
    "humidity": 60.2,
    "timestamp": "2026-02-08T10:00:00",
    "forecast_minutes": 0
}
```

### Historical Data
```
GET /api/sensor-data/history?limit=30
```

### Aggregated Analytics
```
GET /api/analytics/aggregated?hours=24&interval=15 minutes
```
Fetches historical sensor and irrigation data aggregated by exact time intervals using PostgreSQL `DATE_TRUNC`. Returns a continuous array of objects with pre-calculated averages and counts.
```json
[
  {
    "timestamp": "2026-02-08T10:00:00",
    "soil_moisture": 45.5,
    "temperature": 23.1,
    "humidity": 60.2,
    "vpd": 1.1,
    "watering": {
      "total_duration": 120,
      "ai_duration": 90,
      "ai_event_count": 2
    }
  }
]
```

---

## 3. ML Prediction

### Get Prediction (17-Feature Model)
```
GET /api/predict-next-watering
```
```json
{
    "recommended_action": "WAIT",
    "system_status": "OPTIMAL",
    "current_moisture": 49.4,
    "ml_analysis": {
        "confidence": 97.0,
        "prediction": 0,
        "reason": "Moisture at 49.4%. System optimal.",
        "features_used": {
            "soil_moisture": 49.4,
            "temperature": 24.3,
            "humidity": 65.0,
            "vpd": 1.07,
            "is_extreme_vpd": 0,
            "wind_speed": 0.0,
            "rain_intensity": 0.0,
            "is_raining": 0,
            "is_high_wind": 0,
            "forecast_minutes": 0,
            "hour": 17,
            "day_of_week": 6,
            "is_daytime": 1,
            "is_hot_hours": 0,
            "moisture_change_rate": 0.0,
            "moisture_rolling_6": 49.4,
            "temp_rolling_6": 24.3
        }
    }
}
```

**Actions:** `WATER_NOW`, `STALL`, `WAIT`  
**Statuses:** `CRITICAL`, `LOW`, `OPTIMAL`, `PUMPING`

---

## 4. Control

### Pump Control
```
POST /api/control/pump
Content-Type: application/json
```
```json
{"action": "ON", "duration": 30}
```

### Watering Events
```
GET /api/watering-events?limit=50
```

---

## 5. Simulation

### Reset Simulation
```
POST /api/simulation/reset
Content-Type: application/json
```
```json
{"scenario": "mixed_weather"}
```
**Scenarios:** `mixed_weather`, `dry_season`, `rainy_season`

### Step Simulation (15 min)
```
POST /api/simulation/step
```
Returns reactive vs predictive comparison data.

### Get Simulation State
```
GET /api/simulation/state
```
```json
{
    "step": 100,
    "scenario": "mixed_weather",
    "fields": {
        "reactive": {"moisture": 35.2, "water_used": 45.0, "pump_events": 3},
        "predictive": {"moisture": 42.1, "water_used": 30.0, "pump_events": 2}
    },
    "water_saved": 15.0,
    "savings_percent": 33.3
}
```

---

## 6. Weather

### Get Forecast
```
GET /api/weather/forecast
```
```json
{
    "temperature": 24.3,
    "humidity": 65.0,
    "precipitation_chance": 20,
    "wind_speed_kmh": 8.5,
    "rain_forecast_minutes": 0,
    "condition": "Clear"
}
```

---

## 7. MQTT Topics

| Topic | Direction | Payload |
|-------|-----------|---------|
| `pwos/sensor/data` | Pub (ESP32) | `{"soil_moisture": 60.0, ...}` |
| `pwos/control/pump` | Sub (ESP32) | `{"action": "ON", "duration": 30}` |
