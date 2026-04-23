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
| **Tables** | 4 |

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
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    soil_moisture REAL NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    device_id TEXT DEFAULT 'SIM_ESP32_001'
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment primary key |
| `timestamp` | TIMESTAMP | When reading was recorded |
| `soil_moisture` | REAL | Soil moisture 0-100% |
| `temperature` | REAL | Temperature in Celsius |
| `humidity` | REAL | Relative humidity 0-100% |
| `device_id` | TEXT | Sensor device identifier |

**Indexes:**
```sql
CREATE INDEX idx_readings_timestamp ON sensor_readings(timestamp);
```

---

### 2. watering_events (Pump Activity)
Records every pump activation.

```sql
CREATE TABLE watering_events (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER NOT NULL,
    trigger TEXT NOT NULL,
    moisture_before REAL,
    moisture_after REAL
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-increment primary key |
| `timestamp` | TIMESTAMP | When pump activated |
| `duration` | INTEGER | Pump duration in seconds |
| `trigger` | TEXT | 'AUTO', 'MANUAL', or 'ML' |
| `moisture_before` | REAL | Moisture before watering |
| `moisture_after` | REAL | Moisture after watering |

---

### 3. predictions (ML Decisions)
Logs ML model predictions.

```sql
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    action TEXT NOT NULL,
    confidence REAL,
    features TEXT
);
```

| Column | Type | Description |
|--------|------|-------------|
| `action` | TEXT | 'WATER_NOW', 'STALL', 'WAIT', 'HARDWARE_OFFLINE' |
| `confidence` | REAL | Prediction confidence 0-100 |
| `features` | TEXT | JSON of 17 input features |

---

### 4. system_logs (Activity Log)
System events and messages.

```sql
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'INFO'
);
```

| Type Values |
|-------------|
| `INFO`, `WARNING`, `ERROR`, `ACTION`, `SYSTEM` |

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

## Python Usage

### Using database.py Module
```python
from src.backend.database import PWOSDatabase

db = PWOSDatabase()

# Get latest reading
latest = db.get_latest_reading()
print(f"Moisture: {latest['soil_moisture']}%")

# Get history
history = db.get_readings(limit=100)

# Log watering event
db.log_watering_event(duration=30, trigger='AUTO')

# Get aggregated analytics data
aggregated = db.get_aggregated_data(hours=24, interval_seconds=900)
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
psql -U postgres -d pwos -c "DROP TABLE IF EXISTS sensor_readings, watering_events, predictions, system_logs CASCADE;"
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
