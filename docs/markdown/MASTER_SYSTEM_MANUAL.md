# P-WOS Master System Manual
## The Definitive Technical Encyclopedia for the Predictive Water Optimization System

> **System Version:** v3.0  
> **Status:** Production Reference  
> **Scope:** Full-stack technical architecture, from soil sensors and atmospheric physics to machine learning inference and frontend analytics.

---

## Part 1: Data Engineering & Datasets

The foundation of P-WOS is a high-density, multi-featured dataset that captures the complex relationship between soil moisture, atmospheric demand (VPD), and crop physiology.

### 1.1 The Primary Training Dataset (`training_data.csv`)

- **Size:** 10,889 samples (rows)
- **Features:** 11 input features + 1 target label
- **Sampling Frequency:** 5-second control cycles (simulated and real-world aggregated)

#### Dataset Schema

| Column | Type | Description | Role in System |
|---|---|---|---|
| `soil_moisture` | `float` | Volumetric soil moisture percentage (0–100%) | Primary drought signal |
| `temperature` | `float` | Ambient air temperature (°C) | Direct evaporation driver |
| `humidity` | `float` | Relative humidity percentage (0–100%) | VPD component |
| `forecast_minutes` | `int` | Minutes until the next predicted rain event | Suppress unnecessary watering |
| `hour` | `int` | Current hour of the day (0–23) | Encodes daily evapotranspiration cycle |
| `day_of_week` | `int` | Day index (0=Monday, 6=Sunday) | Captures weekly patterns |
| `is_daytime` | `binary` | 1 if 6:00 < hour < 18:00 | Broad solar radiation proxy |
| `is_hot_hours` | `binary` | 1 if 10:00 < hour < 16:00 | Peak VPD window / Stall window |
| `moisture_change_rate` | `float` | Rate of moisture change per 5-second interval | Detects rapid drainage/drying trends |
| `moisture_rolling_6` | `float` | 30-second rolling average of soil moisture | Smooths sensor noise & confirms trends |
| `temp_rolling_6` | `float` | 30-second rolling average of temperature | Tracks sustained thermal stress |
| **`needs_watering_soon`** | `binary` | **Target Label:** 1 if irrigation is required | The model's prediction goal |

### 1.2 Feature Generation (The Rolling Engine)

P-WOS does not rely solely on "static" snapshots. The `data_collector.py` and `ml_predictor.py` use a 6-sample sliding window to generate temporal features:

```python
# Feature Engineering Logic
moisture_change_rate = (current_moisture - previous_moisture) / time_delta
moisture_rolling_6 = sum(last_6_readings) / 6
```

---

## Part 2: The ML Training Pipeline

P-WOS utilizes a "Forest of Decision Trees" to map 11 atmospheric and soil features to a binary watering decision.

### 2.1 Model Architecture: Random Forest

- **Estimators (Trees):** 100
- **Max Depth:** 10 (tuned to prevent overfitting to noise while capturing non-linear interactions)
- **Engine:** `RandomForestClassifier` (Scikit-Learn)

### 2.2 Performance Metrics (v3.0 Benchmark)

The model is evaluated using the F1-Score to ensure performance is maintained even with imbalanced datasets (more "Wait" than "Water" events).

| Metric | Score | Interpretation |
|---|---|---|
| **Accuracy** | 83.43% | Overall correct predictions |
| **Precision** | 96% | When the model says "Water", it is almost always correct |
| **Recall** | 72% | The model captures 72% of all actual watering needs |
| **F1-Score** | 82% | Excellent balance for agricultural decision-making |

### 2.3 Training Workflow (`train_model.py`)

1. **Load Data:** Imports `training_data.csv`.
2. **Pre-processing:** Feature scaling (StandardScaler) is applied to ensure temperature (°C) and moisture (%) are weighted fairly.
3. **Train/Test Split:** 80/20 random split.
4. **Serialization:** Model saved as `rf_model.pkl`, metadata as `model_metadata.json`.

---

## Part 3: Environmental Physics (VPD & Weather)

The "Brain" is supplemented by the "Physics Engine" which applies raw meteorological formulas to refine ML outputs.

### 3.1 VPD (Vapor Pressure Deficit) - The Tetens Formula

