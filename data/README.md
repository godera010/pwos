# data/ - Data & Simulation Hub 🧠

<!-- NAV_START -->
<div align="center">
  <a href="..\README.md">🏠 Home (Root)</a> |
  <a href="..\src\README.md">💻 Source Code</a> |
  <a href="..\docs\README.md">📚 Documentation</a> |
  <a href="..\docs\hardware\README.md">⚙️ Hardware</a> |
  <a href="README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->


Central storage for P-WOS simulation artifacts, training datasets, and raw inputs.

---

## 📂 Directory Structure

```graphql
data/
├── database/            # 🗄️ Storage
│   ├── pwos_simulation.db   # Main SQLite simulation database (Source for training)
│   └── schemas/             # SQL definitions (schema.sql, etc.)
│
├── processed/           # ⚙️ Machine Learning Ready
│   ├── training_data.csv    # Final Feature-Engineered Dataset
│   ├── synthetic_*.csv      # Generated scenario data
│   └── simulation_logs/     # JSON logs from specific test runs
│
├── raw/                 # 🧱 Source Material
│   ├── raw_weather_history.json
│   └── scenarios.txt        # Scenario definitions
│
└── docs/                # 📝 Documentation
    ├── Extreme_Scenarios.md # Edge case definitions
    └── README.md            # You are here
```

---

## 🔑 Key Files

| Category | File | Description |
|----------|------|-------------|
| **Database** | `pwos_simulation.db` | The sandbox database where `data_generator.py` stores 90 days of simulated sensor data. |
| **Training** | `training_data.csv` | The "Cleaned" dataset used by `train_model.py`. Derived from the DB, with added features (Rolling Averages, VPD). |
| **Raw** | `raw_weather_history.json` | Real-world weather data used to seed the simulation with realistic patterns. |

---

## 📊 Database Schema (SQLite)

### `sensor_readings`
The simulation logs every "tick" (15 mins) here.
| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | DATETIME | Event Time |
| `soil_moisture` | REAL | 0-100% |
| `temperature` | REAL | Celsius |
| `humidity` | REAL | % |
| `forecast_minutes`| INTEGER | Rain prediction buffer |

### `watering_events`
Tracks when the system decided to turn the pump on.
| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | DATETIME | Event Time |
| `duration_seconds`| INTEGER | How long pump ran |
| `trigger_type` | TEXT | `THRESHOLD` (Reactive) or `ML` (AI) |

---

## 🤖 Feature Engineering
The **CSV** files in `processed/` contain extra calculated fields used for training:

*   **`moisture_rolling_6`**: Average moisture over last 1.5 hours.
*   **`vpd`**: Vapor Pressure Deficit (Plant stress level).
*   **`moisture_change_rate`**: How fast the soil is drying (derivative).
*   **`is_hot_hours`**: Boolean flag for peak sun (10:00 - 16:00).
\n\n