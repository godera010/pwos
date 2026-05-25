# 📂 Project Structure Guide

This guide details the directory layout, module files, and technology configuration of the Predictive Water Optimization System (P-WOS).

---

## 📁 Root Directory Layout

```
pwos/
│
├── docs/                           # Documentation (guides, reference, reports)
│   ├── README.md                   # Docs landing page
│   ├── MASTER_SYSTEM_MANUAL.md     # In-depth technical encyclopedia
│   ├── getting_started/            # Easy-to-read conceptual intros
│   ├── system_architecture/        # Design details (control loop, crops, VPD)
│   ├── core_guides/                # Installation, db, UI setup guides
│   ├── technical_reference/        # Specs (API, MQTT), code style, roadmap
│   └── reports_and_validation/     # Thesis validation and phase reports
│
├── src/                            # System Source Code
│   ├── backend/                    # Flask REST API + ML + MQTT Listener
│   │   ├── app.py                  # Main API server
│   │   ├── database.py             # PostgreSQL pool queries & tables
│   │   ├── automation_controller.py# Autopilot background thread
│   │   ├── weather_api.py          # Weather service wrapper
│   │   ├── scheduler.py            # Cron-like tasks
│   │   ├── models/                 # Random forest model & trainer
│   │   └── utils/                  # VPD formulas & helper scripts
│   │
│   ├── frontend/                   # React Web Application
│   │   ├── src/pages/              # Page views (Dashboard, Analytics, CropSettings)
│   │   └── package.json            # Node dependencies
│   │
│   ├── firmware/                   # ESP32 C++ Microcontroller Code
│   │   └── pwos_esp32/             # Production Arduino sketch
│   │
│   └── simulation/                 # Physical Dynamics Simulators
│       ├── esp32_simulator.py      # Virtual ESP32 device
│       └── weather_simulator.py    # Simulated weather conditions
│
├── data/                           # PostgreSQL backups & training sets
├── logs/                           # Runtime log files (API, hardware, simulator)
├── scripts/                        # Automation & setup batch files
│   ├── start_system.bat            # Runs all simulated components
│   └── setup.bat                   # Installs environments
└── config.py                       # Global project configuration settings
```

---

## 🔧 Core Module Responsibilities

### 1. Backend Service (`src/backend/`)
* **`app.py`:** Initiates the Flask web server and background MQTT thread. Serves all REST endpoints.
* **`database.py`:** Handles PostgreSQL connections via a `ThreadedConnectionPool`. Executes queries with index optimization.
* **`automation_controller.py`:** Enforces the 5-second control loop: polls predictions, evaluates safety boundaries, publishes pump control events.
* **`weather_api.py`:** Interacts with OpenWeatherMap API with a failover to simulation-based weather data.

### 2. Frontend Interface (`src/frontend/`)
* **Dashboard Component:** Telemetry dials, snapper logs, and Explainable AI (XAI) details drawer.
* **Crop Settings Component:** Geographic input maps (GPS coordinates resolution) and crop selection dropdowns.
* **Analytics Component:** Gap-filling algorithms that represent offline sensor intervals as `null` values to preserve metric accuracy.

### 3. Simulation (`src/simulation/`)
* **`esp32_simulator.py`:** Recreates moisture decay physics using current temperature, humidity, and active crop root characteristics. Receives pump signals to dynamically recharge soil moisture.
* **`weather_simulator.py`:** Generates diurnal temperature variations, relative humidity correlations, and rain probabilities.

---

## 🛠️ Technology Stack Specs

| Component | Technology | Version | Location |
|:---|:---|:---|:---|
| **Language (Backend)** | Python | `3.13+` | `/src/backend/` |
| **Language (Frontend)**| TypeScript / React | `19+` | `/src/frontend/` |
| **API Server** | Flask | `3.0+` | `/src/backend/app.py` |
| **Database** | PostgreSQL | `15+` | `/src/backend/database.py` |
| **MQTT Broker** | Mosquitto | `2.0+` | port `1883` |
| **Edge Hardware** | ESP32 | ESP32-WROOM | `/src/firmware/pwos_esp32/` |
| **ML Library** | Scikit-Learn | `1.4+` | `/src/backend/models/` |
