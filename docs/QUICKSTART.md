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
| **Simulation** | ESP32 + Weather | `src/simulation` | - |
| **Database** | SQLite | `data/` | - |

---

## 2. How to Run

### Option A: One-Click Launcher (Windows)
```batch
rem 1. First-time setup (creates .venv & installs dependencies)
setup.bat

rem 2. Launch System
start_simulation.bat
```

### Option B: Manual Start
```bash
# Terminal 1: Start backend
python src/backend/app.py

# Terminal 2: Start ESP32 simulator
python src/simulation/esp32_simulator.py

# Terminal 3: Start automation controller
python src/backend/automation_controller.py

# Terminal 4: Start frontend (dev mode)
cd src/frontend && npm run dev
```

### Access Points
- **Production**: http://localhost:5000
- **Development**: http://localhost:5173 (hot-reload)

---

## 3. Key Features (v2.0)

| Feature | Description |
|---------|-------------|
| **17-Feature ML Model** | VPD, wind, rain, forecast integration |
| **VPD-based Simulation** | Realistic evaporation physics |
| **Water Savings Dashboard** | Reactive vs Predictive comparison |
| **Rain Forecast** | Delays watering when rain is predicted |

---

## 4. Run Tests

```bash
# Water savings validation (2-week simulation)
python tests/test_water_savings.py

# Integration test (backend + ML + MQTT)
python tests/test_integration.py

# Simulation logic tests (11 scenarios)
pytest tests/test_simulation_logic.py -v
```

---

## 5. Project Structure

```
pwos/
├── docs/                   # Documentation
├── src/
│   ├── backend/            # Flask API + ML Models
│   │   ├── models/         # rf_model.pkl, ml_predictor.py
│   │   └── app.py          # Main API server
│   ├── frontend/           # React Dashboard
│   │   └── src/pages/      # Dashboard.tsx (with savings card)
│   └── simulation/         # ESP32 + Weather simulators
├── tests/                  # Integration & unit tests
└── data/                   # SQLite + Training CSVs
```

---

## 6. Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend not starting | Check port 5000 is free |
| Automation controller fails | Start backend first (it will wait) |
| React dev server fails | Run `npm install` in `src/frontend` |
| MQTT errors | Start Mosquitto broker |

---

## 7. Validated Results

| Metric | Value |
|--------|-------|
| Water Savings | **16.7%** (exceeds 15% target) |
| ML Accuracy | **93.06%** |
| ML Features | **17** |
| F1-Score | **0.92** |
