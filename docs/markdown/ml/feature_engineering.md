# Feature Engineering & Physics Calculations

**P-WOS Machine Learning — Input Vectors and Environmental Calculations**

---

## 1. Input Feature Space (12 Base Features)

The Random Forest model accepts exactly **12 base features** in positional order at inference time:

| # | Feature Name | Type | Range / Units | Source | Role in Decision |
|---|---|---|---|---|---|
| 1 | `soil_moisture` | `float` | 0–100 % | Soil sensor | Primary drought signal |
| 2 | `temperature` | `float` | °C | DHT11 Sensor | Evapotranspiration proxy |
| 3 | `humidity` | `float` | 0–100 % | DHT11 Sensor | VPD component |
| 4 | `wind_speed` | `float` | km/h | Weather forecast | Evaporation accelerator |
| 5 | `rain_intensity` | `float` | 0–100 | Weather forecast | Suppresses watering need |
| 6 | `vpd` | `float` | kPa | Calculated | Atmospheric water demand |
| 7 | `is_extreme_vpd` | `binary` | 0 or 1 | Derived (VPD > 2.0) | Heatwave stress flag |
| 8 | `is_raining` | `binary` | 0 or 1 | Derived (Rain > 0) | Natural watering flag |
| 9 | `is_high_wind` | `binary` | 0 or 1 | Derived (Wind > 20) | Evaporation risk flag |
| 10 | `crop_target_moisture` | `float` | % | Active settings | Target moisture ceiling |
| 11 | `crop_critical_moisture` | `float` | % | Active settings | Emergency-trigger floor |
| 12 | `region_evap_multiplier` | `float` | dimensionless | Region settings | Regional climate scaling |

---

## 2. Derived Temporal Features (8 Appended Features)

In addition to the 12 base features, **8 temporal features** are calculated from the sensor history buffers on every 5-second tick:

| Feature | Calculation | Window | Purpose |
|---|---|---|---|
| `moisture_change_rate` | $(M_{\text{now}} - M_{\text{prev}}) / \Delta t$ | Last 2 readings | Detects rapid moisture drainage |
| `moisture_rolling_6` | Mean of last 6 readings | ~30 min | Smooths sensor signal noise |
| `temp_rolling_6` | Mean of last 6 readings | ~30 min | Tracks heating trends |
| `forecast_minutes` | Minutes until next forecast rain | Weather API | Delays pump if rain is coming |
| `hour` | `datetime.now().hour` | 0–23 | Encodes diurnal climate patterns |
| `day_of_week` | `datetime.now().weekday()` | 0–6 | Encodes weekly cycles |
| `is_daytime` | 1 if $6 \le \text{hour} \le 18$ | Point in time | Broad daylight/night flag |
| `is_hot_hours` | 1 if $10 \le \text{hour} \le 16$ | Point in time | Peak midday VPD delay window |

---

## 3. Vapor Pressure Deficit (VPD) Mathematics

VPD represents the pressure difference between saturated water vapor inside leaves and the surrounding ambient air. The model calculates saturation vapor pressure ($e_s$) using the **Tetens Equation**:

$$e_s = 0.6108 \times e^{\left(\frac{17.27 \times T}{T + 237.3}\right)}$$

$$e_a = e_s \times \left(\frac{RH}{100}\right)$$

$$VPD = \max(0, e_s - e_a)$$

---

## 4. In-Memory Settings Injection

The 3 context features (`crop_target_moisture`, `crop_critical_moisture`, and `region_evap_multiplier`) are injected **directly into the feature vector in memory** on every prediction cycle:

```python
# ml_predictor.py
def predict_next_watering(self, current_data, active_settings=None):
    # Retrieve configurations in-memory from app.py
    crop_info = active_settings or self.get_default_settings()
    
    # Inject context directly
    features['crop_target_moisture']   = crop_info['target']
    features['crop_critical_moisture'] = crop_info['critical']
    features['region_evap_multiplier'] = crop_info['evap_mult']
    
    # Run prediction...
```

### Why We Avoid Disk/DB Queries on the Hot Path:
At a 5-second tick rate, P-WOS makes **17,280 predictions per day**. Reading settings from PostgreSQL or a JSON file on disk for every cycle would introduce:
*   **Disk wear** and high disk I/O load.
*   **Database connection bloat** and query latencies (up to 50ms).
*   **Point of failure**: if the DB goes offline temporarily, predictions crash.

In-memory injection executes in **< 1 microsecond**, ensuring the autopilot loop remains resilient and fast.
