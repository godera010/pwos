# Models Details

## Overview
This folder stores **trained ML models and metadata**. The active model is in `src/backend/models/artifacts/`.

---

## Model Specifications

### Random Forest Classifier

**Why Random Forest?**

| Factor | Random Forest | Neural Network | Linear Regression |
|--------|---------------|----------------|-------------------|
| Data size needed | 1,000+ | 100,000+ | 500+ |
| Interpretability | High | Low | High |
| Feature scaling | Not needed | Required | Required |
| Training time | Seconds | Hours | Seconds |
| Inference time | < 10ms | 50-100ms | < 1ms |
| Non-linear patterns | ✅ Yes | ✅ Yes | ❌ No |

**Decision:** Random Forest balances accuracy with simplicity.

---

## Feature Engineering Journey

### Version 1 (6 Features) - 85% Accuracy
```
soil_moisture, temperature, humidity,
hour, day_of_week, is_daytime
```
**Problem:** Couldn't handle weather variations.

### Version 2 (12 Features) - 91% Accuracy
Added:
```
is_hot_hours, moisture_rolling_6, temp_rolling_6,
moisture_change_rate, forecast_minutes
```
**Improvement:** Better temporal awareness.

### Version 3 (17 Features) - 93% Accuracy ✅
Added:
```
vpd, is_extreme_vpd, wind_speed,
rain_intensity, is_raining, is_high_wind
```
**Improvement:** Weather-aware predictions.

---

## Why Each Feature?

### Sensor Features (3)
| Feature | Why |
|---------|-----|
| `soil_moisture` | Primary decision variable |
| `temperature` | Affects evaporation rate |
| `humidity` | Inversely affects evaporation |

### Time Features (4)
| Feature | Why |
|---------|-----|
| `hour` | Diurnal patterns (hotter midday) |
| `day_of_week` | Weekend patterns in some setups |
| `is_daytime` | Photosynthesis affects water use |
| `is_hot_hours` | Peak evaporation 10am-4pm |

### Rolling Features (3)
| Feature | Why |
|---------|-----|
| `moisture_rolling_6` | Trend more reliable than instant |
| `temp_rolling_6` | Smooths sensor noise |
| `moisture_change_rate` | Predict future state |

### Weather Features (4)
| Feature | Why |
|---------|-----|
| `forecast_minutes` | Delay watering if rain coming |
| `rain_intensity` | Heavy rain = more moisture |
| `wind_speed` | Wind = false dry readings |
| `is_raining` | Skip watering during rain |

### Derived Features (3)
| Feature | Why |
|---------|-----|
| `vpd` | Primary evaporation driver |
| `is_extreme_vpd` | Heatwave detection (VPD > 2.0) |
| `is_high_wind` | Wind effect threshold |

---

## VPD Calculation

**Vapor Pressure Deficit** - the difference between how much moisture the air can hold vs. how much it actually holds.

```python
# Saturation vapor pressure (Tetens equation)
es = 0.6108 * exp((17.27 * temp) / (temp + 237.3))

# Actual vapor pressure
ea = es * (humidity / 100)

# VPD
vpd = max(0, es - ea)
```

| VPD (kPa) | Condition | Effect |
|-----------|-----------|--------|
| 0.0 - 0.4 | Very humid | Minimal evaporation |
| 0.4 - 0.8 | Optimal | Normal evaporation |
| 0.8 - 1.2 | Dry | Increased evaporation |
| 1.2 - 2.0 | Very dry | High evaporation |
| > 2.0 | Extreme | Plant stress |

---

## Model Metadata

`model_metadata.json`:
```json
{
    "model_type": "RandomForestClassifier",
    "accuracy": 0.9306,
    "precision": 0.97,
    "recall": 0.88,
    "f1_score": 0.92,
    "features": [...17 features...],
    "trained_at": "2026-02-08T...",
    "training_samples": 10234,
    "hyperparameters": {
        "n_estimators": 100,
        "max_depth": 15,
        "min_samples_split": 5
    }
}
```

---

## Retraining

When to retrain:
1. New features added
2. Accuracy drops below 90%
3. New plant type or location
4. Seasonal calibration

```bash
python src/backend/models/train_model.py
```
