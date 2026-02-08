# P-WOS Database Guide

**Complete Database Setup for Contributors**

---

## Quick Start

### Option 1: Use Existing Database (Recommended)
Copy the database file directly:
```bash
# The database is already included in the repository
data/pwos_simulation.db
```

### Option 2: Import from SQL Exports
```bash
# Create empty database
python -c "import sqlite3; sqlite3.connect('data/pwos_simulation.db').close()"

# Import schema
sqlite3 data/pwos_simulation.db < data/exports/schema.sql

# Import sample data
sqlite3 data/pwos_simulation.db < data/exports/sample_data.sql
```

### Option 3: Create Fresh Database
```bash
python src/backend/database.py
```

---

## Database Overview

| Attribute | Value |
|-----------|-------|
| **Engine** | SQLite 3 |
| **File** | `data/pwos_simulation.db` |
| **Size** | ~565 KB |
| **Tables** | 5 |

### Current Statistics
| Table | Rows |
|-------|------|
| `sensor_readings` | 6,273 |
| `watering_events` | 120 |
| `predictions` | Varies |
| `system_logs` | Varies |

---

## Schema Reference

### 1. sensor_readings (Core Data)
Stores all sensor telemetry from ESP32.

```sql
CREATE TABLE sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    soil_moisture REAL NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    device_id TEXT DEFAULT 'SIM_ESP32_001'
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key |
| `timestamp` | DATETIME | When reading was recorded |
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
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER NOT NULL,
    trigger TEXT NOT NULL,
    moisture_before REAL,
    moisture_after REAL
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER | Auto-increment primary key |
| `timestamp` | DATETIME | When pump activated |
| `duration` | INTEGER | Pump duration in seconds |
| `trigger` | TEXT | 'AUTO', 'MANUAL', or 'ML' |
| `moisture_before` | REAL | Moisture before watering |
| `moisture_after` | REAL | Moisture after watering |

---

### 3. predictions (ML Decisions)
Logs ML model predictions.

```sql
CREATE TABLE predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    action TEXT NOT NULL,
    confidence REAL,
    features TEXT
);
```

| Column | Type | Description |
|--------|------|-------------|
| `action` | TEXT | 'WATER_NOW', 'STALL', 'WAIT' |
| `confidence` | REAL | Prediction confidence 0-100 |
| `features` | TEXT | JSON of 17 input features |

---

### 4. system_logs (Activity Log)
System events and messages.

```sql
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
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
    strftime('%H', timestamp) as hour,
    AVG(soil_moisture) as avg_moisture
FROM sensor_readings
GROUP BY hour
ORDER BY hour;
```

### Get Readings for Training Data
```sql
SELECT 
    r.*,
    strftime('%H', r.timestamp) as hour,
    strftime('%w', r.timestamp) as day_of_week
FROM sensor_readings r
ORDER BY r.timestamp DESC
LIMIT 10000;
```

---

## Python Usage

### Connect to Database
```python
import sqlite3

conn = sqlite3.connect('data/pwos_simulation.db')
cursor = conn.cursor()

# Query example
cursor.execute("SELECT * FROM sensor_readings ORDER BY id DESC LIMIT 10")
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
```

### Using database.py Module
```python
from src.backend.database import Database

db = Database()

# Get latest reading
latest = db.get_latest_reading()
print(f"Moisture: {latest['soil_moisture']}%")

# Get history
history = db.get_readings(limit=100)

# Log watering event
db.log_watering_event(duration=30, trigger='AUTO')
```

---

## Export & Import

### Export Current Database
```bash
python scripts/export_database.py
```

Creates:
- `data/exports/schema.sql` - Table definitions
- `data/exports/sample_data.sql` - Sample data

### Backup Database
```bash
# Windows
copy data\pwos_simulation.db data\backups\pwos_%DATE%.db

# Linux/Mac
cp data/pwos_simulation.db data/backups/pwos_$(date +%Y%m%d).db
```

### Reset Database
```bash
# Delete existing
del data\pwos_simulation.db

# Recreate
python src/backend/database.py
```

---

## Troubleshooting

### "Database is locked"
```bash
# Find processes using the database
tasklist | findstr python

# Kill if needed
taskkill /F /PID <process_id>
```

### "No such table"
```bash
# Recreate schema
python src/backend/database.py
```

### "Corrupt database"
```bash
# Restore from backup or regenerate
del data\pwos_simulation.db
python src/backend/database.py
python src/simulation/data_generator.py
```

---

## For Contributors

### Setting Up Your Development Database

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd pwos
   ```

2. **Database is included** - `data/pwos_simulation.db` is in the repo

3. **Or create fresh database with sample data:**
   ```bash
   python src/backend/database.py
   python src/simulation/esp32_simulator.py 100
   ```

4. **Verify setup:**
   ```bash
   python -c "from src.backend.database import Database; db = Database(); print(f'Readings: {db.get_readings_count()}')"
   ```

---

## Migration to PostgreSQL (Future)

For cloud deployment, migrate to PostgreSQL:

```python
# Connection string change
# SQLite: sqlite:///data/pwos_simulation.db
# PostgreSQL: postgresql://user:pass@host:5432/pwos

# Schema changes:
# AUTOINCREMENT → SERIAL
# DATETIME → TIMESTAMP
# TEXT → VARCHAR(255)
```
