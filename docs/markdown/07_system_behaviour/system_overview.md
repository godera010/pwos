# System Overview

**P-WOS — How the System Thinks Every 5 Seconds**

---

## What P-WOS Is, in One Paragraph

P-WOS (Plant Watering Optimisation System) is an autonomous irrigation controller that reads soil moisture and weather data every 5 seconds, feeds those readings into a trained Random Forest ML model combined with a physics-based Decision Engine, and issues one of four commands to a water pump: **NOW**, **STALL**, **STOP**, or **MONITOR**. It adjusts its behaviour based on the active crop profile, the agro-ecological region, the time of day, and live atmospheric conditions — all without human intervention.

---

## The 4 Output Actions

Every 5-second cycle produces exactly one of these:

| Action | Pump | Meaning |
|--------|------|---------|
| **NOW** | ✅ ON | Water immediately for the calculated duration |
| **STALL** | ❌ OFF | Conditions unfavourable — delay watering |
| **STOP** | ❌ OFF | Hard stop — raining, saturated, or hardware offline |
| **MONITOR** | ❌ OFF | All good — watch and wait |

---

## System Modes

The system operates in one of two modes at any time:

### AUTO Mode (Default)
The Automation Controller (`automation_controller.py`) polls the prediction API every 5 seconds and executes whatever action the ML Brain recommends. This is the normal operating state.

### MANUAL Mode
A human has taken direct control via the frontend Control panel. The autopilot stands down — but **two critical safety overrides remain active even in MANUAL mode**:

| Override | Condition | Action |
|----------|-----------|--------|
| **Critically Dry Override** | Moisture < `crop_critical_moisture` (default 15%) | Forces back to AUTO immediately |
| **Saturation Override** | Moisture ≥ `crop_high_threshold` (default 85%) | Kills pump + forces back to AUTO |

> These overrides cannot be disabled. They exist to prevent plant death and flooding regardless of human input.

---

## The 5-Second Control Loop

This is what happens every 5 seconds when the system is in AUTO mode:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    5-SECOND CONTROL LOOP (AUTO)                     │
│                                                                     │
│  1. CHECK MODE ──► Is system in MANUAL?                             │
│       └─ Yes → Run safety overrides, then sleep 5s                  │
│       └─ No  → Continue                                             │
│                                                                     │
│  2. ASK THE BRAIN ──► GET /api/predict-next-watering               │
│       └─ Error/timeout → log warning, sleep 5s, retry              │
│                                                                     │
│  3. COOLDOWN CHECK ──► Was last watering < 15 minutes ago?         │
│       └─ Yes → Override action to STALL / "Watering in cooldown"   │
│       └─ No  → Use Brain's recommended action                      │
│                                                                     │
│  4. EXECUTE ACTION                                                   │
│       ├─ NOW   → POST /api/control/pump (ON, duration Ns)           │
│       │          → Enter active safety polling loop (every 5s)      │
│       │          → Cut pump early if moisture ≥ HIGH_THRESHOLD       │
│       ├─ STALL → Log reason (only when state changes)               │
│       ├─ STOP  → Log reason (only when state changes)               │
│       └─ MONITOR → Log status (only when state changes)             │
│                                                                     │
│  5. SLEEP 5s → repeat                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Important Behaviour: State-Change Logging

The autopilot only writes a log entry when the **action or reason changes**. If the system is in MONITOR/OPTIMAL for 3 hours, it writes one log line — not 2,160. This prevents log flooding.

### Startup State Seeding

When the autopilot restarts, it reads the last 5 log entries and seeds its `last_action` / `last_reason` variables from them. This prevents duplicate log entries on daemon restart.

---

## Active Safety Polling (During Watering)

When a NOW action triggers pump activation, the autopilot does **not** just wait for the timer. It enters an active safety polling loop:

```python
while time.time() - start_time < (duration + 5):
    time.sleep(5)
    current_moisture = GET /api/sensor-data/latest
    if current_moisture >= crop_high_threshold:
        POST /api/control/pump  { action: OFF }   # Emergency cutoff
        break
```

This means even if the pump duration was calculated as 60 seconds, the pump will be killed early the moment soil saturation is reached. The **saturation threshold defaults to 85%** and is fetched dynamically from settings on every poll, so it reflects the active crop.

---

## Hardware Status

The system distinguishes between the **ESP32 hardware device** and the **software simulation**:

| Status | Source | Meaning |
|--------|--------|---------|
| `ONLINE` | MQTT `pwos/system/hardware` | A real ESP32 is publishing sensor data |
| `OFFLINE` | No hardware heartbeat | No real device connected |

