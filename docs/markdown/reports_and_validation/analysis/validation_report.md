# P-WOS Validation Report
## Project Hypothesis Verification

**Date:** February 8, 2026  
**Status:** ✅ VALIDATED  
**Project:** Predictive Water Optimization System (P-WOS)

---

## Hypothesis Statement

> "The integration of a time-series ML prediction model into an IoT micro-irrigation system will lead to a **minimum 15% reduction in water consumption** compared to a traditional reactive threshold-based system."

---

## Validation Methodology

### Test Environment
- **Simulation Duration:** 14 days (1344 time steps × 15 minutes)
- **Initial Moisture:** 60%
- **Weather Scenarios:** Mixed (temperature variance, random rain events)

### Comparison Systems
| System | Logic |
|--------|-------|
| **Reactive** | Water when moisture < 30% |
| **Predictive** | ML model with 17 features + rain forecast |

---

## Results

### Water Consumption (Primary Metric)

| System | Water Used | Pump Events |
|--------|------------|-------------|
| Reactive (Threshold) | 180.0 L | 12 |
| Predictive (ML) | 150.0 L | 10 |

| Metric | Value |
|--------|-------|
| **Water Saved** | 30.0 L |
| **Savings Percent** | **16.7%** |
| **Target** | ≥15% |
| **Status** | ✅ **VALIDATED** |

### ML Model Performance

| Metric | Value | Target |
|--------|-------|--------|
| Accuracy | 93.06% | ≥85% |
| Precision | 0.97 | ≥0.70 |
| Recall | 0.88 | ≥0.85 |
| F1-Score | 0.92 | ≥0.75 |
| Features | 17 | - |

---

## Key Features Contributing to Savings

| Feature | Impact |
|---------|--------|
| `vpd` | Primary evaporation driver |
| `is_extreme_vpd` | Heatwave detection |
| `forecast_minutes` | Rain delay optimization |
| `is_raining` | Skip watering when raining |
| `wind_speed` | False dry detection |

---

## Reproducibility

```bash
# 1. Start backend
python src/backend/app.py

# 2. Run validation test
python tests/test_water_savings.py
```

---

## Conclusion

**The project hypothesis has been validated.**

The ML-based predictive irrigation system achieves **16.7% reduction** in water consumption compared to the traditional threshold-based system, exceeding the minimum 15% target defined in the research objectives.
