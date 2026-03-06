# backend/ - API Server & ML Pipeline

**P-WOS Flask API, Database, ML Integration & Self-Retraining**

---

## 📁 Structure

```
backend/
├── app.py                    # Flask API server (all endpoints)
├── database.py               # PostgreSQL operations
├── mqtt_subscriber.py        # MQTT → Database bridge
├── weather_api.py            # OpenWeatherMap / sim fallback
├── automation_controller.py  # Autopilot system
├── scheduler.py              # Background scheduler (retrain cron)
├── log_config.py             # Centralized logging config
│
├── models/                   # ML Components
│   ├── ml_predictor.py       # 17-feature predictor
│   ├── train_model.py        # Model training script
│   ├── data_collector.py     # Training data preparation
│   └── artifacts/            # Trained model
│       ├── rf_model.pkl
│       └── model_metadata.json
│
├── ai_service/               # Self-Retraining Pipeline
│   ├── data_extractor.py     # DB → labeled CSV
│   └── retrain_pipeline.py   # Orchestrates retrain cycle
│
├── tests/                    # Pytest test suite
│   └── conftest.py           # Test logging & fixtures
│
└── utils/                    # Helper functions
    └── vpd_calculator.py     # VPD calculation utility
```

---

## Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System status |
| GET | `/api/sensor-data/latest` | Latest readings |
| GET | `/api/predict-next-watering` | ML prediction |
| POST | `/api/control/pump` | Manual pump control |
| GET | `/api/simulation/state` | A/B comparison |

---

## Logging

All backend services log to `logs/app/`. See [`logs/LOG_STRUCTURE.md`](../../logs/LOG_STRUCTURE.md).

| Service | Log File |
|---------|----------|
| `app.py` | `app.log` |
| `mqtt_subscriber.py` | `db_subscriber.log` |
| `automation_controller.py` | `autopilot.log` |
| `weather_api.py` | `weather_api.log` |
| `scheduler.py` | `scheduler.log` |
| `database.py` | `database.log` |
| `models/ml_predictor.py` | `ml_predictor.log` |
| `models/train_model.py` | `train_model.log` |
| `models/data_collector.py` | `data_collector.log` |
| `ai_service/retrain_pipeline.py` | `retrain_pipeline.log` |
| `ai_service/data_extractor.py` | `data_extractor.log` |

---

## Run Commands

```bash
# Start API server
python src/backend/app.py

# Start automation controller
python src/backend/automation_controller.py

# Retrain ML model
python src/backend/models/train_model.py

# Run full retrain pipeline
python src/backend/ai_service/retrain_pipeline.py
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MQTT_BROKER` | MQTT broker host |
| `MQTT_PORT` | MQTT port (default 1883) |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key |
| `DB_HOST` / `DB_PORT` | PostgreSQL host & port |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | PostgreSQL credentials |
