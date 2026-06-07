# Simulation Physics & Environmental Modeling

**P-WOS Digital Twin — Atmospheric and Agronomic Math Specifications**

---

## Overview

The simulator models the physical interactions between soil moisture, crop root transpiration, and daily weather cycles. Rather than using random variables, it implements standard agricultural physics equations to ensure that the machine learning models learn realistic soil drying behaviors.

---

## 1. Vapor Pressure Deficit (VPD) Calculation

Vapor Pressure Deficit (VPD) measures the "drying power" of the air. It represents the difference between the pressure exerted by water vapor in saturated air ($e_s$) and the actual water vapor pressure ($e_a$) at a given temperature and relative humidity.

The simulator calculates saturation vapor pressure using the **Tetens Equation**:

$$e_s = 0.6108 \times e^{\left(\frac{17.27 \times T}{T + 237.3}\right)}$$

Where:
*   $T$ is the temperature in °C.
*   $e_s$ is in kilopascals (kPa).

The actual vapor pressure ($e_a$) is computed as:

$$e_a = e_s \times \left(\frac{RH}{100}\right)$$

Where:
*   $RH$ is the relative humidity in %.

Finally, the VPD is:

$$VPD = e_s - e_a$$

---

## 2. Soil Moisture Decay Model

The rate at which soil moisture decreases between watering events is modeled as a function of the active crop's transpiration rate and the VPD of the surrounding air:

$$\text{Decay Rate} = \text{base\_rate} \times \left(VPD\right)^{\gamma} \times \text{crop\_evap\_mult} \times \text{time\_factor}$$

Where:
*   $\text{base\_rate}$ is set to `0.02%` VSM per simulation step (5 seconds).
*   $\gamma$ (amplification factor) is set to `1.3`, modeling non-linear evaporation acceleration as air becomes drier.
*   $\text{crop\_evap\_mult}$ is the transpiration multiplier of the selected crop (e.g., Potato = `1.4×`, Sorghum = `0.6×`).
*   $\text{time\_factor}$ is a sinusoidal modifier that increases evaporation rates during peak sunlight hours (10:00–16:00) and reduces them to near-zero at night.

If it is raining, soil moisture increases dynamically:

$$\text{Moisture Increment} = \text{rain\_intensity} \times \text{absorption\_rate}$$

---

## 3. Diurnal Temperature and Humidity Curves

To simulate realistic daily temperature profiles, the simulator models temperature using a sinusoidal wave offset by daylight hours:

$$T(t) = T_{\text{mean}} + \left(\frac{T_{\text{max}} - T_{\text{min}}}{2}\right) \times \sin\left(\frac{2\pi \times (t - 6)}{24}\right)$$

Where:
*   $t$ is the hour of the day (0–23).
*   The phase shift of `-6` aligns the minimum temperature with dawn (06:00 AM) and the peak temperature with mid-afternoon (03:00 PM).

Relative humidity ($RH$) is modeled as inversely proportional to temperature, reflecting the physical behavior of air mass saturation:

$$RH(t) = RH_{\text{mean}} - \left(\frac{RH_{\text{max}} - RH_{\text{min}}}{2}\right) \times \sin\left(\frac{2\pi \times (t - 6)}{24}\right)$$
