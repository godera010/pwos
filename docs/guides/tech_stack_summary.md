# P-WOS Tech Stack Summary
## Complete Technology Overview

---

## PROJECT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    P-WOS SYSTEM ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   HARDWARE       │  (Future - when it arrives)
│   LAYER          │  - ESP32 microcontroller
│                  │  - Soil moisture sensor
│                  │  - DHT22 (temp/humidity)
│                  │  - Water pump + relay
└────────┬─────────┘
         │
         │ WiFi
         ▼
┌──────────────────┐
│  SIMULATOR       │  (Current - what you're building NOW)
│  LAYER           │  - Python script acting as ESP32
│                  │  - Generates realistic sensor data
│                  │  - Simulates pump control
└────────┬─────────┘
         │
         │ MQTT Protocol
         ▼
┌──────────────────┐
│  MESSAGE         │  - MQTT Broker (Mosquitto)
│  BROKER          │  - Topics: pwos/sensor/data
│                  │            pwos/control/pump
└────────┬─────────┘
         │
         │
         ▼
┌──────────────────┐
│  BACKEND         │  - Flask/FastAPI (Python)
│  API             │  - REST endpoints
│                  │  - ML prediction engine
│                  │  - Control logic
└────────┬─────────┘
         │
         │
         ▼
┌──────────────────┐
│  DATABASE        │  - SQLite (development)
│                  │  - Stores sensor readings
│                  │  - Logs watering events
│                  │  - Training data
└──────────────────┘
         │
         │ HTTP/REST
         ▼
┌──────────────────┐
│  FRONTEND        │  - HTML + JavaScript
│  DASHBOARD       │  - Chart.js for graphs
│                  │  - Real-time updates
│                  │  - Control interface
└──────────────────┘
```

---

## TECH STACK BREAKDOWN

### 1. SIMULATION LAYER (Current Phase)
**Purpose:** Replaces physical hardware during development

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Sensor Simulator** | Python 3.9+ | Generates realistic moisture, temp, humidity data |
| **MQTT Client** | paho-mqtt library | Publishes sensor data, receives pump commands |
| **Physics Engine** | Custom Python logic | Simulates moisture decay, pump refill, temperature cycles |

**Files:**
- `esp32_simulator.py` - Main simulator script

---

### 2. MESSAGING LAYER
**Purpose:** Communication between all components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **MQTT Broker** | Mosquitto | Message routing |
| **Protocol** | MQTT over TCP | Lightweight pub/sub messaging |
| **Topics** | Custom schema | `pwos/sensor/data`, `pwos/control/pump` |

**Alternatives:**
- Local: Mosquitto (recommended for development)
- Cloud: HiveMQ Cloud, EMQX Cloud

---

### 3. BACKEND API
**Purpose:** Core business logic, ML predictions, data management

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Web Framework** | Flask or FastAPI | REST API server |
| **MQTT Subscriber** | paho-mqtt | Listen to sensor data |
| **ML Model (Phase 1)** | Python (rule-based) | Decision logic |
| **ML Model (Phase 3)** | scikit-learn Random Forest | Predictive model |
| **Weather API** | OpenWeatherMap API | Forecast data |
| **Data Processing** | pandas, numpy | Feature engineering |

**Files:**
- `app.py` - Main API server
- `mqtt_subscriber.py` - MQTT listener
- `ml_model_v1.py` - Rule-based predictor
- `ml_predictor.py` - ML model wrapper
- `train_model.py` - Model training
- `database.py` - Database interface
- `weather_simulator.py` - Weather data (or real API)

**API Endpoints:**
```
GET  /api/status              - Current system status
GET  /api/sensor-data         - Historical readings
GET  /api/predict             - ML prediction
POST /api/control/pump        - Manual pump control
POST /api/auto-control        - Automated decision
```

---

### 4. DATABASE
**Purpose:** Persistent storage for all data

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | SQLite | Development database |
| **ORM** | Direct SQL (sqlite3) | Simple queries |
| **Future** | PostgreSQL/MongoDB | Production upgrade |

**Tables:**
```sql
sensor_readings
├── id (PRIMARY KEY)
├── timestamp
├── soil_moisture
├── temperature
├── humidity
└── device_id

watering_events
├── id (PRIMARY KEY)
├── timestamp
├── duration_seconds
├── trigger_type
└── moisture_before

predictions
├── id (PRIMARY KEY)
├── timestamp
├── should_water
├── confidence
└── features (JSON)
```

---

### 5. MACHINE LEARNING
**Purpose:** Predictive irrigation decisions

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Phase 1: Rules** | Python logic | Immediate functionality |
| **Phase 3: ML Model** | scikit-learn | Random Forest Classifier |
| **Training Pipeline** | pandas, sklearn | Data prep, training, evaluation |
| **Model Persistence** | joblib | Save/load trained models |
| **Features** | Custom engineering | Time, derivatives, weather |

**Model Pipeline:**
```
Raw Sensor Data
    ↓
Feature Engineering
    ├── Current readings
    ├── Time features (hour, day)
    ├── Derivatives (moisture change rate)
    └── Weather forecast
    ↓
Random Forest Classifier
    ↓
Prediction: Should Water? (Yes/No)
Confidence: 0.0 - 1.0
```

**Key Files:**
- `ml_model_v1.py` - Rule-based (use now)
- `train_model.py` - Training script
- `ml_predictor.py` - Production predictor
- `data_collector.py` - Prepare training data

---

### 6. FRONTEND DASHBOARD
**Purpose:** User interface for monitoring and control

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **UI Framework** | Vanilla HTML/CSS/JS | Simple, no dependencies |
| **Charts** | Chart.js | Real-time data visualization |
| **HTTP Client** | Fetch API | API communication |
| **Styling** | Custom CSS | Modern gradient design |
| **Hosting** | Local file / Python HTTP server | Development |

**Features:**
- Real-time sensor readings
- ML prediction display
- Historical charts (moisture, temp, humidity)
- Manual pump controls
- Auto-control trigger
- System status monitoring

**Files:**
- `dashboard.html` - Complete SPA (Single Page App)

---

### 7. EXTERNAL SERVICES
**Purpose:** Third-party integrations

| Service | Technology | Purpose | Cost |
|---------|-----------|---------|------|
| **Weather API** | OpenWeatherMap | Forecast data | Free tier: 1000 calls/day |
| **MQTT Cloud** | HiveMQ (optional) | Cloud broker | Free tier available |
| **Hosting** | Railway/Render (future) | API deployment | Free tier available |

---

## DEVELOPMENT TOOLS

| Tool | Purpose |
|------|---------|
| **Python 3.9+** | Main programming language |
| **pip** | Python package manager |
| **VS Code** | Code editor (recommended) |
| **Git/GitHub** | Version control |
| **Postman** | API testing |
| **SQLite Browser** | Database inspection |

---

## PYTHON DEPENDENCIES

```txt
# Core
paho-mqtt              # MQTT client
flask                  # Web framework
flask-cors             # CORS support

# Data & ML
pandas                 # Data manipulation
numpy                  # Numerical computing
scikit-learn           # Machine learning
joblib                 # Model persistence

# Optional
fastapi                # Alternative to Flask
uvicorn                # ASGI server for FastAPI
requests               # HTTP requests (for weather API)
python-dotenv          # Environment variables
```

**Install all:**
```bash
pip install paho-mqtt flask flask-cors pandas numpy scikit-learn joblib
```

---

## FILE STRUCTURE

```
pwos-simulation/
│
├── esp32_simulator.py          # Hardware simulator
│
├── app.py                      # Main API server
├── mqtt_subscriber.py          # MQTT listener
├── database.py                 # Database operations
├── weather_simulator.py        # Weather data
│
├── ml_model_v1.py             # Rule-based model (Phase 1)
├── ml_predictor.py            # ML model wrapper (Phase 3)
├── train_model.py             # Model training script
├── data_collector.py          # Training data prep
│
├── dashboard.html             # Frontend UI
│
├── requirements.txt           # Python dependencies
├── README.md                  # Documentation
│
├── data/
│   ├── sensor_data.db        # SQLite database
│   ├── training_data.csv     # Exported training data
│   ├── trained_model.pkl     # Saved ML model
│   └── model_metadata.json   # Model info
│
└── logs/
    └── system.log            # Application logs
```

---

## TECHNOLOGY DECISIONS & RATIONALE

### Why Python?
- ✅ Easy to learn and rapid development
- ✅ Excellent ML libraries (scikit-learn)
- ✅ Strong IoT support (paho-mqtt)
- ✅ Good for both backend and data science

### Why MQTT?
- ✅ Lightweight protocol for IoT
- ✅ Pub/sub pattern fits our architecture
- ✅ Industry standard for sensor networks
- ✅ Easy to scale

### Why SQLite?
- ✅ No separate server needed
- ✅ Perfect for development and small datasets
- ✅ Easy to backup (single file)
- ✅ Can upgrade to PostgreSQL later

### Why Random Forest?
- ✅ Interpretable (can see which features matter)
- ✅ Works well with small datasets
- ✅ Handles non-linear relationships
- ✅ Robust to overfitting
- ✅ No need for feature scaling

### Why Flask?
- ✅ Lightweight and simple
- ✅ Perfect for small APIs
- ✅ Easy to learn
- ✅ Good documentation

---

## DEPLOYMENT PLAN

### Current (Development):
```
All on localhost:
- Mosquitto on port 1883
- Flask API on port 5000
- Dashboard as local HTML file
- SQLite database file
```

### Future (Production):
```
ESP32 (real hardware)
    ↓ WiFi
Cloud MQTT (HiveMQ)
    ↓
Backend API (Railway/Render)
    ↓
PostgreSQL (cloud database)
    ↓
Frontend (Netlify/Vercel)
```

---

## SYSTEM REQUIREMENTS

### Development Machine:
- **OS:** Windows, macOS, or Linux
- **RAM:** 4GB minimum, 8GB recommended
- **Python:** 3.9 or higher
- **Disk:** 500MB for dependencies + data
- **Network:** Internet for weather API

### Production (Future):
- **ESP32:** 520KB RAM, 4MB Flash
- **Cloud:** Free tier services
- **Monthly Cost:** $0-5 (mostly free tiers)

---

## WHAT YOU HAVE NOW

### ✅ Complete Simulation Environment
- Virtual ESP32 generating realistic data
- MQTT broker for messaging
- Backend API with REST endpoints
- SQLite database
- Web dashboard with charts
- Rule-based ML model

### ✅ Development Workflow
1. Run MQTT broker
2. Start API server
3. Launch simulator
4. Open dashboard
5. System runs end-to-end!

### ✅ Ready for Next Steps
- Collect training data (2-4 weeks)
- Train ML model
- Compare performance
- Document results
- Present findings

---

## QUICK START COMMANDS

```bash
# Terminal 1: MQTT Broker
mosquitto

# Terminal 2: Backend API
cd pwos-simulation
python app.py

# Terminal 3: Simulator
cd pwos-simulation
python esp32_simulator.py

# Terminal 4: Dashboard
# Just open dashboard.html in browser
# Or:
python -m http.server 8000
# Then visit: http://localhost:8000/dashboard.html
```

---

## SUCCESS METRICS

Your tech stack will be proven when:

1. ✅ System runs 24/7 without crashes
2. ✅ 99%+ data capture rate (no lost readings)
3. ✅ ML model achieves 75%+ accuracy
4. ✅ 15%+ water savings vs threshold system
5. ✅ API response time < 2 seconds
6. ✅ Dashboard loads in < 3 seconds

---

## SUMMARY

**You have a complete, production-grade tech stack that:**
- Works entirely in software (no hardware needed yet)
- Uses industry-standard technologies
- Scales from development to production
- Supports full ML workflow
- Costs $0 to run locally
- Is ready for your capstone presentation

**When hardware arrives:** Just replace `esp32_simulator.py` with real ESP32 code. Everything else stays the same!

🚀 **Your tech stack is ready. Start building!**
