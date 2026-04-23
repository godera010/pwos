# src/ - Source Code

<!-- NAV_START -->
<div align="center">
  <a href="..\README.md">🏠 Home (Root)</a> |
  <a href="README.md">💻 Source Code</a> |
  <a href="..\docs\README.md">📚 Documentation</a> |
  <a href="..\docs\hardware\README.md">⚙️ Hardware</a> |
  <a href="..\data\README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->


**P-WOS Core Application Code**

---

## 📁 Structure

```
src/
├── backend/              # Flask API Server
│   ├── app.py            # Main API (all endpoints)
│   ├── database.py       # PostgreSQL operations
│   ├── mqtt_subscriber.py # MQTT → Database bridge
│   ├── weather_api.py    # OpenWeatherMap / sim fallback
│   ├── automation_controller.py # Autopilot system
│   ├── scheduler.py      # Background scheduler
│   ├── log_config.py     # Centralized logging config
│   ├── models/           # ML predictor & training
│   ├── ai_service/       # Self-retraining pipeline
│   ├── tests/            # Pytest test suite
│   └── utils/            # Helper functions
│
├── frontend/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/        # Dashboard, Settings, Hardware
│   │   ├── components/   # Gauge, Layout, Sidebar
│   │   └── services/     # api.ts (API client)
│   └── dist/             # Production build
│
├── simulation/           # Simulators (replace with real hardware)
│   ├── esp32_simulator.py    # VPD-based sensor sim
│   ├── weather_simulator.py  # Weather data generator
│   ├── data_generator.py     # Training data creator
│   └── generate_history.py   # Historical data gen
│
├── firmware/             # ESP32 firmware (future)
└── config.py             # Global configuration
```

Each folder contains a `<foldername>.md` documentation file with detailed structure and info.

---

## 📝 Logging

All services log to `logs/` with categorized subdirectories. See [`logs/LOG_STRUCTURE.md`](../logs/LOG_STRUCTURE.md).

| Directory | Services |
|-----------|----------|
| `logs/app/` | Backend API, database, MQTT, scheduler, ML, monitors |
| `logs/sim/` | ESP32 simulator, weather simulator, data generator |
| `logs/test/` | Pytest runs |

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/app.py` | Main API server |
| `backend/models/ml_predictor.py` | ML prediction engine |
| `backend/ai_service/retrain_pipeline.py` | Self-retraining orchestrator |
| `backend/log_config.py` | Centralized logging helper |
| `simulation/esp32_simulator.py` | ESP32 simulation |
| `frontend/src/pages/Dashboard.tsx` | Main dashboard |

---

## Run Commands

```bash
# Backend API
python src/backend/app.py

# ESP32 Simulator
python src/simulation/esp32_simulator.py

# Automation Controller
python src/backend/automation_controller.py

# Frontend Dev
cd src/frontend && npm run dev
```
\n\n