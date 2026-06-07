# ✨ Core Features

The **Predictive Water Optimization System (P-WOS)** contains a suite of advanced features designed to maximize irrigation efficiency while keeping system management simple and intuitive.

---

## 🧠 1. Predictive ML Watering (The Brain)
P-WOS does not just react to dry soil; it anticipates it.
* **Rolling Smart Analysis:** Instead of looking at a single snapshot of soil moisture, the system monitors a 30-second rolling average and calculates how quickly the soil is drying out.
* **Intelligent Predictions:** It combines current soil moisture with air temperature, humidity, wind speeds, and rain forecasts, running them through a trained Machine Learning model to decide if watering is required.
* **Efficiency Focus:** The model is optimized to prevent unnecessary watering, ensuring the pump is activated only when the plant will benefit most.

---

## 🌿 2. Crop-Aware Settings
Different plants have different water needs. A tomato plant requires constant, moderate moisture, while sorghum is highly drought-tolerant.
* **5 Pre-Set Profiles:** P-WOS has built-in agronomic profiles for **Maize, Potatoes, Tomatoes, Onions, and Sorghum**.
* **Automatic Threshold Shifts:** When you switch crops, the system automatically updates its moisture parameters:
  * **Critical Limit:** The emergency dry threshold (sorghum is low at 20%, while potatoes require at least 45%).
  * **Target Limit:** The ideal moisture level the soil should reach after watering.
  * **High Limit:** The saturation point to prevent drowning (defaults to 85% for all crops).

---

## 🏜️ 3. Regional Evaporation Adaptation
Atmospheric conditions vary wildly by region. In Zimbabwe, a plant in semi-arid Bulawayo loses water much faster than a plant in the humid Eastern Highlands.
* **Agro-Ecological Zones:** P-WOS supports three distinct climatic zones:
  * 🏜️ **Matabeleland / Bulawayo (Semi-Arid):** Applies a **1.5x evaporation multiplier** to account for high evaporation rates.
  * 🌿 **Mashonaland / Harare (Sub-Humid):** Baseline **1.0x evaporation rate**.
  * 🌧️ **Manicaland / Eastern Highlands (Humid-Cool):** Applies a **0.6x evaporation multiplier** since the cool, damp air slows soil moisture loss.
* **Automatic GPS Resolution:** Simply input your coordinates on the settings page, and the system automatically determines your zone and adjusts the moisture decay math.

---

## 🌦️ 4. Weather & Rain Intelligence
P-WOS integrates live weather forecasts to avoid competing with nature.
* **Rain Suppression:** If rain is forecast within the next 2 hours, all scheduled watering is suspended (**STALLED**). If rain is expected in 2 to 6 hours, watering is suspended unless the soil is critically dry.
* **Wind Protection:** If wind speeds exceed 20 km/h, watering is delayed to prevent water droplets from blowing away before reaching the plant's roots.
* **VPD (Heat Stress) Delays:** If the air is extremely hot and dry (indicated by high Vapor Pressure Deficit), the system delays watering until the evening to prevent instant evaporation.

---

## 🖥️ 5. Premium Interactive Dashboard
All system activity is visualized in a modern web dashboard and mobile application.
* **Real-Time Telemetry:** View gauges showing live soil moisture, air temperature, relative humidity, and wind speed.
* **Explainable AI (XAI) Panel:** The dashboard features a diagnostics drawer that explains *why* the ML brain made its decision (e.g., "Watering stalled because rain is expected in 45 minutes").
* **Snappy Log Terminal:** Scroll through live, clean event logs explaining every autopilot state change.
* **Water Savings Tracker:** See a comparison of how much water P-WOS has saved compared to a traditional timer system.

---

## 🛡️ 6. Hardcoded Safety Overrides
No matter how advanced the ML brain is, plant safety remains the absolute priority. P-WOS includes dual safety boundaries that operate in both **Auto** and **Manual** modes:
1. **Drought Protection:** If soil moisture drops below the crop's **Critical Limit** (e.g. 15%), P-WOS overrides all manual control, ignores wind/heat delays, and activates the pump immediately to save the plant.
2. **Flooding Protection:** If soil moisture reaches **85%**, the pump is cut off immediately. Even if a manual "water for 60 seconds" command is sent, the system kills the pump the moment saturation is detected.
