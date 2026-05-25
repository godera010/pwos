# P-WOS Database Guide

**Complete Database Setup for Contributors**

---

## Quick Start

### Option 1: Fresh Database (Recommended)
```bash
# 1. Ensure PostgreSQL is running
# 2. Create the database
psql -U postgres -c "CREATE DATABASE pwos;"

# 3. Initialize tables (auto-creates schema)
python src/backend/database.py
```

### Option 2: Restore from Backup
```bash
# Restore a pg_dump backup
psql -U postgres -d pwos < data/backups/pwos_backup.sql
```

---

## Database Overview

| Attribute | Value |
|-----------|-------|
| **Engine** | PostgreSQL 15+ |
| **Connection** | Configured in `src/config.py` |
| **Default Host** | `localhost:5432` |
| **Default Name** | `pwos` |
| **Driver** | psycopg2 (Python) |
| **Connection Pool** | `ThreadedConnectionPool` (min=1, max=20) |
| **Tables** | 5 |

### Connection Configuration (`src/config.py`)
```python
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "pwos")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
```

---

## Schema Reference

### 1. sensor_readings (Core Data)
Stores all sensor telemetry from ESP32 hardware or simulator.

```sql
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    soil_moisture REAL,
    temperature REAL,
    humidity REAL,
    device_id TEXT,
    forecast_minutes INTEGER DEFAULT 0,
    wind_speed REAL DEFAULT 0.0,
    precipitation_chance INTEGER DEFAULT 0,
    vpd REAL DEFAULT 0.0,
    rain_intensity REAL DEFAULT 0.0,
    cloud_cover REAL DEFAULT 0.0,
    forecast_temp REAL DEFAULT 0.0,
    forecast_humidity REAL DEFAULT 0.0,
    weather_condition TEXT DEFAULT 'unknown',
    weather_source TEXT DEFAULT 'none'
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment primary key |
| `timestamp` | TIMESTAMP | When reading was recorded |
| `soil_moisture` | REAL | Soil moisture 0–100% |
| `temperature` | REAL | Temperature in Celsius |
| `humidity` | REAL | Relative humidity 0–100% |
| `device_id` | TEXT | Sensor device identifier |
| `forecast_minutes` | INTEGER | Minutes until predicted rain |
| `wind_speed` | REAL | Wind speed in km/h |
| `precipitation_chance` | INTEGER | Rain probability 0–100% |
| `vpd` | REAL | Vapor Pressure Deficit (kPa) |
| `rain_intensity` | REAL | Current rain intensity |
| `cloud_cover` | REAL | Cloud cover percentage |
| `forecast_temp` | REAL | Forecasted temperature |
| `forecast_humidity` | REAL | Forecasted humidity |
| `weather_condition` | TEXT | Weather condition string |
| `weather_source` | TEXT | Data source (openweathermap/simulation/fallback) |

---

### 2. watering_events (Pump Activity)
Records every pump activation.

```sql
CREATE TABLE watering_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    duration_seconds INTEGER,
    trigger_type TEXT,
    moisture_before REAL,
    moisture_after REAL
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment primary key |
| `timestamp` | TIMESTAMP | When pump activated |
| `duration_seconds` | INTEGER | Pump duration in seconds |
| `trigger_type` | TEXT | 'AUTO', 'MANUAL', or 'ML' |
| `moisture_before` | REAL | Moisture before watering |
| `moisture_after` | REAL | Moisture after watering |

---

### 3. system_logs (Activity Log)
System events and messages.

```sql
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    level TEXT,
    source TEXT,
    message TEXT
);
```

| Column | Type | Description |
|--------|------|-------------|
| `level` | TEXT | `INFO`, `WARNING`, `ERROR` |
| `source` | TEXT | Component name (e.g. `SYSTEM`, `ML`, `MQTT`) |
| `message` | TEXT | Log message content |

---

### 4. ml_decisions (ML Audit Trail)
Logs every ML prediction for audit and retraining purposes.

