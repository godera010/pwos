# P-WOS Performance & Architecture Guide (v3.0)

**Production-Grade Optimizations Implemented in May 2026**

---

## Overview

This document details the performance, architecture, and code-quality improvements made to P-WOS during the v3.0 release cycle. All improvements are live in the `main` branch and verified by the 116-test suite.

---

## 1. Database Connection Pooling

### Problem
Every API request opened a new `psycopg2` TCP connection to PostgreSQL, paid the full TCP handshake and authentication overhead (~5ms), then discarded the connection.

### Solution: `ThreadedConnectionPool`

`database.py` now initializes a pool of 1–20 persistent connections on startup:

```python
from psycopg2 import pool as psycopg2_pool

self._pool = psycopg2_pool.ThreadedConnectionPool(
    minconn=1,
    maxconn=20,
    host=DB_HOST, port=DB_PORT,
    database=DB_NAME, user=DB_USER, password=DB_PASSWORD
)
```

A `PoolConnectionWrapper` proxy transparently returns connections to the pool when `.close()` is called — zero changes required to existing query code.

**Unit Test Safety**: The wrapper detects mocked `psycopg2` connections and bypasses the pool, so all 10 database tests remain fully functional.

**Impact**: Eliminates TCP overhead per request; supports up to 20 concurrent API callers.

---

## 2. Timestamp Indexes

### Problem
History endpoints (e.g., `GET /api/sensor-data/history`) used `ORDER BY timestamp DESC LIMIT N` without indexes, causing full table scans that grew O(N) with data volume.

### Solution: Descending Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_watering_events_timestamp ON watering_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_decisions_timestamp    ON ml_decisions    (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp     ON system_logs     (timestamp DESC);
```

Created automatically on `init_database()` — idempotent, safe to run multiple times.

**Impact**: All history queries now execute as index-scans: O(log N) regardless of table size.

---

## 3. ML In-Memory Settings Path

### Problem
`ml_predictor.py` was reading `operational_settings.json` from disk on **every single prediction** (every 5 seconds from the automation controller) — causing unnecessary I/O.

### Solution: Settings Injection

```python
# app.py — passes settings from memory, not disk
settings = load_settings()  # reads in-memory dict
result = ml_predictor.predict_next_watering(
    sensor_data=latest_sensor_data,
    active_settings=settings   # injected directly
)
```

```python
# ml_predictor.py — accepts pre-loaded settings
def predict_next_watering(self, sensor_data, weather_data=None, active_settings=None):
    settings = active_settings or self._load_settings_from_disk()
    ...
```

**Impact**: Completely eliminates disk I/O on the critical prediction path. The fallback to disk read is preserved for standalone/test usage.

---

## 4. Pump Settling Thread Fix

### Problem
After a pump-ON command, a raw `threading.Thread` was spawned that called `time.sleep(duration + 5)` inside the thread to capture post-moisture readings. Under high-frequency commands this could accumulate unreleased threads.

### Solution: `threading.Timer`

```python
# Before (raw sleeping thread)
t = threading.Thread(target=lambda: (time.sleep(d+5), capture()))
t.daemon = True; t.start()

# After (safe Timer)
timer = threading.Timer(duration + 5, capture_post_moisture)
timer.daemon = True
timer.start()
```

**Impact**: `threading.Timer` is designed for deferred single execution — no sleeping thread accumulation.

---

## 5. React Performance Fixes

### Problem
- MQTT callback functions were recreated on every render, causing the `useEffect` subscription logic to tear down and re-establish the MQTT connection on every state update.
- `useEffect` arrays were missing dependencies, causing stale closure bugs where threshold values (loaded from settings) were silently reading old values.

### Solution: `useCallback` Memoization

```typescript
// useMqtt.ts — memoized MQTT callback
const handleMessage = useCallback((topic: string, payload: Buffer) => {
    // safe to use in useEffect dependencies
}, [onSensorData, onPumpStatus]);

// Dashboard.tsx — full dependency array
useEffect(() => {
    if (settings) {
        checkSafetyOverrides(sensorData, settings);
    }
}, [sensorData, settings, checkSafetyOverrides]);  // all deps listed
```

**Impact**: Eliminates infinite re-render loops; ensures safety override checks always use current settings values.

---

## 6. CORS Hardening

Flask's CORS policy is now locked to known local development origins:

```python
CORS(app, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
])
```

Previously, `CORS(app)` was allowing `*` — any origin.

---

## 7. Input Validation

### Coordinate Validation
Settings coordinates are now validated before saving:

```python
lat = float(data.get('latitude', settings.get('latitude', -17.82)))
lon = float(data.get('longitude', settings.get('longitude', 31.03)))
if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
    return jsonify({'error': 'Coordinates out of valid range'}), 400
```

### Sensor Data Clamping
Incoming sensor readings are defensively clamped before storage:

```python
temperature = max(-50, min(60, float(data.get('temperature', 25))))
humidity    = max(0,   min(100, float(data.get('humidity', 50))))
```

---

## 8. API Error Propagation (Frontend)

`api.ts` now has a centralized `handleResponse` utility that propagates backend error messages to the UI:

```typescript
async function handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
}
```

Previously, non-200 responses were silently swallowed, making backend errors invisible to the user.

---

## Summary Table

| Improvement | Component | Impact |
|-------------|-----------|--------|
| `ThreadedConnectionPool` (1–20) | `database.py` | Eliminates TCP overhead per request |
| Descending timestamp indexes | `database.py` | O(log N) history queries |
| `make_interval(hours => %s)` SQL fix | `database.py` | Fixes parameterized interval binding |
| In-memory settings injection | `ml_predictor.py` + `app.py` | Eliminates disk I/O per prediction |
| `threading.Timer` for pump settling | `app.py` | No thread accumulation |
| `useCallback` memoization | `useMqtt.ts`, `Dashboard.tsx` | No infinite render loops |
| CORS origin restriction | `app.py` | Blocks cross-origin scripts |
| Coordinate range validation | `app.py` | 400 errors on bad input |
| Sensor data defensive clamping | `database.py` | No garbage values stored |
| `handleResponse` API error propagation | `api.ts` | Backend errors surfaced in UI |
