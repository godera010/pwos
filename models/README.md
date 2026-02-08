# models/ - ML Model Artifacts

**P-WOS Machine Learning Model Storage**

---

## 📁 Structure

```
models/
├── rf_model.pkl         # Trained Random Forest model
└── model_metadata.json  # Model info & metrics
```

> **Note:** This is a legacy location. The active model is in:  
> `src/backend/models/artifacts/`

---

## Model Specifications

| Attribute | Value |
|-----------|-------|
| **Type** | Random Forest Classifier |
| **Features** | 17 |
| **Accuracy** | 93.06% |
| **F1-Score** | 0.92 |

---

## Features Used

| # | Feature | Description |
|---|---------|-------------|
| 1 | soil_moisture | Current soil moisture % |
| 2 | temperature | Current temp (°C) |
| 3 | humidity | Relative humidity % |
| 4 | hour | Hour of day (0-23) |
| 5 | day_of_week | Day (0=Mon, 6=Sun) |
| 6 | is_daytime | 1 if 6am-8pm |
| 7 | is_hot_hours | 1 if 10am-4pm |
| 8 | moisture_rolling_6 | 6-hour moisture avg |
| 9 | temp_rolling_6 | 6-hour temp avg |
| 10 | moisture_change_rate | Moisture trend |
| 11 | forecast_minutes | Minutes to rain |
| 12 | vpd | Vapor Pressure Deficit |
| 13 | is_extreme_vpd | Heatwave flag |
| 14 | wind_speed | Wind (km/h) |
| 15 | rain_intensity | Rain amount (mm) |
| 16 | is_raining | Rain flag |
| 17 | is_high_wind | High wind flag |

---

## Retrain Model

```bash
python src/backend/models/train_model.py
```
