# P-WOS Final Report

**Predictive Water Optimization System**

**Date:** February 2026
**Version:** 2.0
**Status:** ✅ Hypothesis Validated

---

## 1. Project Overview

The Predictive Water Optimization System (P-WOS) is an intelligent, automated irrigation solution that uses ML predictions instead of reactive thresholds. The complete simulation environment models the full IoT feedback loop: sensors → MQTT → ML → pump control → dashboard.

### Key Capabilities
- **Real-time Monitoring**: Soil moisture, temperature, humidity, VPD
- **ML-Powered Decisions**: Random Forest model with 17 features (93% accuracy)
- **Weather Integration**: Rain forecast and wind speed influence decisions
- **Automated Control**: Pump scheduling based on ML predictions
- **A/B Comparison**: Reactive vs Predictive system dashboard

---

## 2. System Architecture

```
┌─────────────────┐     MQTT      ┌─────────────────┐
│  ESP32 Sim      │ ──────────────▶│  MQTT Broker    │
│  (Sensors)      │               │  (Mosquitto)    │
└─────────────────┘               └────────┬────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                              ▼
          ┌─────────────────┐                           ┌─────────────────┐
          │  Backend API    │                           │  Automation     │
          │  (Flask+ML)     │                           │  Controller     │
          └────────┬────────┘                           └─────────────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│  ML Predictor   │ │  SQLite DB      │
│  (17 features)  │ │  (Time-series)  │
└─────────────────┘ └─────────────────┘
          │
          ▼
┌─────────────────┐
│  React Frontend │
│  (Dashboard)    │
└─────────────────┘
```

---

## 3. Machine Learning Model

### Model Specifications

| Attribute | Value |
|-----------|-------|
| Type | Random Forest Classifier |
| Features | 17 |
| Accuracy | **93.06%** |
| Precision | 0.97 |
| Recall | 0.88 |
| F1-Score | **0.92** |

### Feature Importance

| Category | Features |
|----------|----------|
| **Sensor** | soil_moisture, temperature, humidity |
| **Time** | hour, day_of_week, is_daytime, is_hot_hours |
| **Trends** | moisture_rolling_6, temp_rolling_6, moisture_change_rate |
| **Weather** | forecast_minutes, rain_intensity, wind_speed, is_raining |
| **Physics** | vpd, is_extreme_vpd, is_high_wind |

---

## 4. Hypothesis Validation

> **Hypothesis:** "The integration of a time-series ML prediction model will lead to a minimum **15% reduction** in water consumption compared to a traditional reactive threshold-based system."

### 2-Week Simulation Results

| System | Water Used | Pump Events |
|--------|------------|-------------|
| Reactive (Threshold < 30%) | 180.0 L | 12 |
| Predictive (ML-based) | 150.0 L | 10 |
| **Savings** | **30.0 L (16.7%)** | **2 cycles** |

### A/B "Stress Test" (3-Day Drought + Storm)

| Metric | Reactive | Predictive | Delta |
|--------|----------|------------|-------|
| Pump Events | 4 | 3 | -1 |
| Water Used | 60.0 L | 45.0 L | **-15.0 L** |
| Stress Hours | 0.0 hrs | 0.0 hrs | 0.0 |
| Efficiency Gain | — | — | **+25.0%** |

The predictive system successfully stalled watering before a heavy rain event, avoiding wasted water while maintaining zero plant stress.

---

## 5. Simulation Features

| Feature | Description |
|---------|-------------|
| **VPD-based Decay** | Moisture evaporation scales with temperature/humidity |
| **Gradual Watering** | Pump adds water incrementally (1.5%/step) |
| **Non-blocking Pump** | Async control with extend/stop support |
| **Extreme Scenarios** | Heatwave, wind, sensor failure, pump failure tested |

---

## 6. Test Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| `test_simulation_logic.py` | 11 | ✅ All Pass |
| `test_water_savings.py` | 1 | ✅ Pass (16.7%) |
| `test_integration.py` | 4 | ✅ All Pass |

---

## 7. Technology Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS | ✅ Ready |
| Backend | Python 3.13, Flask, SQLite | ✅ Ready |
| ML | Scikit-Learn, Random Forest (17 features) | ✅ Ready |
| Messaging | MQTT (Mosquitto) | ✅ Ready |
| Cloud | Railway/Render, PostgreSQL | ⬜ Pending |
| Hardware | ESP32, MicroPython | ⬜ Pending |

---

## 8. Future Recommendations

1. **Hardware Deployment** — Flash ESP32 with MicroPython firmware
2. **Cloud Migration** — Deploy Flask API to Railway/Render
3. **OpenWeatherMap** — Replace weather simulator with live API
4. **Mobile App** — React Native wrapper for dashboard
5. **Multi-zone** — Support multiple plant zones with individual sensors

---

## 9. Conclusion

P-WOS v2.0 successfully demonstrates ML-powered predictive irrigation. The **16.7% water savings** exceeds the project hypothesis target, validating that forecast-integrated smart irrigation significantly outperforms reactive systems.

### Key Achievements
- ✅ 17-feature ML model (93% accuracy)
- ✅ VPD-based realistic simulation
- ✅ Rain forecast integration
- ✅ 16.7% water savings (exceeds 15% target)
- ✅ Comprehensive test coverage
- ✅ Full-stack React dashboard with savings comparison
