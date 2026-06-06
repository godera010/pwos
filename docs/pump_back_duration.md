# Pump Duration Scaling & Hardware Accommodations

This document explains the modifications made to the system to support testing in a constrained indoor environment (small pots) while preserving the agricultural-scale machine learning logic. 

## The Challenge

The P-WOS core Machine Learning engine (`ml_predictor.py`) calculates pump duration based on the volume of water needed to resolve a moisture deficit in a typical agricultural setting. A 1% deficit in a large farm bed requires a massive volume of water, resulting in pump durations of 30 to 60+ seconds.

However, during initial system testing and dissertation demonstration, the hardware environment consists of:
1. **A small plant in a tiny pot.** Running a water pump for 30 seconds would cause catastrophic flooding.
2. **A resistive water sensor** (used temporarily until a capacitive soil moisture sensor arrives). Resistive sensors provide erratic, noisy signals compared to the stable readings of capacitive sensors.

If we simply altered the core Machine Learning model to "expect a small pot", we would break the scientific validity of the dissertation.

## The Solution

We implemented a mathematically sound **Scale Factor** configuration injected into the ML inference layer, alongside robust data-pipeline smoothing. 

### 1. Pump Scale Factor (`pump_scale_factor`)

We introduced a dynamic multiplier in the PostgreSQL `system_settings` table. 

**How it works:**
The ML model determines the *base duration* using standard agricultural metrics. Then, right before issuing the command, it multiplies the result by the `pump_scale_factor`.

```python
# ml_predictor.py -> predict_next_watering()

base_duration = (deficit / 0.5) * region_mult
recommended_duration = max(2, min(60, int(base_duration * scale_factor)))
```
*Notice that we also lowered the absolute hard-coded floor limit from `5` to `2` seconds to allow for micro-dosing the small pot.*

**Current Configuration:**
- For the small pot, `pump_scale_factor` is set to `0.1`. A normal 30-second watering event automatically scales down to a safe **3 seconds**.
- When the full testing area is ready, setting `pump_scale_factor = 1.0` instantly returns the system to full agricultural scale with zero code changes.

### 2. Handling the Resistive Water Sensor

To prevent the erratic signals of the temporary resistive water sensor from triggering false positives in the ML model, we relied on the existing **Data Smoothing Pipeline**.

Instead of feeding raw, noisy sensor data directly to the ML engine, the `data_extractor.py` pipeline generates a mathematically smoothed feature: `moisture_rolling_6` (the moving average of the last 6 readings). 

This naturally filters out the sudden spikes caused by the resistive sensor. When the high-quality capacitive sensor arrives, it can be hot-swapped into the circuit. The system requires no software changes to accommodate the hardware upgrade.

---

## Affected Files and Code Changes

The following files were modified to implement this architecture gracefully:

### 1. `src/backend/database.py`
**Change:** Added getter and setter functions to manage generic configuration keys in the PostgreSQL `system_settings` table, and seeded the default `pump_scale_factor`.
```python
# Added to PWOSDatabase class
def get_system_setting(self, key, default=None):
    # Fetches 'pump_scale_factor' from DB

def set_system_setting(self, key, value):
    # Updates 'pump_scale_factor' in DB
```

### 2. `src/backend/models/ml_predictor.py`
**Change:** Injected the database check into the duration calculation phase (Phase 3) of `predict_next_watering()`. 
```python
# Fetch scale factor (for testing small pots vs full farm)
scale_factor_str = db.get_system_setting('pump_scale_factor', '1.0')
try:
    scale_factor = float(scale_factor_str)
except ValueError:
    scale_factor = 1.0

# Scale duration based on regional evap multiplier and hardware scale factor.
base_duration = (deficit / 0.5) * region_mult
recommended_duration = max(2, min(60, int(base_duration * scale_factor)))
```

### 3. `src/backend/set_pump_scale.py` [NEW]
**Change:** Created a dedicated Python utility script to allow developers or testers to rapidly flip between small pot testing (`0.1`) and full-scale testing (`1.0`) directly from the terminal without needing to write SQL queries.
```python
# Usage:
# python set_pump_scale.py 0.1   (For the small pot)
# python set_pump_scale.py 1.0   (For the full farm)
```