When hardware is `OFFLINE`, the Decision Engine issues `STOP / HARDWARE_OFFLINE` for any watering request. The simulation stack can still run — the hardware flag is independent of the data pipeline.

---

## System Startup Sequence

```
1. app.py starts → initialises Flask, PostgreSQL pool (1–20 connections), MLPredictor
2. MQTT client connects to broker (localhost:1883)
3. Subscribes to: pwos/sensor/data | pwos/weather/current | pwos/system/mode | pwos/system/hardware
4. system_state initialised: { mode: AUTO, pump_active: False, hardware_status: OFFLINE }
5. automation_controller.py starts → polls /api/health until 200 OK (max 30 retries × 2s)
6. Autopilot enters 5-second control loop
```

---

## The Prediction Request — What the Brain Sees

Every 5-second cycle, the autopilot calls `GET /api/predict-next-watering`. The brain (`app.py`) assembles this data before calling the ML model:

```python
current_data = {
    # From latest MQTT sensor message
    'soil_moisture': float,
    'temperature': float,
    'humidity': float,
    'timestamp': ISO-8601 string,

    # From weather API (OpenWeatherMap or simulator)
    'forecast_minutes': int,       # Minutes until next rain (0 = no rain forecast)
    'wind_speed': float,           # km/h
    'rain_intensity': float,       # 0–100 scale
    'precipitation_chance': int,   # 0–100 %
    'cloud_cover': float,          # 0–100 %
    'forecast_temp': float,        # °C
    'forecast_humidity': float,    # %
    'weather_condition': str,      # 'Clear', 'Rain', 'Clouds', etc.
    'weather_source': str,         # 'openweathermap' | 'simulation' | 'fallback' | 'stale'
}
```

This assembled dict is passed to `MLPredictor.predict_next_watering()`, which returns the full decision response.

---

## The Prediction Response — What the Autopilot Gets

```json
{
    "recommended_action": "NOW",
    "recommended_duration": 30,
    "current_moisture": 28.5,
    "hardware_status": "ONLINE",
    "ml_analysis": {
        "prediction": 1,
        "confidence": 87.3,
        "probability_class_1": 87.3,
        "recommended_action": "NOW",
        "recommended_duration": 30,
        "system_status": "DRY_TRIGGER",
        "reason": "Water pump is turned ON (Moisture 28.5% below target limit 45.0%).",
        "features_used": { ... }
    }
}
```

The autopilot reads `recommended_action` and `recommended_duration` and executes accordingly.

---

## System Status Codes (Complete List)

| Status Code | Action | Trigger |
|-------------|--------|---------|
| `CRITICAL` | NOW | Moisture < CRITICAL threshold |
| `DRY_TRIGGER` | NOW | Moisture < LOW threshold, conditions OK |
| `PREHEAT` | NOW | Moisture in proactive zone, 04:00–06:00, extreme VPD predicted |
| `EMERGENCY` | NOW | Critical moisture overriding rain / wind block |
| `VPD_DELAY` | STALL | VPD > 2.0 kPa during 10:00–16:00 hot hours |
| `WIND_DELAY` | STALL | Wind > 20 km/h, moisture not critical |
| `RAIN_EXPECTED` | STALL | Rain forecast within confidence window |
| `RAINING` | STOP | `rain_intensity > 0` currently |
| `SATURATED` | STOP | Moisture > 85% |
| `HARDWARE_OFFLINE` | STOP | `hardware_status != ONLINE` |
| `WATCHING` | MONITOR | Moisture in proactive zone, no PREHEAT conditions |
| `OPTIMAL` | MONITOR | Moisture above proactive threshold |
| `FALSE_DRY_CHECK` | MONITOR | Wind > 20 km/h + humidity < 40% + rapid moisture drop |
| `SENSOR_ERROR` | STOP | Moisture < 1.0% or sensor flatline detected |
| `STABLE` | MONITOR | Default baseline |

---

## 15-Minute Cooldown

After a watering cycle completes, the autopilot enforces a **15-minute cooldown** (`900 seconds`). Even if the Brain recommends NOW again immediately, the action is overridden to STALL with reason "Watering in cooldown." This prevents the pump from running again before the water has time to percolate into the soil and be reflected in the sensor reading.

---

## Key Design Principles

1. **Safety first, performance second.** Safety overrides (saturation, critical moisture, sensor error) always win regardless of ML confidence.
2. **Log noise is minimised.** State-change-only logging keeps logs actionable, not cluttered.
3. **Resilient polling.** The autopilot never crashes on a network error — it logs and retries.
4. **Dynamic thresholds.** Crop and region settings are fetched from the API on every cycle, meaning a settings change takes effect within 5 seconds.

---

*P-WOS v2.0 | System Behaviour — System Overview*
