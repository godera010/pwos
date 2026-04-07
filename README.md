# P-WOS: Predictive Watering Optimization System

<!-- NAV_START -->
<div align="center">
  <a href="README.md">🏠 Home (Root)</a> |
  <a href="src\README.md">💻 Source Code</a> |
  <a href="docs\README.md">📚 Documentation</a> |
  <a href="docs\hardware\README.md">⚙️ Hardware</a> |
  <a href="data\README.md">💾 Data</a>
</div>
<hr>
<!-- NAV_END -->


**Smart Irrigation Digital Twin with Machine Learning Control**

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
2. **Weather Intelligence**: Real-time rain forecasting
3. **Machine Learning**: Random Forest model (93% accuracy, 17 features)
4. **Scientific Validation**: A/B testing framework to measure efficiency

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
python src/backend/app.py              # API Server
python src/simulation/esp32_simulator.py  # Sensor Sim
cd src/frontend && npm run dev         # Dashboard
```

**Access Dashboard:** http://localhost:5000

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
# Run all tests
pytest tests/ -v

# Specific tests
pytest tests/test_simulation_logic.py -v  # 11 simulation tests
pytest tests/test_integration.py -v       # End-to-end tests
```

---

## 📁 Project Structure

```
pwos/
├── src/
│   ├── backend/          # Flask API + ML Model
│   ├── frontend/         # React Dashboard
│   └── simulation/       # ESP32 + Weather Sim
├── tests/                # Pytest test suite
├── data/                 # Database + Training data
├── docs/                 # Documentation
├── models/               # Trained ML model
└── scripts/              # Utility scripts
```

See [docs/README.md](docs/README.md) for full documentation.

---

## 🧠 System Architecture

```
ESP32 Simulator → MQTT Broker → Flask API → ML Predictor
                                    ↓
                              React Dashboard
```

| Layer | Component | Description |
|-------|-----------|-------------|
| Edge | ESP32 Simulation | VPD-based sensor + pump |
| Messaging | MQTT (Mosquitto) | Pub/Sub message broker |
| Backend | Flask API | REST endpoints + SQLite |
| ML | Random Forest | 17 features, 93% accuracy |
| Frontend | React + Vite | Real-time dashboard |

---

## 📊 Key Metrics

| Metric | Value |
|--------|-------|
| Water Savings | **16.7%** (target: ≥15%) |
| ML Accuracy | **93.06%** |
| ML Features | **17** |
| F1-Score | **0.92** |

---

## ⚡ Performance & Acceleration

- **Intel iGPU Acceleration**: The system automatically detects and uses Intel Iris Xe/Arc GPUs via `sklearnex`.
- **Safe Fallback**: If Intel drivers are missing or incompatible, it gracefully degrades to standard CPU processing without crashing.
- **Multi-Core**: Training is optimized with `n_jobs=-1` to utilize all available CPU cores.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md) | 12-phase development plan |
| [DATABASE_GUIDE.md](docs/guides/DATABASE_GUIDE.md) | Database setup for contributors |
| [API_REFERENCE.md](docs/reference/API_REFERENCE.md) | REST API documentation |
| [validation_report.md](docs/reports/validation_report.md) | Hypothesis validation |
| [ML_TRAINING_GUIDE.md](docs/guides/ML_TRAINING_GUIDE.md) | How to retrain the model |

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the [DATABASE_GUIDE.md](docs/guides/DATABASE_GUIDE.md) for setup
4. Run tests (`pytest tests/ -v`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📜 License

This project is part of a thesis submission.

---

**P-WOS v2.0 | February 2026**
\n\n