```sql
CREATE TABLE ml_decisions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    soil_moisture REAL,
    temperature REAL,
    humidity REAL,
    vpd REAL,
    forecast_minutes INTEGER DEFAULT 0,
    precipitation_chance INTEGER DEFAULT 0,
    wind_speed REAL DEFAULT 0.0,
    rain_intensity REAL DEFAULT 0.0,
    decay_rate REAL,
    decision TEXT,
    confidence REAL,
    reason TEXT,
    recommended_duration INTEGER DEFAULT 0,
    features_json TEXT
);
```

| Column | Type | Description |
|--------|------|-------------|
| `decision` | TEXT | `NOW`, `STALL`, `STOP`, `MONITOR` |
| `confidence` | REAL | Prediction confidence 0–100 |
| `decay_rate` | REAL | Predicted moisture loss rate (%/hr) |
| `reason` | TEXT | Human-readable decision explanation |
| `features_json` | TEXT | JSON of all input features used |

---

### 5. model_versions (ML Model Registry)
Tracks trained model versions for rollback and comparison.

```sql
CREATE TABLE model_versions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    version_tag TEXT,
    accuracy REAL,
    precision REAL,
    recall REAL,
    f1_score REAL,
    training_samples INTEGER,
    model_path TEXT,
    is_active BOOLEAN
);
```

| Column | Type | Description |
|--------|------|-------------|
| `version_tag` | TEXT | e.g. `v20260319_092225` |
| `accuracy` | REAL | Model accuracy on test set |
| `precision` / `recall` / `f1_score` | REAL | Classification metrics |
| `training_samples` | INTEGER | Number of samples used |
| `is_active` | BOOLEAN | Whether this is the active model |

---

## Common Queries

### Get Latest Sensor Reading
```sql
SELECT * FROM sensor_readings 
ORDER BY timestamp DESC 
LIMIT 1;
```

### Get Daily Water Usage
```sql
SELECT 
    DATE(timestamp) as date,
    SUM(duration) as total_seconds,
    COUNT(*) as pump_cycles
FROM watering_events
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### Get Average Moisture by Hour
```sql
SELECT 
    EXTRACT(HOUR FROM timestamp) as hour,
    AVG(soil_moisture) as avg_moisture
FROM sensor_readings
GROUP BY hour
ORDER BY hour;
```

### Get Aggregated Data (15-minute buckets)
This is the query used by the Analytics dashboard:
```sql
SELECT 
    DATE_TRUNC('minute', timestamp) 
        - (EXTRACT(MINUTE FROM timestamp)::int % 15) * INTERVAL '1 minute' as bucket,
    AVG(soil_moisture) as avg_moisture,
    AVG(temperature) as avg_temp,
    AVG(humidity) as avg_humidity,
    COUNT(*) as reading_count
FROM sensor_readings
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY bucket
ORDER BY bucket;
```

### Get Readings for Training Data
```sql
SELECT 
    r.*,
    EXTRACT(HOUR FROM r.timestamp) as hour,
    EXTRACT(DOW FROM r.timestamp) as day_of_week
FROM sensor_readings r
ORDER BY r.timestamp DESC
LIMIT 10000;
```

---

## Connection Pooling

`database.py` uses a **`ThreadedConnectionPool`** (min=1, max=20 connections). Connections are borrowed from the pool, used, and automatically returned on `close()` via the `PoolConnectionWrapper` proxy:

```python
# How pooling works internally (simplified)
conn = self._pool.getconn()      # borrow from pool
try:
    cursor = conn.cursor()
    cursor.execute(...)           # your query
    conn.commit()
finally:
    self._pool.putconn(conn)     # return to pool
