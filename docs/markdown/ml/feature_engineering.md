# Feature Engineering & Physics Calculations

**P-WOS Machine Learning — Input Vectors and Environmental Calculations**

---

## 1. Input Feature Space (17 Crop-Aware Features)

The Random Forest model accepts exactly **17 features** in positional order at inference time, fusing hardware telemetry, weather forecasts, and dynamic crop biology:

| # | Feature Name | Type | Range / Units | Source | Role in Decision |
|---|---|---|---|---|---|
| 1 | `soil_moisture` | `float` | 0–100 % | Soil sensor | Primary drought signal |
| 2 | `temperature` | `float` | °C | DHT11 Sensor | Evapotranspiration proxy |
| 3 | `humidity` | `float` | 0–100 % | DHT11 Sensor | VPD component |
| 4 | `vpd` | `float` | kPa | Calculated | Atmospheric water demand |
| 5 | `precipitation_chance` | `float` | 0–100 % | Weather forecast | Suppresses watering need if rain is likely |
| 6 | `forecast_temp` | `float` | °C | Weather forecast | Anticipates future heat stress |
| 7 | `wind_speed` | `float` | km/h | Weather forecast | Evaporation accelerator |
| 8 | `crop_type_id` | `int` | 1–5 | Database | Categorical crop identifier |
| 9 | `root_depth_cm` | `float` | cm | Database | Determines how deep water must penetrate |
| 10| `wilting_point_threshold` | `float`| % | Database | Hard biological limit for drought stress |
| 11| `growth_stage` | `int` | 1-4 | Database | Influences water consumption rates |
| 12| `optimal_vpd_min` | `float` | kPa | Database | Lower bound for optimal transpiration |
| 13| `optimal_vpd_max` | `float` | kPa | Database | Upper bound before stomata close |
| 14| `hour` | `int` | 0–23 | `datetime` | Encodes diurnal climate patterns |
| 15| `is_daytime` | `binary`| 0 or 1 | Derived | Broad daylight/night flag |
| 16| `moisture_change_rate` | `float` | $\Delta M / \Delta t$ | Derived | Detects rapid moisture drainage |
| 17| `moisture_rolling_6` | `float` | % | Derived | Smooths sensor signal noise |

---

## 2. Vapor Pressure Deficit (VPD) Mathematics

VPD represents the pressure difference between saturated water vapor inside leaves and the surrounding ambient air. The model calculates saturation vapor pressure ($e_s$) using the **Tetens Equation**:

$$e_s = 0.6108 \times e^{\left(\frac{17.27 \times T}{T + 237.3}\right)}$$

$$e_a = e_s \times \left(\frac{RH}{100}\right)$$

$$VPD = \max(0, e_s - e_a)$$

---

## 3. Dynamic Database Injection

Unlike previous versions that relied on hardcoded thresholds, the 17-feature matrix incorporates 6 crop-specific features injected dynamically from the SQLite `crops` table at inference time:

```python
# ml_predictor.py
def _prepare_features(self, sensors, forecast, crop_info):
    features = {
        'soil_moisture': float(sensors.get('soil_moisture', 0)),
        ...
        'crop_type_id': int(crop_info.get('id', 1)),
        'root_depth_cm': float(crop_info.get('root_depth_cm', 30.0)),
        'wilting_point_threshold': float(crop_info.get('wilting_point_threshold', 20.0)),
        ...
    }
    return features
```

### Why Database Injection is Powerful:
*   **Scale**: Adding a new crop requires zero code changes. You simply add a new row to the database.
*   **Precision**: The Random Forest naturally learns complex interactions between environmental telemetry (e.g., Temperature and VPD) and botanical parameters (e.g., `optimal_vpd_max` and `wilting_point_threshold`), creating a highly tailored irrigation schedule for each specific plant.