VPD represents the "thirst" of the air. P-WOS implements the **Tetens approximation** (`vpd_calculator.py`):

```python
# The Physics of Evaporation
svp = 0.61078 * exp((17.27 * T) / (T + 237.3))  # Saturation Vapor Pressure
avp = svp * (RH / 100.0)                        # Actual Vapor Pressure
VPD = svp - avp                                 # The Deficit (kPa)
```

### 3.2 The Moisture Decay Rate Engine

When sensors are idle, the system predicts moisture loss using the following derived formula (`ml_predictor.py`):

```python
# Moisture Decay Rate (% / hour)
temp_factor = 1 + (temp - 25) * 0.08 if temp > 25 else 0.7
vpd_factor = 1 + (vpd * 0.4)
time_factor = 1.5 if 10 <= hour <= 16 else 1.0 (Day) or 0.3 (Night)

DecayRate = base_decay * temp_factor * vpd_factor * time_factor
```

---

## Part 4: The Autonomous Decision Engine

The "Automation Controller" (`automation_controller.py`) is the executive function that manages the 5-second control loop.

### 4.1 The 5-Second Cycle (Priority List)

Every 5 seconds, the controller evaluates these steps in strict priority order:

1. **Safety Interlock (Saturation):** If Moisture > 85%, kill pump immediately (STOP).
2. **Safety Interlock (Critical):** If Moisture < `crop_critical_moisture`, force pump ON (NOW) overriding all modes.
3. **Rain Confidence:** If rain is expected in < 2 hours, STALL irrigation.
4. **False Dry Detection:** If Wind > 20 km/h and Humidity < 40%, flag "False Dry" and MONITOR instead of watering.
5. **VPD Stall:** If VPD > 3.0 kPa (Extreme Dry), STALL irrigation until evening to prevent evaporative loss.
6. **ML Inference:** If all above pass, execute the ML Model's prediction (NOW/MONITOR).

### 4.2 Rain Confidence Tiers

| Time to Rain | Moisture State | Action |
|---|---|---|
| < 2 hours | Any | **STALL** (Rain imminent) |
| 2–6 hours | > 25% | **STALL** (Wait for rain) |
| 6–12 hours | > 40% | **MONITOR** (Keep watching) |

---

## Part 5: Agronomic Personalisation

P-WOS is "Crop-Aware". Every decision is scaled by the active crop profile and region.

### 5.1 The 5 Pre-defined Crops

| Crop | Critical | Low | Proactive | Target | Multiplier |
|---|---|---|---|---|---|
| **Maize** | 30% | 45% | 55% | 60% | 1.0x |
| **Potato** | 45% | 55% | 65% | 70% | 1.4x |
| **Tomato** | 35% | 48% | 58% | 62% | 1.2x |
| **Onion** | 40% | 52% | 60% | 65% | 0.8x |
| **Sorghum** | 20% | 30% | 40% | 50% | 0.6x |

### 5.2 Seasonal & Regional Logic

- **Regional Evap Multiplier:** Scaled by agro-ecological zone (e.g., Matabeleland = 1.5x evaporation pressure).
- **Seasonal Threshold Shift:** 
    - **Summer (Nov–Mar):** Thresholds shifted **+5%** (higher moisture required for heat).
    - **Winter (May–Sep):** Thresholds shifted **-5%** (lower moisture required for cooler periods).

---

## Part 6: Dataflows & Frontend Analytics

### 6.1 The MQTT Pipeline

```
[ESP32] --(pwos/sensor/data)--> [MQTT Broker] --(Subscription)--> [Backend API] --(Insert)--> [Postgres]
```

### 6.2 Frontend Formulas

- **Gap-Filling:** The analytics dashboard uses a "Snap-to-Boundary" algorithm to floor timestamps to 5-minute intervals, inserting `null` for missing buckets to represent sensor outages honestly.
- **Water Savings Calculation:**
    - `Saved (L) = TotalStandardUsage (Reactive) - TotalAIUsage (P-WOS)`
    - `Efficiency (%) = (1 - TotalAI / TotalStandard) * 100`

---
*P-WOS v3.0 | Comprehensive Technical Manual*
