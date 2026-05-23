# P-WOS Project Structure
## Complete File Organization

---

## Root Directory

```
pwos/
│
├── docs/                           # All documentation
│   ├── README.md                   # Documentation index
│   ├── PROJECT_OVERVIEW.md         # Research context & architecture diagrams
│   ├── PROJECT_ROADMAP.md          # Phase tracking & progress
│   ├── QUICKSTART.md               # Setup & run in 5 minutes
│   ├── codebase_analysis.md        # Technical architecture summary
│   ├── guides/                     # How-to guides
│   ├── reference/                  # Specifications & standards
│   ├── reports/                    # Academic deliverables
│   ├── hardware/                   # Hardware integration docs
│   └── deployment/                 # Cloud deployment planning
│
├── src/                            # Source code
│   ├── backend/                    # Flask API + ML + MQTT
│   ├── frontend/                   # React Dashboard
│   ├── firmware/                   # ESP32 firmware (C++/Arduino)
│   ├── hardware/                   # Hardware bridge scripts
│   ├── simulation/                 # ESP32 + Weather simulators
│   └── config.py                   # Centralized configuration
│
├── firmware/                       # Standalone firmware copies + tests
│   ├── pwos_esp32/                 # Production firmware
│   ├── pwos_wokwi/                 # Wokwi simulator version
│   └── tests/                     # Hardware component tests
│
├── data/                           # Data storage
│   ├── database/                   # DB schemas & migrations
│   ├── raw/                        # Raw sensor data exports
│   └── processed/                  # Processed data & simulation logs
│
├── logs/                           # Runtime logs
│   ├── app/                        # Backend API logs
│   ├── sim/                        # Simulator logs
│   ├── hardware/                   # Serial bridge logs
│   └── test/                       # Test execution logs
│
├── scripts/                        # Utility & maintenance scripts
│   ├── setup/                      # Environment setup
│   ├── simulation/                 # Simulation launchers
│   ├── data/                       # Data processing scripts
│   ├── testing/                    # Test utilities
│   ├── maintenance/                # DB backup, cleanup
│   ├── monitors/                   # Live monitoring scripts
│   └── experiments/                # A/B test & experiment scripts
│
├── tools/                          # Development tools
├── overview/                       # Project overview materials
│
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Environment template
├── .gitignore                      # Git ignore rules
├── README.md                       # Project overview
├── requirements.txt                # Python dependencies
├── start_pwos.bat                  # One-click production launcher
├── start_simulation.bat            # One-click simulation launcher
└── fix_mosquitto.bat               # Mosquitto troubleshooting
```

---

## Source Code (`src/`)

### Backend (`src/backend/`)

| File | Purpose |
|------|---------|
| `app.py` | Flask API server + integrated MQTT subscriber |
| `database.py` | PostgreSQL persistence (psycopg2) |
| `automation_controller.py` | Autopilot — polls ML predictions, issues pump commands |
| `weather_api.py` | OpenWeatherMap integration with simulation fallback |
| `scheduler.py` | Periodic task scheduling |
| `log_config.py` | Centralized logging configuration |

| Directory | Purpose |
|-----------|---------|
| `models/` | ML model files (predictor, trainer, data collector) |
| `models/artifacts/` | Saved model files (`rf_model.pkl`) |
| `ai_service/` | ML retraining pipeline |
| `utils/` | Shared utilities |
| `tests/` | Backend test suite (unit, integration, scenarios, performance) |

### Frontend (`src/frontend/`)

| File | Purpose |
|------|---------|
| `index.html` | App entry point |
| `vite.config.ts` | Vite bundler configuration |
| `package.json` | Node.js dependencies |

| Directory | Purpose |
|-----------|---------|
| `src/pages/` | Page components (Dashboard, Analytics, SystemHealth, Control) |
| `src/components/` | Reusable UI components |
| `src/components/ui/` | Radix UI primitives |
| `src/services/` | API client (`api.ts`) |
| `src/hooks/` | Custom React hooks (e.g., `useMqtt`) |
| `src/types/` | TypeScript type definitions |
| `src/assets/` | Static assets (images, icons) |
| `e2e/` | Playwright end-to-end tests |

