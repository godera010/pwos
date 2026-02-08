# P-WOS Final Project Report
**Predictive Water Optimization System**

**Date:** 2026-02-08  
**Status:** Complete  
**Version:** 2.0

---

## 1. Project Overview

The Predictive Water Optimization System (P-WOS) is an intelligent, automated solution designed to optimize water usage for agricultural and domestic plant care. This project implements a fully functional simulation environment that models the complete feedback loop of an IoT-based precision agriculture system.

### Key Capabilities
- **Real-time Monitoring**: Tracks soil moisture, temperature, humidity, and VPD
- **ML-Powered Decisions**: Random Forest model with 17 features predicts optimal watering
- **Weather Integration**: Rain forecast and wind speed influence watering decisions
- **Automated Control**: Activates water pumps based on ML predictions, not just thresholds
- **A/B Comparison**: Reactive vs Predictive system comparison dashboard
- **Scalable Architecture**: Decoupled microservices design (MQTT + API + Frontend)

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
| Accuracy | 93.06% |
| Precision | 0.97 |
| Recall | 0.88 |
| F1-Score | 0.92 |

### Key Features
| Feature | Description |
|---------|-------------|
| `vpd` | Vapor Pressure Deficit (kPa) |
| `is_extreme_vpd` | Heatwave detection (VPD > 2.0) |
| `wind_speed` | Wind speed from weather API |
| `rain_intensity` | Rain intensity from forecast |
| `is_raining` | Boolean rain flag |
| `is_high_wind` | High wind flag (> 20 km/h) |
| `forecast_minutes` | Minutes until predicted rain |
| `moisture_rolling_6` | 6-hour moisture average |

---

## 4. Results and Findings

### Hypothesis Validation

> **Hypothesis:** "The integration of a time-series ML prediction model will lead to a minimum **15% reduction** in water consumption compared to a traditional reactive threshold-based system."

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| Water Savings | ≥15% | **16.7%** | ✅ **VALIDATED** |

### 2-Week Simulation Results

| System | Water Used | Pump Events |
|--------|------------|-------------|
| Reactive (Threshold < 30%) | 180.0 L | 12 |
| Predictive (ML-based) | 150.0 L | 10 |
| **Savings** | **30.0 L** | **2 cycles** |

### Test Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| `test_simulation_logic.py` | 11 | ✅ Pass |
| `test_water_savings.py` | 1 | ✅ Pass |
| `test_integration.py` | 4 | ✅ Pass |

---

## 5. Simulation Enhancements

| Feature | Description |
|---------|-------------|
| **VPD-based Decay** | Moisture evaporation scales with temperature/humidity |
| **Gradual Watering** | Pump adds water incrementally (1.5%/step) |
| **Non-blocking Pump** | Async control with extend/stop support |
| **Extreme Scenarios** | Heatwave, wind, sensor failure, pump failure |

---

## 6. Future Recommendations

1. **Hardware Deployment**: Flash ESP32 with MicroPython firmware
2. **Cloud Migration**: Deploy Flask API to Railway/Render
3. **OpenWeatherMap**: Replace weather simulator with live API
4. **Mobile App**: React Native wrapper for dashboard
5. **Multi-zone**: Support multiple plant zones with individual sensors

---

## 7. Conclusion

P-WOS v2.0 successfully demonstrates the viability of ML-powered predictive irrigation. The **16.7% water savings** exceeds the project hypothesis target, validating the approach. The simulation provides a robust platform for algorithm development before hardware deployment.

### Key Achievements
- ✅ 17-feature ML model (93% accuracy)
- ✅ VPD-based realistic simulation
- ✅ Rain forecast integration
- ✅ 16.7% water savings (exceeds 15% target)
- ✅ Comprehensive test coverage
- ✅ Full-stack React dashboard with savings comparison
