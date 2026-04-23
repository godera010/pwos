# 🚀 P-WOS Quick Start Guide

**Predictive Water Optimization System**
*ML-driven IoT smart irrigation achieving 16.7% water savings*

---

## 1. System Overview

| Component | Tech Stack | Location | Port |
|-----------|------------|----------|------|
| **Frontend** | React + Vite + TypeScript | `src/frontend` | `5173` |
| **Backend** | Flask (Python 3.13) | `src/backend` | `5000` |
| **ML Model** | Random Forest (17 features) | `src/backend/models` | - |
| **Database** | PostgreSQL | configured in `src/config.py` | `5432` |
| **Simulation** | ESP32 + Weather | `src/simulation` | - |
| **MQTT Broker** | Mosquitto | system service | `1883` |

---

## 2. Prerequisites

Before running P-WOS, ensure these services are installed and running:

| Dependency | Purpose | Install |
|------------|---------|---------|
| **Python 3.13+** | Backend & simulation | [python.org](https://www.python.org/) |
| **Node.js 18+** | Frontend dev server | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL 15+** | Sensor data storage | [postgresql.org](https://www.postgresql.org/) |
| **Mosquitto** | MQTT message broker | [mosquitto.org](https://mosquitto.org/) |

### Database Setup
```bash
# Create the P-WOS database
psql -U postgres -c "CREATE DATABASE pwos;"

# The backend will auto-create tables on first start
python src/backend/database.py
```

---

## 3. How to Run

### Option A: One-Click Launcher (Windows)
```batch
rem 1. First-time setup (creates .venv & installs dependencies)
setup.bat

rem 2. Launch System
start_simulation.bat
```

### Option B: Manual Start
```bash
# Terminal 1: Start backend (connects to MQTT + PostgreSQL)
python src/backend/app.py

# Terminal 2: Start ESP32 simulator (or connect real ESP32 hardware)
python src/simulation/esp32_simulator.py

# Terminal 3: Start automation controller
python src/backend/automation_controller.py

# Terminal 4: Start frontend (dev mode)
cd src/frontend && npm run dev
```

> **Note:** If using real ESP32 hardware instead of the simulator, ensure the firmware publishes `ONLINE` to `pwos/system/hardware` on MQTT connect (already included in the firmware at `src/firmware/pwos_esp32/pwos_esp32.ino`).

### Access Points
- **Frontend (Dev)**: http://localhost:5173 (hot-reload)
- **Backend API**: http://localhost:5000

---

## 4. Key Features

| Feature | Description |
|---------|-------------|
| **17-Feature ML Model** | VPD, wind, rain, forecast integration |
| **VPD-based Simulation** | Realistic evaporation physics |
| **Water Savings Dashboard** | Reactive vs Predictive comparison |
| **Rain Forecast** | Delays watering when rain is predicted |
| **Hardware Status Tracking** | MQTT LWT auto-detects ESP32 online/offline |
| **Gap-Aware Analytics** | Null-value gap filling for accurate KPIs |
| **Live WebSocket Dashboard** | Real-time sensor data via MQTT bridge |

---

## 5. Run Tests

```bash
# Water savings validation (2-week simulation)
python tests/test_water_savings.py

# Integration test (backend + ML + MQTT)
python tests/test_integration.py

# Simulation logic tests (11 scenarios)
pytest tests/test_simulation_logic.py -v
```

---

## 6. Project Structure

```
pwos/
├── docs/                   # Documentation
├── src/
│   ├── backend/            # Flask API + ML Models + MQTT subscriber
│   │   ├── models/         # rf_model.pkl, ml_predictor.py
│   │   ├── ai_service/     # Retraining pipeline
│   │   └── app.py          # Main API server (integrated MQTT)
│   ├── frontend/           # React Dashboard
│   │   └── src/pages/      # Dashboard, Analytics, SystemHealth, Control
│   ├── firmware/           # ESP32 C++/Arduino firmware
│   │   └── pwos_esp32/     # Production firmware with LWT
│   └── simulation/         # ESP32 + Weather simulators
├── tests/                  # Integration & unit tests
├── logs/                   # Runtime logs (app, sim, hardware)
└── data/                   # Training CSVs & calibration data
```

---

## 7. Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend not starting | Check port 5000 is free, verify PostgreSQL is running |
| Database connection error | Check `src/config.py` for `DB_HOST`, `DB_PORT`, `DB_NAME` |
| Automation controller fails | Start backend first (it will wait) |
| React dev server fails | Run `npm install` in `src/frontend` |
| MQTT errors | Ensure Mosquitto broker is running on port 1883 |
| ESP32 shows offline | Verify firmware publishes to `pwos/system/hardware` topic |
| Analytics shows wrong averages | Ensure backend is running; gap-filled entries are filtered from KPIs |

---

## 8. Validated Results

| Metric | Value |
|--------|-------|
| Water Savings | **16.7%** (exceeds 15% target) |
| ML Accuracy | **93.06%** |
| ML Features | **17** |
| F1-Score | **0.92** |