### Firmware (`src/firmware/`)

| File | Purpose |
|------|---------|
| `pwos_esp32/pwos_esp32.ino` | Production ESP32 firmware (C++/Arduino) |
| `pwos_esp32/config.h` | WiFi, MQTT, and pin configuration |
| `pwos_wokwi/` | Wokwi online simulator version |
| `tests/` | Hardware component test sketches |

### Simulation (`src/simulation/`)

| File | Purpose |
|------|---------|
| `esp32_simulator.py` | Virtual ESP32 — sensor physics + MQTT |
| `weather_simulator.py` | Dynamic weather pattern generator |
| `data_generator.py` | Bulk historical data generation |
| `generate_history.py` | Extended sensor history creation |

### Hardware Bridge (`src/hardware/`)

| File | Purpose |
|------|---------|
| `serial_bridge.py` | USB serial → MQTT bridge for ESP32 |
| `hardware_manager.py` | Hardware detection and management |

---

## Data Flow

```
Sensor Input (Hardware or Simulation):
  ESP32 / Simulator  →  MQTT Broker  →  app.py (on_message)  →  PostgreSQL

API Request:
  React Dashboard  →  Flask API (app.py)  →  PostgreSQL / ML Predictor  →  JSON Response

ML Training:
  PostgreSQL  →  data_collector.py  →  training_data.csv  →  train_model.py  →  rf_model.pkl
```

---

## Technology Stack

| Layer | Technology | Location |
|-------|------------|----------|
| **Frontend** | React 19, Vite, TypeScript, Vanilla CSS, Recharts | `src/frontend/` |
| **Backend** | Python 3.13, Flask, psycopg2 | `src/backend/` |
| **Database** | PostgreSQL 15+ | configured in `src/config.py` |
| **ML** | Scikit-Learn, Random Forest (17 features) | `src/backend/models/` |
| **Messaging** | MQTT (Mosquitto) | system service, port 1883 |
| **Firmware** | C++ / Arduino Framework | `src/firmware/pwos_esp32/` |
| **Simulation** | Python (paho-mqtt, numpy) | `src/simulation/` |

---

## Configuration

### Environment Variables (`src/config.py`)
| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `pwos` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | (empty) | Database password |
| `MQTT_BROKER` | `localhost` | MQTT broker host |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `OPENWEATHER_API_KEY` | (none) | OpenWeatherMap API key |

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Python modules | `snake_case.py` | `weather_api.py` |
| React components | `PascalCase.tsx` | `SystemHealth.tsx` |
| CSS files | `snake_case.css` or `index.css` | `index.css` |
| Documentation | `UPPER_CASE.md` or `snake_case.md` | `QUICKSTART.md`, `backend_guide.md` |
| Arduino firmware | `sketch_name.ino` | `pwos_esp32.ino` |
| Config files | `snake_case` | `config.h`, `config.py` |

---

## Dependency Tree

```
Python 3.13+
├── flask (API)
├── paho-mqtt (MQTT client)
├── psycopg2 (PostgreSQL)
├── scikit-learn / sklearnex (ML)
├── numpy (Math)
└── python-dotenv (Environment)

Node.js 18+
├── react 19 (UI framework)
├── vite (Bundler)
├── typescript (Type safety)
├── recharts (Charts)
├── framer-motion (Animations)
├── lucide-react (Icons)
└── @radix-ui (Primitives)

System Services
├── PostgreSQL 15+ (Database)
└── Mosquitto (MQTT Broker)

Hardware
└── Arduino IDE / ESP32 Board Support
    ├── PubSubClient (MQTT)
    ├── DHT sensor library (Adafruit)
    └── ArduinoJson (JSON)
```
