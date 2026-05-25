# 🛠️ P-WOS Technical Development Roadmap

This is the detailed, developer-facing roadmap tracking the 12 phases of the Predictive Water Optimization System (P-WOS) development, including Completed, In Progress, and Remaining phases.

---

## 🗓️ Timeline Overview

```
Phase 1-8: SIMULATION (Software) ████████████████████████ 100%
Phase 9:   CLOUD MIGRATION       ██████░░░░░░░░░░░░░░░░░░  25%
Phase 10:  WEATHER API           ████████████████████████ 100%
Phase 11:  HARDWARE              ██████████████████████░░  90%
Phase 12:  PRODUCTION            ░░░░░░░░░░░░░░░░░░░░░░░░   0%
```

---

## ✅ COMPLETED PHASES

### Phase 1: Project Setup & Architecture
* **Status:** ✅ COMPLETE
* Centralize python settings in `config.py`.
* Establish Python environment (`requirements.txt`).
* Configure local Mosquitto MQTT broker on port 1883.
* Establish initial SQLite database structures for prototyping.

### Phase 2: ESP32 Simulation
* **Status:** ✅ COMPLETE
* Write `esp32_simulator.py` to mimic physical plant environment.
* Implement MQTT client sending simulated data.
* Code diurnal temperature patterns and moisture decay.
* Implement VPD-based evapotranspiration physics and non-blocking pump logic.

### Phase 3: Weather Simulation
* **Status:** ✅ COMPLETE
* Write `weather_simulator.py` to generate atmospheric readings.
* Link temperature, humidity, and wind speed patterns.
* Add simulated rain events and short-term forecasting.

### Phase 4: Backend API Development
* **Status:** ✅ COMPLETE
* Build Flask app (`app.py`) with REST endpoints.
* Embed background MQTT listener to process incoming readings.
* Setup CORS restrictions and build database logger.

### Phase 5: ML Model Development
* **Status:** ✅ COMPLETE
* Gather historical simulation records.
* Formulate 11 features (moisture, VPD, forecasts, rolling averages).
* Fit Random Forest model (`rf_model.pkl`) using standard split.
* Validate that ML model achieves water savings (>15% target).

### Phase 6: Frontend Dashboard
* **Status:** ✅ COMPLETE
* Establish Vite React TypeScript workspace.
* Build dashboard layout with Recharts telemetry.
* Implement ML diagnostics drawer and live logger.
* Build CropSettings page for agricultural inputs.
* Establish React Native Expo mobile app shell.

### Phase 7: Testing & Validation
* **Status:** ✅ COMPLETE
* Author 11 pytest cases for simulation physics.
* Write backend integration and A/B simulation scripts.
* Validate hypothesis: achieved 16.7% water savings.

### Phase 8: Documentation
* **Status:** ✅ COMPLETE
* Structure the `docs/` folder layout.
* Draft README and detailed guides for all modules.
* Document API specs and MQTT schemas.

---

## 🔄 IN PROGRESS

### Phase 11: Hardware Integration
* **Status:** 🔄 IN PROGRESS (90%)
* **Components Purchased:** ESP32 module, DHT11 sensor, soil sensor, 5V relay, submersible water pump, USB power adapter.
* **Firmware:** Write ESP32 Arduino C++ firmware (`pwos_esp32.ino`) with MQTT client, Last Will and Testament (LWT) support, and manual sync.
* **Physical Assembly:** Wire breadboard prototype and test relay pump activation.
* **Remaining:** Install in final test bed potting soil.

---

## ⬜ REMAINING PHASES

### Phase 9: Cloud Migration
* **Status:** 🔄 IN PROGRESS (25%)
* **Completed:** Migrated SQLite codebase to PostgreSQL.
* **Tasks:**
  * Choose hosting provider (Railway, Render, or Heroku).
  * Deploy Flask API and database schema.
  * Setup cloud MQTT broker (HiveMQ Cloud).
  * Deploy React frontend to Vercel/Netlify.
  * Setup CI/CD pipeline via GitHub Actions.

### Phase 12: Production Deployment
* **Status:** ⬜ NOT STARTED
* **Tasks:**
  * Connect physical ESP32 to cloud MQTT broker.
  * Run 1-week real-world hardware verification.
  * Collect real-world training data and retrain ML model.
  * Finalize thesis paper and project submission.
