# Data Details

## Overview
The data folder stores **databases, training datasets, and scenario definitions** for the P-WOS system.

---

## Which Files & Why

### `pwos_simulation.db` (565KB) - Main Database
**Why:** Persistent storage for sensor readings and events.  
**How:** SQLite database with 2 main tables.

**Schema:**
```sql
CREATE TABLE sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    soil_moisture REAL NOT NULL,
    temperature REAL NOT NULL,
    humidity REAL NOT NULL,
    device_id TEXT DEFAULT 'SIM_ESP32_001'
);

CREATE TABLE watering_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER NOT NULL,
    trigger TEXT NOT NULL  -- 'AUTO' or 'MANUAL'
);
```

**Why SQLite?**
- Zero configuration
- Single file = portable
- ACID compliant
- Sufficient for single-system
- Easy backup (copy file)

### `training_data.csv` (817KB) - ML Training Set
**Why:** Model needs labeled examples to learn.  
**How:** Generated from simulation with both watering and non-watering scenarios.

**Columns (17 Features + Label):**
| Category | Features |
|----------|----------|
| Sensor | soil_moisture, temperature, humidity |
| Time | hour, day_of_week, is_daytime, is_hot_hours |
| Rolling | moisture_rolling_6, temp_rolling_6, moisture_change_rate |
| Weather | forecast_minutes, rain_intensity, wind_speed, is_raining |
| Derived | vpd, is_extreme_vpd, is_high_wind |
| **Label** | **needs_water** (0 or 1) |

**Dataset Statistics:**
- ~10,000 rows
- 60% class 0 (no water needed)
- 40% class 1 (water needed)
- Balanced with SMOTE during training

### `scenarios.txt` (7KB) - Test Definitions
**Why:** Reproducible test cases for edge conditions.  
**How:** Text file defining 50+ scenarios.

**Scenario Categories:**
1. **Normal** - Typical daily operation
2. **Heatwave** - Extreme VPD conditions
3. **Rain** - Various intensities
4. **Sensor Failure** - NaN, stuck, spike
5. **Pump Failure** - No response to command

### `ML Plant Watering_ Extreme Scenarios.md`
**Why:** Document edge cases ML must handle.  
**How:** Markdown describing tricky scenarios.

**Examples:**
- Night watering after hot day
- Rain predicted but delayed
- False dry reading from wind

---

## Data Flow

### Collection Pipeline
```
ESP32 Simulator
      │
      ▼ publish
MQTT Broker (topic: pwos/sensor/data)
      │
      ▼ subscribe
mqtt_subscriber.py
      │
      ▼ INSERT
pwos_simulation.db
      │
      ▼ SELECT (API query)
Dashboard
```

### Training Pipeline
```
pwos_simulation.db
      │
      ▼ data_collector.py
training_data.csv
      │
      ▼ train_model.py
rf_model.pkl + model_metadata.json
      │
      ▼ ml_predictor.py
Real-time predictions
```

---

## Design Decisions

### Why CSV for Training Data?
- Universal format
- Easy to inspect/edit
- Pandas reads efficiently
- Version control friendly
- Portable between systems

### Why Separate Training DB?
- Avoid data leakage
- Clean training environment
- Can regenerate without affecting production

### Data Retention Policy
| Data Type | Retention |
|-----------|-----------|
| Sensor readings | 30 days |
| Watering events | Forever |
| Training data | Permanent |

---

## Backup Strategy

```bash
# Database backup
copy data\pwos_simulation.db data\backups\pwos_YYYYMMDD.db

# Training data is git-tracked
git add data\training_data.csv
```
