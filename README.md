# P-WOS: Predictive Watering Optimization System

<!-- NAV_START -->
<div align="center">
  <a href="README.md">🏠 Home (Root)</a> |
  <a href="src\README.md">💻 Source Code</a> |
  <a href="docs\README.md">📚 Documentation</a> |
  <a href="docs\03_hardware\README.md">⚙️ Hardware</a> |
  <a href="data\README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->

**Smart Irrigation Digital Twin with Machine Learning Control — Multi-Crop, Multi-Region Adaptive System**

---

## 📋 Prerequisites

| Requirement | Version | Download |
|-------------|---------|----------|
| **Python** | 3.13+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 24+ | [nodejs.org](https://nodejs.org/) |
| **MQTT Broker** | Mosquitto | [mosquitto.org](https://mosquitto.org/download/) |

---

## 🎓 Thesis Project Overview

**Goal:** Prove that a predictive ML system can reduce water consumption by >15% compared to reactive thresholds.  
**Result:** ✅ **16.7% Water Savings** achieved in A/B simulation.

This project implements a complete "Digital Twin" of a smart irrigation system, featuring:
1. **IoT Simulation**: Virtual ESP32 devices and sensors
2. **Weather Intelligence**: Real-time rain forecasting (Visual Crossing + OpenWeatherMap) for 3 Zimbabwe regions
3. **Machine Learning**: Multi-crop Random Forest trained on 630,000+ samples across 5 crops × 3 regions
4. **Scientific Validation**: A/B testing framework to measure efficiency
5. **Crop-Aware Control**: Dedicated Crop Settings page to switch crops with dynamic ML threshold adaptation

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/godera010/pwos.git
cd pwos
```

### 2. Install Python Dependencies
```bash
# Verify Python version
python --version  # Should be 3.13+

# Install dependencies
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies
```bash
# Verify Node version
node --version  # Should be 24+

# Install packages
cd src/frontend
npm install
cd ../..
```

### 4. Run the Full System
```bash
# Windows
scripts\start_system.bat

# Or run components separately:
python src/backend/app.py                 # API Server (Port 5000)
python src/simulation/esp32_simulator.py  # Sensor Sim
cd src/frontend && npm run dev            # Dashboard (Port 5173)
```

**Access Dashboard:** http://localhost:5173

---

## 🌱 Crop & Region Selection

Navigate to the **Crop Settings** page (leaf 🌿 icon in the sidebar) to:
- Select your active crop: **Maize, Potatoes, Tomatoes, Onions, or Sorghum**
- View the crop's moisture thresholds (Critical, Low, Proactive, Target) and root profile
- Set your coordinates — the system **automatically resolves** which Zimbabwe agro-ecological zone you are in:
  - 🏜️ **Matabeleland / Bulawayo** (Semi-arid, 1.5× evaporation multiplier)
  - 🌿 **Mashonaland / Harare** (Sub-humid, 1.0× evaporation)
  - 🌧️ **Manicaland / Eastern Highlands** (Humid-cool, 0.6× evaporation)

The ML model, Decision Engine, and Automation Controller all adapt thresholds automatically to the selected crop + resolved region.

---

## 🧪 Validating the Thesis

Run the water savings validation test:
```bash
python tests/test_water_savings.py
```

**Expected Output:**
> ✅ HYPOTHESIS VALIDATED: 16.7% > 15.0% target

---

## 🛠️ Testing

```bash
# Run entire backend test suite (116 tests)
cd src/backend
pytest tests/ -v

# By category
pytest tests/unit/ -v           # Unit tests
pytest tests/integration/ -v    # Integration tests
pytest tests/scenarios/ -v      # Real-world scenario tests
pytest tests/performance/ -v    # Benchmarks
```

**All 116 tests pass.** ✅

---

## 📁 Project Structure

```
pwos/
├── src/
│   ├── backend/          # Flask API + ML Model + Automation Controller
│   ├── frontend/         # React Dashboard (Dashboard, CropSettings, MLInsights)
│   └── simulation/       # ESP32 + Weather Sim
├── tests/                # Pytest test suite (116 tests)
├── data/                 # PostgreSQL training data + Regional weather CSVs
├── docs/                 # Documentation
├── models/               # Trained ML model artifacts
└── scripts/              # Utility scripts
```

See [docs/README.md](docs/README.md) for full documentation.

---

## 🧠 System Architecture

```
ESP32 Simulator → MQTT Broker → Flask API → ML Predictor (Crop-Aware)
                                    ↓               ↓
                          PostgreSQL (Pooled)   Decision Engine
                          (Indexed tables)      (Seasonal + Regional)
                                    ↓
                       React Dashboard
                       (Dashboard | CropSettings | MLInsights)
```

| Layer | Component | Description |
|-------|-----------|-------------|
| Edge | ESP32 Simulation | VPD-based sensor + pump |
| Messaging | MQTT (Mosquitto) | Pub/Sub message broker |
| Backend | Flask API | REST endpoints + PostgreSQL (ThreadedConnectionPool) |
| ML | Random Forest | 12 features, 630k samples, crop & region aware |
| Frontend | React + Vite | Real-time dashboard + Crop Manager page |

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Water Savings | **16.7%** (target: ≥15%) ✅ |
| ML Accuracy | **83.43%** (multi-crop model) |
| ML Training Samples | **630,000** (5 crops × 3 regions) |
| Supported Crops | Maize, Potatoes, Tomatoes, Onions, Sorghum |
| Test Suite | **116 / 116 passing** ✅ |
| DB Connection Pool | **1–20 connections** (ThreadedConnectionPool) |

---

## ⚡ Performance & Architecture (v3.0)

- **Connection Pooling**: `ThreadedConnectionPool` (1–20 connections) eliminates TCP connection churn; custom `PoolConnectionWrapper` maintains full unit test compatibility.
- **DB Indexes**: Descending timestamp indexes on `sensor_readings`, `watering_events`, `ml_decisions`, `system_logs` — eliminates full-table scans.
- **In-Memory Settings Path**: ML inference receives active settings directly from Flask's memory cache, bypassing disk I/O on every prediction.
- **`threading.Timer` for Pump Settling**: Replaced raw sleeping threads with a safe daemon Timer for post-pump moisture capture.
- **React Memoization**: MQTT callbacks wrapped with `useCallback`; `useEffect` dependency arrays fully specified — no infinite render loops.
- **CORS Restrictions**: Allowed origins locked to trusted local development ports.
- **Input Validation**: Geographic coordinate bounds validation (`[-90,90]` / `[-180,180]`) with descriptive 400 errors; sensor data defensively clamped.
- **Intel iGPU Acceleration**: Auto-detects Intel Iris Xe/Arc GPUs via `sklearnex` with graceful CPU fallback.
- **Multi-Core Training**: `n_jobs=-1` utilizes all available CPU cores.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [**MASTER_SYSTEM_MANUAL.md**](docs/MASTER_SYSTEM_MANUAL.md) | **Definitive Technical Encyclopedia (Start Here for Deep Understanding)** |
| [QUICKSTART.md](docs/01_getting_started/QUICKSTART.md) | Run the system in 5 minutes |
| [PROJECT_OVERVIEW.md](docs/01_getting_started/PROJECT_OVERVIEW.md) | Full system architecture and diagrams |
| [CROP_INTEGRATION_PLAN.md](docs/04_architecture_&_research/planning/crop_integration_plan.md) | Multi-crop & region integration design |
| [PROJECT_ROADMAP.md](docs/01_getting_started/PROJECT_ROADMAP.md) | 12-phase development plan |
| [DATABASE_GUIDE.md](docs/02_guides/technical/database_guide.md) | Database setup, schema, connection pooling |
| [API_REFERENCE.md](docs/05_reference/specs/api_reference.md) | Full REST API documentation |
| [ml_model_guide.md](docs/02_guides/ml/ml_model_guide.md) | Multi-crop ML training & inference guide |
| [backend_guide.md](docs/02_guides/technical/backend_guide.md) | Backend architecture & performance guide |
| [main_dashboard.md](docs/02_guides/ui/main_dashboard.md) | Premium dashboard UI, explainable AI diagnostics |
| [tests.md](docs/02_guides/operations/tests.md) | Complete test suite reference (116 tests) |
| [validation_report.md](docs/06_reports_&_validation/analysis/validation_report.md) | Hypothesis validation report |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [DATABASE_GUIDE.md](docs/guides/DATABASE_GUIDE.md) for setup
4. Run tests (`cd src/backend && pytest tests/ -v`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📜 License

This project is part of a thesis submission.

---

**P-WOS v3.0 | May 2026**