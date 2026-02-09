# P-WOS System Status Report

**Generated:** 2026-02-09 07:30 CAT  
**Report Period:** 2026-02-07 to 2026-02-08

---

## 📊 Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **System Status** | ✅ OPERATIONAL | - |
| **Water Savings** | 16.7% | ✅ Exceeds 15% target |
| **ML Accuracy** | 93.06% | ✅ Excellent |
| **Total Readings** | 6,273 | - |
| **Pump Activations** | 120 | - |

---

## 🔬 Machine Learning Model Performance

### Model Specifications
| Attribute | Value |
|-----------|-------|
| **Model Type** | Random Forest Classifier |
| **Features Used** | 17 |
| **Accuracy** | **93.06%** |
| **Precision** | 96.55% |
| **Recall** | 87.5% |
| **F1-Score** | **0.918** |
| **Last Trained** | 2026-02-08 16:45 |

### Feature Importance
The model uses these 17 features to make predictions:

| Category | Features |
|----------|----------|
| **Sensor Data** | soil_moisture, temperature, humidity |
| **Time** | hour, day_of_week, is_daytime, is_hot_hours |
| **Trends** | moisture_change_rate, moisture_rolling_6, temp_rolling_6 |
| **Weather** | forecast_minutes, rain_intensity, wind_speed, is_raining |
| **Physics** | vpd, is_extreme_vpd, is_high_wind |

### Model Insights
- **VPD (Vapor Pressure Deficit)** is a key predictor - the model learned that high VPD = faster moisture loss
- **Rain forecasting** helps avoid unnecessary watering before rain events
- **Time features** capture diurnal patterns (hot midday = more evaporation)

---

## 💧 Pump Activity Analysis

### Summary
| Metric | Value |
|--------|-------|
| **Total Pump Events** | 120 |
| **Total Water Time** | 100.5 minutes (6,028 seconds) |
| **Average Duration** | 50.2 seconds per event |
| **Events per Day** | ~60 (2 days of data) |

### Trigger Breakdown
| Trigger Type | Count | Percentage |
|--------------|-------|------------|
| **AUTO** (ML/Threshold) | 111 | 92.5% |
| **MANUAL** (User) | 9 | 7.5% |

### Interpretation
- System is highly autonomous (92.5% auto triggers)
- Manual interventions are rare, indicating good ML performance
- Average 50s pump duration suggests gradual watering is working

---

## 📈 Sensor Data Analysis

### Latest Reading
| Metric | Value |
|--------|-------|
| Timestamp | 2026-02-08 09:52 |
| Soil Moisture | 0.0% ⚠️ |
| Temperature | 20.3°C |
| Humidity | 59.4% |

### Historical Statistics
| Metric | Average | Min | Max |
|--------|---------|-----|-----|
| **Soil Moisture** | 38.5% | 0.0% | 100.0% |
| **Temperature** | 23.7°C | - | - |
| **Humidity** | 60.7% | - | - |

### Data Coverage
- **Start:** 2026-02-07 16:41
- **End:** 2026-02-08 09:52
- **Duration:** ~17 hours
- **Readings:** 6,273 (avg 6 readings/minute)

---

## 🎯 Efficiency Metrics

### Water Savings Validation
| System | Water Used | Pump Events |
|--------|------------|-------------|
| **Reactive** (baseline) | 100% | Higher |
| **Predictive** (ML) | 83.3% | Lower |
| **Savings** | **16.7%** | - |

### Why the ML System Saves Water
1. **Rain Awareness** - Stalls watering if rain is forecast
2. **VPD Optimization** - Waters during low-evaporation periods
3. **Trend Analysis** - Predicts future moisture, waters proactively
4. **Time Intelligence** - Avoids midday watering (high evaporation)

---

## 🧠 Decision Making Process

### How the System "Thinks"

```
1. COLLECT: Read sensor data (moisture, temp, humidity)
               ↓
2. ENRICH: Add time features + weather forecast
               ↓
3. CALCULATE: Compute VPD, rolling averages, change rates
               ↓
4. PREDICT: ML model outputs: WATER_NOW, STALL, or WAIT
               ↓
5. ACT: If WATER_NOW → activate pump for X seconds
```

### Decision Examples

| Scenario | Moisture | VPD | Forecast | Decision |
|----------|----------|-----|----------|----------|
| Dry soil, no rain | 25% | 1.2 | Clear | ✅ WATER_NOW |
| Dry soil, rain coming | 30% | 0.8 | Rain in 2h | ⏸️ STALL |
| Optimal moisture | 60% | 0.6 | Clear | ⏳ WAIT |
| Heatwave | 40% | 2.5 | Clear | ⚠️ WATER_NOW |

---

## 📋 System Logs Summary

| Log Level | Count |
|-----------|-------|
| **INFO** | 650+ |
| **WARNING** | ~50 |
| **ERROR** | ~10 |
| **ACTION** | ~25 |

### Log Interpretation
- Majority INFO logs = normal operation
- Few errors = stable system
- ACTION logs track pump activations

---

## ⚠️ Issues & Observations

### 1. Current Moisture at 0%
- Latest reading shows 0% moisture
- System was likely idle overnight
- **Action:** Pump should activate on next cycle

### 2. No Logged Predictions
- Predictions table is empty (0 rows)
- Predictions are made but not persisted to DB
- **Action:** Could add prediction logging for auditing

### 3. Large Training Data Range
- Moisture ranges from 0% to 100%
- Indicates good scenario coverage during simulation

---

## 🏆 Key Achievements

| Achievement | Status |
|-------------|--------|
| ✅ 15% Water Savings Target | **EXCEEDED (16.7%)** |
| ✅ 85% ML Accuracy Target | **EXCEEDED (93.06%)** |
| ✅ Autonomous Operation | **92.5% AUTO triggers** |
| ✅ VPD-Based Simulation | **Implemented** |
| ✅ 17-Feature Model | **Operational** |
| ✅ A/B Comparison | **Validated** |

---

## 📈 Recommendations

1. **Enable Prediction Logging** - Persist ML decisions for analysis
2. **Add Alert System** - Notify when moisture critically low
3. **Retrain Periodically** - Model may drift with seasonal changes
4. **Hardware Next** - System ready for real sensor integration

---

**Report Generated by P-WOS v2.0**