```

The `PoolConnectionWrapper` is transparent — all existing query code continues to call `.cursor()`, `.commit()`, and `.close()` as normal.

**Unit Test Safety**: The wrapper detects mocked `psycopg2` connections in tests and bypasses the pool, ensuring 100% test compatibility.

---

## Performance Indexes

The following descending timestamp indexes are created automatically on `init_database()`:

```sql
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp ON sensor_readings (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_watering_events_timestamp ON watering_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_decisions_timestamp    ON ml_decisions    (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp     ON system_logs     (timestamp DESC);
```

**Impact**: All `ORDER BY timestamp DESC LIMIT N` queries (used by every history endpoint) are now index-scans (O(log N)) instead of full-table scans (O(N)).

---

## Python Usage

### Using database.py Module
```python
from src.backend.database import PWOSDatabase

db = PWOSDatabase()  # pool initialized automatically

# Get latest reading (returns list of dicts)
latest = db.get_recent_readings(limit=1)
print(f"Moisture: {latest[0]['soil_moisture']}%")

# Get recent history
history = db.get_recent_readings(limit=100)

# Log watering event
db.insert_watering_event(duration=30, trigger_type='AUTO', moisture_before=35.0)

# Get aggregated analytics data
sensors, events = db.get_aggregated_data(hours=24, interval_seconds=900)
```

### Direct psycopg2 Connection
```python
import psycopg2
from src.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

conn = psycopg2.connect(
    host=DB_HOST, port=DB_PORT,
    database=DB_NAME, user=DB_USER,
    password=DB_PASSWORD
)
cursor = conn.cursor()

cursor.execute("SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 10")
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
```

---

## Backup & Restore

### Backup Database
```bash
# Full backup
pg_dump -U postgres pwos > data/backups/pwos_$(date +%Y%m%d).sql

# Windows
pg_dump -U postgres pwos > data\backups\pwos_backup.sql
```

### Restore Database
```bash
# Drop and recreate
psql -U postgres -c "DROP DATABASE IF EXISTS pwos;"
psql -U postgres -c "CREATE DATABASE pwos;"
psql -U postgres -d pwos < data/backups/pwos_backup.sql
```

### Reset Database (Fresh Start)
```bash
# Drop all tables and recreate schema
psql -U postgres -d pwos -c "DROP TABLE IF EXISTS sensor_readings, watering_events, system_logs, ml_decisions, model_versions CASCADE;"
python src/backend/database.py
```

---

## Troubleshooting

### "Connection refused"
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Start PostgreSQL (Windows)
net start postgresql-x64-15

# Start PostgreSQL (Linux)
sudo systemctl start postgresql
```

### "Database does not exist"
```bash
psql -U postgres -c "CREATE DATABASE pwos;"
```

### "Password authentication failed"
Check your `DB_PASSWORD` in `src/config.py` or set the environment variable:
```bash
set DB_PASSWORD=your_password
```

### "No such table"
```bash
# Recreate schema
python src/backend/database.py
```

---

## For Contributors

### Setting Up Your Development Database

1. **Install PostgreSQL 15+**
   - Download from [postgresql.org](https://www.postgresql.org/download/)

2. **Create the database:**
   ```bash
   psql -U postgres -c "CREATE DATABASE pwos;"
   ```

3. **Initialize schema:**
   ```bash
   python src/backend/database.py
   ```

4. **Seed with simulation data (optional):**
   ```bash
   python src/simulation/esp32_simulator.py
   # Let it run for a few minutes, then stop with Ctrl+C
   ```

5. **Verify setup:**
   ```bash
   psql -U postgres -d pwos -c "SELECT COUNT(*) FROM sensor_readings;"
   ```

---

## Migration History

| Date | Migration | Notes |
|------|-----------|-------|
| Feb 2026 | SQLite (initial) | Prototype database, file-based |
| Apr 2026 | **PostgreSQL** | Production migration — `DATE_TRUNC` aggregation, concurrent access, connection pooling |
| May 2026 | **v3.0 Optimizations** | Added `ThreadedConnectionPool` (1–20), `PoolConnectionWrapper`, descending timestamp indexes, `make_interval(hours => %s)` SQL parameter fix |
