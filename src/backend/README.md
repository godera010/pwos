# backend/ - API Server

**P-WOS Flask API & ML Integration**

---

## 📁 Structure

```
backend/
├── app.py                    # Main API server (26KB)
├── database.py               # SQLite operations
├── mqtt_subscriber.py        # MQTT → Database bridge
├── weather_api.py            # OpenWeatherMap integration
├── automation_controller.py  # Autopilot system
│
├── models/                   # ML Components
│   ├── ml_predictor.py       # 17-feature predictor
│   ├── train_model.py        # Training script
│   ├── data_collector.py     # Data utilities
│   └── artifacts/            # Trained model
│       ├── rf_model.pkl
│       └── model_metadata.json
│
├── utils/                    # Helper functions
└── logs/                     # Backend logs
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

## Run Commands

```bash
# Start API server
python src/backend/app.py

# Start automation controller
python src/backend/automation_controller.py

# Retrain ML model
python src/backend/models/train_model.py
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| MQTT_BROKER | MQTT broker host |
| MQTT_PORT | MQTT port (1883) |
| OPENWEATHER_API_KEY | Weather API key |
