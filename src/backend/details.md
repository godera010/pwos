# Backend Details

## Overview
The backend is the **brain** of P-WOS - it connects sensors, ML, and the dashboard.

---

## Which Files & Why

### `app.py` (26KB) - The Core API
**Why:** Single entry point for all HTTP communication.  
**How:** Flask with CORS, serves both API endpoints and static React build.

**Key Design Decisions:**
- All endpoints under `/api/*` prefix for clarity
- Simulation endpoints separate from real data endpoints
- CORS enabled for frontend development on different port

### `database.py` - Data Persistence
**Why:** SQLite for simplicity (no server setup needed).  
**How:** Connection pooling, parameterized queries to prevent SQL injection.

**Database Choice Rationale:**
- SQLite = zero config, single file, portable
- Sufficient for single-system (one plant zone)
- Easy migration to PostgreSQL later if needed

### `mqtt_subscriber.py` - Sensor Bridge
**Why:** Decouples sensor data from HTTP traffic.  
**How:** Subscribes to MQTT topic, writes to database asynchronously.

**Why MQTT?**
- Standard IoT protocol
- Low overhead, works with unreliable networks
- ESP32 has native MQTT libraries

### `automation_controller.py` - Autopilot
**Why:** Autonomous decision-making loop.  
**How:** Polls `/api/predict-next-watering`, executes pump commands.

**Why Separate File?**
- Can run independently of API
- Restart without affecting data collection
- Easy to disable for manual mode

### `weather_api.py` - Weather Integration
**Why:** Rain forecast improves predictions by 30%.  
**How:** OpenWeatherMap API with caching to avoid rate limits.

---

## models/ Subdirectory

### `ml_predictor.py` - Prediction Engine
**Why 17 features?** Research showed VPD and weather features dramatically improve accuracy:
- Basic (6 features): 85% accuracy
- Enhanced (12 features): 91% accuracy  
- Full (17 features): 93% accuracy

**Feature Categories:**
1. **Sensor Data** (3): moisture, temp, humidity
2. **Time Features** (4): hour, day, is_daytime, is_hot_hours
3. **Rolling Averages** (3): moisture_6h, temp_6h, change_rate
4. **Weather Features** (4): forecast_minutes, rain_intensity, wind_speed, is_raining
5. **Derived Features** (3): vpd, is_extreme_vpd, is_high_wind

### `train_model.py` - Model Training
**Why Random Forest?**
- Works well with tabular data
- No feature scaling needed
- Interpretable feature importance
- Fast inference (< 10ms)

**Alternatives Considered:**
- Neural Network: Overkill for this data size
- XGBoost: Marginal improvement, more complex
- Linear Regression: Too simple for non-linear relationships

### `artifacts/` - Trained Model Storage
**Why separate folder?**
- Easy to version control models
- Swap models without code changes
- Metadata tracks training parameters

---

## Architecture Decisions

### Why Flask (not FastAPI)?
- Simpler for beginners
- Better documentation
- Sufficient for our throughput needs
- FastAPI's async not needed (SQLite is blocking anyway)

### Why Single-File API (not blueprints)?
- Project size doesn't warrant splitting
- Easier to understand flow
- Can refactor later if needed

### Why Polling (not WebSockets)?
- Dashboard updates every 5 seconds anyway
- Simpler implementation
- WebSockets would be better for sub-second updates

---

## Data Flow

```
ESP32 Simulator
      │
      ▼ MQTT
┌─────────────┐
│ Mosquitto   │
│ Broker      │
└─────┬───────┘
      │
      ▼
┌─────────────┐     ┌─────────────┐
│ MQTT        │────▶│ SQLite DB   │
│ Subscriber  │     └─────────────┘
└─────────────┘           │
                          ▼
                  ┌─────────────┐
                  │ Flask API   │◀──── React Dashboard
                  └─────┬───────┘
                        │
                        ▼
                  ┌─────────────┐
                  │ ML Predictor│
                  │ (17 feat)   │
                  └─────────────┘
```
