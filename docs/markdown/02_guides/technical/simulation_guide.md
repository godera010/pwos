# Simulation Guide

**P-WOS Digital Twin — Software Simulation of the ESP32 Hardware**

---

## Overview

When real ESP32 hardware is unavailable, P-WOS runs a complete software simulation that mimics the full IoT feedback loop. The simulator publishes realistic sensor data to MQTT, responds to pump commands, and models physics-based soil moisture decay.

| Component | File | Purpose |
|-----------|------|---------|
| ESP32 Simulator | `src/simulation/esp32_simulator.py` | Virtual sensor readings + pump control |
| Weather Simulator | `src/simulation/weather_simulator.py` | Dynamic weather patterns (sun, rain, wind) |
| Data Generator | `src/simulation/data_generator.py` | Bulk historical data generation |
| History Generator | `src/simulation/generate_history.py` | Generate long-term sensor history |

---

## How to Run

### Start Simulation Stack
```bash
# Terminal 1: Start MQTT Broker
mosquitto

# Terminal 2: Start Backend (subscribes to MQTT)
python src/backend/app.py

# Terminal 3: Start ESP32 Simulator
python src/simulation/esp32_simulator.py

# Terminal 4: Start Frontend
cd src/frontend && npm run dev
```

### One-Click (Windows)
```batch
start_simulation.bat
```

---

## ESP32 Simulator

`src/simulation/esp32_simulator.py` — `SimulatedESP32` class

### What It Simulates
| Feature | Implementation |
|---------|---------------|
| **Soil Moisture Decay** | VPD-based evaporation — higher temp/lower humidity = faster drying |
| **Diurnal Temperature** | Sinusoidal pattern: cooler at night, warmer at midday |
| **Humidity Correlation** | Inversely correlated with temperature |
| **Gradual Watering** | Pump adds moisture incrementally (1.5% per step), not instantly |
| **Non-blocking Pump** | Async pump timer with extend/stop support |
| **Weather Response** | Listens to `pwos/weather/current` and adjusts soil moisture (rain adds moisture) |

### MQTT Behavior
- **Publishes to:** `pwos/sensor/data` (every 5s), `pwos/system/hardware` (`ONLINE` on connect)
- **Subscribes to:** `pwos/control/pump`, `pwos/weather/current`
- **LWT:** Sets `OFFLINE` on `pwos/system/hardware` (retained)
- **Client ID:** `SimulatedESP32`

### Physics Model
```
Soil Moisture Decay = base_rate × VPD_multiplier × time_factor

Where:
  base_rate       = 0.02% per step
  VPD_multiplier  = f(temperature, humidity)
  time_factor     = higher during daytime hours
```

---

## Weather Simulator

`src/simulation/weather_simulator.py` — generates realistic weather patterns

### Weather Conditions
| Condition | Temperature | Humidity | Wind | Rain |
|-----------|-------------|----------|------|------|
| Clear/Sunny | 22–35°C | 30–50% | 0–10 km/h | None |
| Cloudy | 18–28°C | 50–70% | 5–15 km/h | None |
| Rainy | 15–22°C | 70–95% | 10–25 km/h | Yes |
| Storm | 12–20°C | 80–100% | 20–40 km/h | Heavy |

### Integration Points
- Backend's `weather_api.py` can run in **simulation mode** (no API key) or **real mode** (OpenWeatherMap)
- In simulation mode, weather data is published to `pwos/weather/current`
- The ESP32 simulator reacts to weather changes (rain adds moisture, wind increases evaporation)

---

## Simulation Scenarios

The backend API provides built-in simulation scenarios:

### Reset Simulation
```bash
curl -X POST http://localhost:5000/api/simulation/reset \
  -H "Content-Type: application/json" \
  -d '{"scenario": "mixed_weather"}'
```

### Available Scenarios
| Scenario | Description |
|----------|-------------|
| `mixed_weather` | Default — alternating sun, cloud, rain over 2 weeks |
| `dry_season` | Extended heat, minimal rain — tests drought response |
| `rainy_season` | Frequent rain events — tests rain-delay logic |
| `heat_wave` | Extreme temperatures (38°C+) — tests VPD-based stalling |

### Step Through Simulation
```bash
# Advance simulation by 15 minutes
curl -X POST http://localhost:5000/api/simulation/step

# Get current simulation state
curl http://localhost:5000/api/simulation/state
```

---

## Switching Between Simulation and Hardware

The system is designed so you can swap between simulated and real hardware with zero code changes:

| Component | Simulation | Real Hardware |
|-----------|-----------|---------------|
| Sensor Data | `esp32_simulator.py` | ESP32 firmware via WiFi |
| Weather | `weather_simulator.py` or sim mode | OpenWeatherMap API |
| MQTT Topic | Same (`pwos/sensor/data`) | Same (`pwos/sensor/data`) |
| Backend | No change needed | No change needed |
| Frontend | No change needed | No change needed |

The only change is **which device publishes to MQTT** — the rest of the stack is identical.

---

## Generating Training Data

### Bulk Data Generation
```bash
# Generate historical sensor data for ML training
python src/simulation/data_generator.py

# Generate extended history
python src/simulation/generate_history.py
```

### Data Flow
```
Simulator → MQTT → Backend (app.py) → PostgreSQL → data_collector.py → training_data.csv → train_model.py
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Simulator can't connect to MQTT | Ensure Mosquitto is running on port 1883 |
| Soil moisture stuck at 0% | Check simulator is running and publishing |
| Backend shows "OFFLINE" after using simulator | Clear retained MQTT message: `mosquitto_pub -h localhost -t "pwos/system/hardware" -n -r` |
| Weather data not updating | Start weather simulator or configure `OPENWEATHER_API_KEY` |
| Simulation step returns no data | Reset simulation first with `/api/simulation/reset` |
