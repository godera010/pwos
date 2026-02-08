# simulation/ - ESP32 & Weather Simulators

**P-WOS Hardware Simulation Layer**

---

## 📁 Structure

```
simulation/
├── esp32_simulator.py      # Main sensor simulator (12KB)
├── weather_simulator.py    # Weather data generator
├── data_generator.py       # Training data creator
├── generate_history.py     # Historical data generator
└── logs/                   # Simulation logs
```

---

## Key Files

| File | Description |
|------|-------------|
| `esp32_simulator.py` | VPD-based soil moisture simulation |
| `weather_simulator.py` | Temperature, humidity, rain generation |
| `data_generator.py` | Create training CSV data |

---

## ESP32 Simulator Features

| Feature | Description |
|---------|-------------|
| **VPD-based Decay** | Moisture evaporation scales with temp/humidity |
| **Gradual Watering** | Pump adds water incrementally (1.5%/step) |
| **Non-blocking Pump** | Async control with extend/stop |
| **MQTT Publishing** | Publishes to `pwos/sensor/data` |

---

## Run Commands

```bash
# Run simulator (10 cycles)
python src/simulation/esp32_simulator.py 10

# Generate training data
python src/simulation/data_generator.py
```

---

## MQTT Topics

| Topic | Direction | Payload |
|-------|-----------|---------|
| `pwos/sensor/data` | OUT | `{"soil_moisture": 60.0, ...}` |
| `pwos/control/pump` | IN | `{"action": "ON", "duration": 30}` |
