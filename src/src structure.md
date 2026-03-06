# src/ - Source Code

**P-WOS Core Application Code**

---

## 📁 Structure

```
src/
├── backend/                  # Flask API Server
│   ├── app.py                # Main API (all endpoints)
│   ├── database.py           # PostgreSQL operations
│   ├── mqtt_subscriber.py    # MQTT → Database bridge
│   ├── weather_api.py        # OpenWeatherMap / sim fallback
│   ├── automation_controller.py  # Autopilot system
│   ├── scheduler.py          # Background scheduler (retrain cron)
│   ├── log_config.py         # Centralized logging config
│   │
│   ├── models/               # ML Predictor & training
│   │   ├── ml_predictor.py   # 17-feature predictor
│   │   ├── train_model.py    # Model training script
│   │   ├── data_collector.py # Data collection utilities
│   │   └── artifacts/        # rf_model.pkl, metadata
│   │
│   ├── ai_service/           # Self-retraining pipeline
│   │   ├── data_extractor.py # DB → labeled CSV
│   │   └── retrain_pipeline.py # Orchestrates retrain cycle
│   │
│   └── tests/                # Pytest test suite
│       └── conftest.py       # Test logging & fixtures
│
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/            # Dashboard, Settings, Hardware
│   │   ├── components/       # Gauge, Layout, Sidebar
│   │   └── services/         # api.ts (API client)
│   └── dist/                 # Production build
│
├── simulation/               # Simulators (replace with real hardware)
│   ├── esp32_simulator.py    # VPD-based sensor sim
│   ├── weather_simulator.py  # Weather data generator
│   ├── data_generator.py     # Training data creator
│   └── generate_history.py   # Historical data gen
│
├── firmware/                 # ESP32 firmware (future)
└── config.py                 # Global configuration
```

---

## 📝 Logging

All services log to `logs/` with categorized subdirectories. See [`logs/LOG_STRUCTURE.md`](../logs/LOG_STRUCTURE.md) for the full layout.

| Directory | Services |
|-----------|----------|
| `logs/app/` | Backend API, database, MQTT, scheduler, ML, monitors |
| `logs/sim/` | ESP32 simulator, weather simulator, data generator |
| `logs/test/` | Pytest runs |

Logger setup is centralized in `backend/log_config.py` via `setup_logger()`.

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
