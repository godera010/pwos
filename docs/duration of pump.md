# Hardware Adaptation Plan (Small Plant & Water Sensor)

## Goal
Adapt the P-WOS system to safely irrigate a small test plant (2-5 seconds pump duration) and handle a temporary resistive water sensor without breaking the core Machine Learning engine or dissertation architecture. We want to be able to effortlessly switch back to full-scale operations when the capacitive sensor and larger test bed arrive.

## Proposed Changes

### 1. Pump Duration Scaling (Demo / Small Pot Mode)
The current formula in `ml_predictor.py` uses an agricultural baseline where a 1% moisture deficit requires a large volume of water. It clamps the duration between 5 and 60 seconds:
`duration = max(5, min(60, int((deficit / 0.5) * region_mult)))`

**Solution:**
We will introduce a `pump_scale_factor` to the `system_settings` table in the SQLite database (defaulting to `1.0`). We will also lower the absolute hard-coded floor from 5 seconds to 2 seconds.

*   **How it works:** 
    `duration = max(2, min(60, int((deficit / 0.5) * region_mult * scale_factor)))`
*   **For your current small plant:** You will set the `pump_scale_factor` to `0.1`. A deficit that would normally trigger a 30-second pump run will now safely run for just 3 seconds, preventing flooding.
*   **For the future large testing area:** You will simply update the database `pump_scale_factor` back to `1.0`, and the system instantly returns to agricultural-scale watering.

### 2. Handling the Temporary Water Sensor
A standard water sensor (resistive) differs from a capacitive soil moisture sensor in two ways: it corrodes over time when left in soil, and its readings can be erratic or noisy (spiking up and down).

**Solution:**
We will **NOT** change the Machine Learning model. Changing the ML model now to accommodate a temporary, incorrect sensor would ruin your dissertation's scientific validity. 

Instead, we will rely on the robust data pipeline we already built:
1.  **Calibration:** You must calibrate the water sensor on the ESP32 (or your Python simulation script) so it outputs a 0-100% integer, just like the capacitive sensor will.
2.  **Natural Smoothing:** The ML feature extractor already calculates `moisture_rolling_6` (an average of the last 6 sensor readings over 30 seconds). This rolling average will mathematically smooth out the noisy spikes from the water sensor before the ML model even sees them. 
3.  **Result:** The system will treat the water sensor exactly like a slightly noisy capacitive sensor. When your real capacitive sensor arrives, you simply swap the hardware wire. No software changes will be required.

## User Review Required
> [!IMPORTANT]
> - Do you approve of injecting a `pump_scale_factor` into the database to mathematically shrink the watering times for the small pot? 
> - Are you okay with leaving the ML model exactly as is and letting the existing `moisture_rolling_6` feature smooth out the erratic water sensor readings?

Once you approve, I will make the quick updates to `database.py` and `ml_predictor.py` to implement the pump scale factor.
