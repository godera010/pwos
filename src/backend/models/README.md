# 🧠 P-WOS AI/ML Engine

<!-- NAV_START -->
<div align="center">
  <a href="..\..\..\README.md">🏠 Home (Root)</a> |
  <a href="..\..\README.md">💻 Source Code</a> |
  <a href="..\..\..\docs\README.md">📚 Documentation</a> |
  <a href="..\..\..\docs\hardware\README.md">⚙️ Hardware</a> |
  <a href="..\..\..\data\README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->


This directory contains the core intelligence components for the Predictive Watering Optimization System (P-WOS).

## 📂 Components

| File | Role | Description |
| :--- | :--- | :--- |
| **[`ml_predictor.py`](./ml_predictor.py)** | **The Brain** 🧠 | Loads the trained model and makes real-time decisions. Includes **Safety Rails** to override ML output during adverse conditions. |
| **[`train_model.py`](./train_model.py)** | **The Teacher** 🎓 | Processes historical data, engineers features (VPD, Rolling Avg), and trains the Random Forest model. |
| **[`data_collector.py`](./data_collector.py)** | **The Librarian** 📚 | Collects raw sensor data from SQLite, labels it based on system actions, and exports CSVs for training. |

---

## 🛡️ ML Predictor Logic

The `MLPredictor` uses a **Hybrid Approach**:
1.  **Environmental Safety Rails (Hard Stops)**: Pre-checks conditions that make watering unsafe or wasteful.
2.  **Machine Learning Model**: If unsafe conditions are absent, the Random Forest model predicts if soil moisture will drop below critical levels.
3.  **VPD-Aware Optimization**: Adjusts timing to avoid high-evaporation periods (midday).

### 🚦 Decision States

The system outputs one of four standardized decisions:

| State | Action | Description |
| :--- | :--- | :--- |
| **`NOW`** | **WATER ON** | Immediate watering required. Moisture is low and conditions are safe. |
| **`STALL`** | **WAIT** | Watering needed, but **delayed** due to Rain forecast, High Wind, or Extreme Heat (VPD). |
| **`STOP`** | **OFF** | **Safety Interlock Active**. Raining now, Soil Saturated, or hardware error. |
| **`MONITOR`**| **IDLE** | System optimal. Soil moisture is sufficient. |

### 🚧 Safety Rails & Logic

*   **Rain Check**: 
    *   **Now**: If raining → `STOP` (unless moisture < 10% Critical).
    *   **Soon**: If rain < 2h → `STALL`.
*   **Wind Check**: 
    *   If Wind > 20 km/h → `STALL` (prevents spray drift).
*   **Saturation Check**: 
    *   If Moisture > 85% → `STOP` (prevents runoff/root rot).
*   **False Dry Detection**:
    *   If Wind is High + Humidity Low + Rapid Drop → Flag as "Sensor Error" or `MONITOR`.
*   **Seasonal Thresholds**:
    *   Adjusts critical moisture levels based on Summer (Nov-Mar) vs Winter (May-Sep).

---

## 📊 Training Pipeline

1.  **Data Collection**: `data_collector.py` reads from `data/database/pwos_simulation.db`.
2.  **Feature Engineering**:
    *   **VPD (Vapor Pressure Deficit)**: Calculated from Temp & Humidity.
    *   **Rolling Averages**: 6-hour trends for moisture and temperature.
    *   **Time Features**: Hour of day, Day of week, Is_Daytime.
3.  **Model**: Random Forest Classifier (Scikit-Learn).
4.  **Artifacts**: Saved to `artifacts/rf_model.pkl` and `artifacts/model_metadata.json`.

## 🚀 Usage

```bash
# Train the model
python src/backend/models/train_model.py

# Collect new training data
python src/backend/models/data_collector.py

# Run Predictor (Test)
python src/backend/models/ml_predictor.py
```
\n\n