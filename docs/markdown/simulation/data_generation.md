# Data Generation & Database Testing

**P-WOS Digital Twin — Historical Data Pipeline & Schema Validation**

---

## Overview

The simulator includes scripts to pre-populate databases with historical logs and simulate system states over long time scales. This history was used to:
1. Train the crop-aware Machine Learning models.
2. Validate PostgreSQL schema design, index performance, and connection pool behavior under heavy query loads.

---

## Generating Training Data

### Bulk Data Generation Scripts
*   `src/simulation/data_generator.py` — Generates a historical CSV dataset for model training.
*   `src/simulation/generate_history.py` — populates the active database with historical sensor records.

To run these generation scripts:
```bash
# Generate bulk training CSV file
python src/simulation/data_generator.py

# Populates local/configured PostgreSQL database with 2 weeks of history
python src/simulation/generate_history.py
```

---

## The Training Data Pipeline

The flow of information from raw simulation processes to the final trained Machine Learning model follows this pipeline:

```
┌─────────────────┐      ┌──────────────┐      ┌──────────────┐
│  ESP32 / WX     │ ───► │  Mosquitto   │ ───► │  Flask API   │
│   Simulators    │      │  MQTT Broker │      │  (app.py)    │
└─────────────────┘      └──────────────┘      └──────┬───────┘
                                                      │ writes
                                                      ▼
┌─────────────────┐      ┌──────────────┐      ┌──────────────┐
│   ML Predictor  │ ◄─── │ CSV Dataset  │ ◄─── │  PostgreSQL  │
│  (rf_model.pkl) │      │  (extracted) │      │   Database   │
└─────────────────┘      └──────────────┘      └──────────────┘
```

1. **Simulators**: Generate raw readings (temperature, humidity, moisture) every simulated step.
2. **MQTT Broker**: Relays data packets over topic channels.
3. **Flask API**: Receives broker updates, checks thresholds, and writes records into database tables.
4. **PostgreSQL Database**: Stores tables for sensor logs, weather forecasts, and automation state events.
5. **CSV Dataset Extractor**: Compiles tables into structured columns representing the 17 features evaluated by the brain.
6. **Model Training**: Evaluates training data using a Random Forest classifier to generate `rf_model.pkl`.

---

## Database Schema Validation

Before connecting physical hardware, the simulation environment was used to run database load testing and verify performance under extreme edge cases:

### 1. Connection Pool Stress Testing
*   **Method**: Scaled the simulation runner to publish sensor messages concurrently across multiple simulated nodes.
*   **Result**: Verified that PostgreSQL connection pooling (`SQLAlchemy` queue size and overflow limits) correctly handles multiple read/write requests without timing out or leaking connections.

### 2. Query Index Optimization
*   **Method**: Loaded the database with **100,000+** rows of historical sensor logs.
*   **Result**: Added database index constraints on search query columns (e.g. `timestamp` and `sensor_id`). This reduced search queries for the latest 15 minutes of readings to less than **5ms**, ensuring that the automation controller makes predictions in real time.

### 3. Edge-Case Validation
*   **Corrupt Payloads**: Verified that the API database insertion queries do not crash or block connection queues when receiving invalid, empty, or truncated JSON payloads.
*   **Stale Weather Logs**: Verified that when the API fails to reach external weather engines, the database falls back to fetching seasonal averages and regional climate variables to keep the system running smoothly.
