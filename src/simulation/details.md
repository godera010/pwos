# Simulation Details

## Overview
The simulation layer replaces real hardware during development. It produces **realistic sensor data** that mimics actual ESP32 + soil moisture sensors.

---

## Which Files & Why

### `esp32_simulator.py` (12KB) - The Heart
**Why:** Without real hardware, we need realistic sensor data.  
**How:** Physics-based simulation of soil moisture dynamics.

**Key Algorithms:**

#### 1. VPD-Based Moisture Decay
```python
# Vapor Pressure Deficit calculation
es = 0.6108 * exp((17.27 * temp) / (temp + 237.3))  # Saturation pressure
ea = es * (humidity / 100)                           # Actual pressure
vpd = max(0, es - ea)                                # Deficit

# Decay rate scales with VPD
moisture_loss = base_rate * vpd * time_factor
```

**Why VPD?**
- VPD is the primary driver of plant transpiration
- High VPD = dry air = faster evaporation
- More accurate than temperature alone

#### 2. Gradual Watering
**Before (v1):** `moisture += 30%` instantly - UNREALISTIC  
**After (v2):** `moisture += 1.5%` per step - REALISTIC absorption

**Why Gradual?**
- Soil absorbs water slowly
- Prevents moisture overshoot
- More realistic pump behavior

#### 3. Non-Blocking Pump
**Why:** Real pumps don't freeze the system.  
**How:** Pump runs in background, duration tracked separately.

---

### `weather_simulator.py` - Weather Generation
**Why:** Weather patterns affect watering decisions.  
**How:** Diurnal patterns + random variation + occasional rain events.

**Realism Features:**
- Temperature peaks at 2pm, lowest at 5am
- Humidity inversely correlated with temperature
- Rain events are clustered (storms last 2-4 hours)
- Seasonal variation in baseline values

---

### `data_generator.py` - ML Training Data
**Why:** Model needs diverse scenarios to generalize.  
**How:** Generates 10,000+ labeled examples across weather conditions.

**Scenarios Generated:**
1. Normal operation (60%)
2. Heatwave (15%)
3. Rainy period (15%)
4. Edge cases (10%)

---

## Design Decisions

### Why Python (not C++ for ESP32)?
**For simulation:** Python is faster to develop and debug.  
**For production:** Will port to MicroPython/C++ on real ESP32.

The simulation logic directly translates:
```python
# Python simulation
vpd = calculate_vpd(temp, humidity)
moisture -= decay_rate * vpd

# MicroPython ESP32 (same logic)
vpd = calculate_vpd(temp, humidity)
moisture -= decay_rate * vpd
```

### Why MQTT (not HTTP)?
| Aspect | MQTT | HTTP |
|--------|------|------|
| Overhead | 2 bytes header | 100+ bytes header |
| Latency | < 10ms | 50-200ms |
| Battery | Low (persistent conn) | High (new conn each time) |
| IoT Standard | ✅ Yes | ❌ No |

### Why 15-Minute Steps?
- Matches typical sensor polling interval
- 96 steps per day (manageable)
- Fast enough to catch rapid changes
- Slow enough for meaningful trends

---

## Extreme Scenario Handling

### Heatwave (VPD > 2.0 kPa)
- Moisture decay accelerates 3x
- ML should water more frequently
- Tests: `test_simulation_logic.py::test_high_vpd`

### Rain
- Rain adds moisture directly
- ML should STALL watering
- Intensity affects absorption rate

### Sensor Failure
- Random NaN/spike values
- System should detect anomaly
- Tests: `test_simulation_logic.py::test_sensor_failure`

### Pump Failure
- Moisture continues dropping
- System should alert operator
- Tests: `test_simulation_logic.py::test_pump_failure`

---

## Migration to Real Hardware

| Simulation | Real Hardware |
|------------|---------------|
| `esp32_simulator.py` | MicroPython on ESP32 |
| `weather_simulator.py` | OpenWeatherMap API |
| Random sensors | DHT22 + Capacitive sensor |
| `publish_data()` | Same MQTT code |

**The backend doesn't change** - it just receives different MQTT data.
