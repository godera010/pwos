# P-WOS Troubleshooting Guide

**Common Issues and Solutions**

---

## Backend Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Backend won't start | Port 5000 in use | `netstat -ano \| findstr :5000` — kill the process |
| `psycopg2.OperationalError: connection refused` | PostgreSQL not running | Start PostgreSQL: `net start postgresql-x64-15` |
| `FATAL: database "pwos" does not exist` | DB not created | `psql -U postgres -c "CREATE DATABASE pwos;"` |
| `FATAL: password authentication failed` | Wrong credentials | Check `DB_PASSWORD` in `src/config.py` or `.env` |
| `ModuleNotFoundError: No module named 'paho'` | Dependencies not installed | `pip install -r requirements.txt` |
| MQTT subscription errors | Mosquitto not running | Start Mosquitto: `mosquitto` or `net start mosquitto` |
| `json.loads()` crash on MQTT message | Backend trying to parse plain-text topic | Ensure `on_message` handles plain-text topics before JSON parsing |

---

## Frontend Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| `npm run dev` fails | Dependencies not installed | `cd src/frontend && npm install` |
| Dashboard shows no data | Backend not running | Start backend: `python src/backend/app.py` |
| Analytics shows wrong averages | Gap-filled entries in calculations | Ensure frontend filters `_isGap: true` entries from KPIs |
| Charts show spikes to zero | Zero-fill instead of null-fill | Update `fillMissingBuckets` to use `null` values |
| API requests fail with CORS error | CORS not configured for your origin | Check `ALLOWED_ORIGINS` in backend config |
| Blank page after build | Vite base path wrong | Check `vite.config.ts` base setting |

---

## MQTT Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Can't connect to broker | Mosquitto not running | `mosquitto -v` (verbose mode to see errors) |
| Retained message stuck | Old retained message from previous session | Clear: `mosquitto_pub -h localhost -t "pwos/system/hardware" -n -r` |
| ESP32 shows OFFLINE in dashboard | LWT from previous disconnect still retained | Re-connect ESP32, or manually publish: `mosquitto_pub -h localhost -t "pwos/system/hardware" -m "ONLINE" -r` |
| Duplicate MQTT client IDs | Two clients with same ID | Change `DEVICE_ID` in `config.h` or simulator |
| Messages not arriving | Wrong broker IP | Verify `MQTT_BROKER` matches in all components |

### Monitor MQTT Traffic
```bash
# See ALL messages on ALL topics
mosquitto_sub -h localhost -t "pwos/#" -v

# Watch only sensor data
mosquitto_sub -h localhost -t "pwos/sensor/data"
```

---

## ESP32 Hardware Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| DHT11 returns NaN | Bad wiring or missing pull-up | Add 10kΩ pull-up on data pin (GPIO 14) |
| Soil reads 0% always | ADC pin not connected | Check wiring on GPIO 34, run `pin_34_diagnostic` test |
| Soil reads 100% always | Sensor submerged or shorted | Re-calibrate `SOIL_DRY` and `SOIL_WET` in `config.h` |
| WiFi won't connect | Wrong credentials or 5GHz band | Verify SSID/password, ensure router broadcasts 2.4GHz |
| MQTT connect fails | Firewall blocking port 1883 | Add firewall exception for port 1883 |
| Pump doesn't activate | Relay wiring or GPIO wrong | Check GPIO 27 → relay IN, verify 5V power to relay |
| ESP32 keeps rebooting | Watchdog timeout (loop blocked) | Check for infinite loops, remove `delay()` calls |
| `E (3650) task_wdt` warning | Watchdog already initialized | Non-critical — ESP32 Core 3.x quirk, can be ignored |
| Upload fails in Arduino IDE | Wrong board or port selected | Select "ESP32 Dev Module" and correct COM port |

---

## Database Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "Connection refused" | PostgreSQL not running | `pg_isready -h localhost -p 5432` to check; start the service |
| "Relation does not exist" | Tables not created | `python src/backend/database.py` |
| "Database is locked" (legacy) | Old SQLite file still being used | Delete `data/pwos_simulation.db` if present; system uses PostgreSQL now |
| Slow queries | Missing indexes | Run `CREATE INDEX idx_readings_timestamp ON sensor_readings(timestamp);` |
| Connection pool exhausted | Too many unclosed connections | Restart backend; check for connection leaks |

---

## ML / Prediction Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Prediction returns `HARDWARE_OFFLINE` | ESP32 status is OFFLINE | Connect hardware or clear retained OFFLINE message |
| Model file not found | `rf_model.pkl` missing | Run `python src/backend/models/train_model.py` |
| Low prediction accuracy | Stale training data | Retrain: `python src/backend/models/train_model.py` |
| Feature mismatch error | Model expects 17 features | Check `ml_predictor.py` feature list matches training data |

---

## Simulation Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Simulator can't connect to MQTT | Broker not running | Start Mosquitto first |
| Dashboard shows stale "OFFLINE" | Retained LWT from previous simulator session | Clear: `mosquitto_pub -h localhost -t "pwos/system/hardware" -n -r` |
| Weather data not updating | No weather source configured | Run weather simulator or set `OPENWEATHER_API_KEY` |
| Simulation step returns empty | Simulation not initialized | Call `/api/simulation/reset` first |

---

## Quick Diagnostic Commands

### Check All Services
```bash
# PostgreSQL
pg_isready -h localhost -p 5432

# Mosquitto
mosquitto_sub -h localhost -t "$SYS/broker/version" -C 1

# Backend
curl http://localhost:5000/api/health

# Frontend
curl http://localhost:5173
```

### View Logs
```bash
# Backend log
type logs\app\app.log

# Simulator log
type logs\sim\esp32_simulator.log

# Hardware log
type logs\hardware\serial_bridge.log

# Most recent errors (PowerShell)
Get-Content logs\app\app.log -Tail 50 | Select-String "ERROR"
```
