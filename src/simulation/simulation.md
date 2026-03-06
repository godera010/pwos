# simulation/ - ESP32 & Weather Simulators

**P-WOS Hardware Simulation Layer**

---

## 📁 Structure

```
simulation/
├── esp32_simulator.py      # VPD-based sensor simulation
├── weather_simulator.py    # Weather data generator
├── data_generator.py       # Synthetic training data creator
└── generate_history.py     # Historical data generator
```

---

## Key Files

| File | Description |
|------|-------------|
| `esp32_simulator.py` | VPD-based soil moisture simulation with MQTT |
| `weather_simulator.py` | Temperature, humidity, rain generation |
| `data_generator.py` | Create synthetic training CSV data |
| `generate_history.py` | Generate historical sensor + watering records |

---

## ESP32 Simulator Features

| Feature | Description |
|---------|-------------|
| **VPD-based Decay** | Moisture evaporation scales with temp/humidity |
| **Gradual Watering** | Pump adds water incrementally (1.5%/step) |
| **Non-blocking Pump** | Async control with extend/stop |
| **MQTT Publishing** | Publishes to `pwos/sensor/data` |

---

## Logging

All simulation services log to `logs/sim/`. See [`logs/LOG_STRUCTURE.md`](../../logs/LOG_STRUCTURE.md).

| Service | Log File |
|---------|----------|
| `esp32_simulator.py` | `esp32_simulator.log` |
| `weather_simulator.py` | `weather_simulator.log` |
| `data_generator.py` | `data_generator.log` |
| `generate_history.py` | `data_generator.log` |

---

## Run Commands

```bash
# Run ESP32 simulator (default 60s interval)
python src/simulation/esp32_simulator.py

# Run with custom interval (10s)
python src/simulation/esp32_simulator.py 10

# Generate synthetic training data
python src/simulation/data_generator.py
```

---

## MQTT Topics

| Topic | Direction | Payload |
|-------|-----------|---------| 
| `pwos/sensor/data` | OUT | `{"soil_moisture": 60.0, ...}` |
| `pwos/control/pump` | IN | `{"action": "ON", "duration": 30}` |
