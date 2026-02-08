# data/ - Data Storage

**P-WOS Databases, Training Data, and Scenarios**

---

## 📁 Structure

```
data/
├── pwos_simulation.db       # Main SQLite database (565KB)
├── training_sim.db          # Training simulation DB (717KB)
├── training_data.csv        # ML training data (817KB, main)
├── real_training_data.csv   # Real sensor data (39KB)
├── synthetic_training_data.csv # Generated scenarios
│
├── scenarios.txt            # Test scenario definitions
├── ML Plant Watering_ Extreme Scenarios.md  # Edge cases
├── Bulawayo, Zimbabwe.txt   # Weather history data
├── raw_weather_history.json # Weather API cache
│
└── scenario_results/        # Test run outputs
    └── (4 files)
```

---

## Key Files

| File | Size | Description |
|------|------|-------------|
| `pwos_simulation.db` | 565KB | Main SQLite (sensor readings, logs) |
| `training_data.csv` | 817KB | ML training dataset |
| `training_sim.db` | 717KB | Training data collection |
| `scenarios.txt` | 7KB | 50+ test scenarios |

---

## Database Schema

### `sensor_readings` Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | DATETIME | Reading time |
| soil_moisture | REAL | 0-100% |
| temperature | REAL | Celsius |
| humidity | REAL | 0-100% |
| device_id | TEXT | Sensor ID |

### `watering_events` Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | DATETIME | Event time |
| duration | INTEGER | Seconds |
| trigger | TEXT | AUTO/MANUAL |

---

## Training Data Columns

```csv
timestamp,soil_moisture,temperature,humidity,
hour,day_of_week,is_daytime,is_hot_hours,
moisture_rolling_6,temp_rolling_6,moisture_change_rate,
forecast_minutes,needs_water,vpd,is_extreme_vpd,
wind_speed,rain_intensity,is_raining,is_high_wind
```

**Total Features:** 17 (for ML model)
