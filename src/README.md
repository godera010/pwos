# src/ - Source Code

**P-WOS Core Application Code**

---

## 📁 Structure

```
src/
├── backend/              # Flask API Server
│   ├── app.py            # Main API (26KB, all endpoints)
│   ├── database.py       # SQLite operations
│   ├── mqtt_subscriber.py # MQTT → Database bridge
│   ├── weather_api.py    # Weather data fetching
│   ├── automation_controller.py # Autopilot system
│   └── models/           # ML Predictor & trained model
│       ├── ml_predictor.py   # 17-feature predictor
│       ├── train_model.py    # Model training script
│       ├── data_collector.py # Data collection utilities
│       └── artifacts/        # rf_model.pkl, metadata
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
├── hardware/             # Hardware abstraction (future)
├── ai/                   # AI utilities
└── config.py             # Global configuration
```

---

## Key Files

| File | Purpose | Size |
|------|---------|------|
| `backend/app.py` | Main API server | 26KB |
| `backend/models/ml_predictor.py` | ML prediction engine | 9.7KB |
| `simulation/esp32_simulator.py` | ESP32 simulation | 12KB |
| `frontend/src/pages/Dashboard.tsx` | Main dashboard | 12KB |

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
