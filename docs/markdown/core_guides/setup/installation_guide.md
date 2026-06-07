# P-WOS Installation Guide

**Step-by-step setup for all prerequisites**

[← Back to Docs Index](../README.md)

---

## Prerequisites Summary

| Component | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL** | 15+ | Sensor data storage |
| **Mosquitto** | 2.0+ | MQTT message broker |
| **Python** | 3.11+ | Backend & ML engine |
| **Node.js** | 18+ | Frontend dev server |

---

## 1. PostgreSQL Setup

### Windows

1. **Download** from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. **Run the installer** — use default port `5432`
3. **Set a password** for the `postgres` user (remember this!)
4. **Verify installation:**
   ```powershell
   psql -U postgres -c "SELECT version();"
   ```
5. **Create the P-WOS database:**
   ```powershell
   psql -U postgres -c "CREATE DATABASE pwos;"
   ```
6. **Initialize tables:**
   ```powershell
   python src/backend/database.py
   ```
7. **Verify tables were created:**
   ```powershell
   psql -U postgres -d pwos -c "\dt"
   ```
   You should see 5 tables: `sensor_readings`, `watering_events`, `system_logs`, `ml_decisions`, `model_versions`

### Linux (Ubuntu/Debian)

```bash
# Install
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Set password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_password';"

# Create database
sudo -u postgres psql -c "CREATE DATABASE pwos;"

# Initialize tables
python3 src/backend/database.py
```

### Configuration

Database connection is configured in `src/config.py`:

```python
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "pwos")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
```

Set your password via environment variable:
```powershell
# Windows
set DB_PASSWORD=your_password

# Linux
export DB_PASSWORD=your_password
```

---

## 2. Mosquitto MQTT Broker

### Windows

1. **Download** from [mosquitto.org/download](https://mosquitto.org/download/)
2. **Install** with default options
3. **Configure** — edit `C:\Program Files\mosquitto\mosquitto.conf`:

   ```ini
   # Standard MQTT listener (for backend + ESP32)
   listener 1883
   protocol mqtt

   # WebSocket listener (for React frontend)
   listener 9001
   protocol websockets

   # Allow unauthenticated connections (dev only)
   allow_anonymous true
   ```

   > ⚠️ **Critical:** The WebSocket listener on port `9001` is required for the React frontend to connect via `mqtt.js`. Without this, the dashboard will not receive real-time sensor data.

4. **Start Mosquitto:**
   ```powershell
   # As a Windows service
   net start mosquitto

   # Or run manually (shows logs in console)
   & "C:\Program Files\mosquitto\mosquitto.exe" -c "C:\Program Files\mosquitto\mosquitto.conf" -v
   ```

5. **Verify:**
   ```powershell
   # In terminal 1 — subscribe
   mosquitto_sub -h localhost -t "test"

   # In terminal 2 — publish
   mosquitto_pub -h localhost -t "test" -m "hello"
   ```
   You should see `hello` appear in terminal 1.

### Linux (Ubuntu/Debian)

```bash
# Install
sudo apt install mosquitto mosquitto-clients

# Configure WebSocket support
sudo nano /etc/mosquitto/conf.d/pwos.conf
```

Add to the config file:
```ini
listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true
```

```bash
# Restart
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto

# Verify
mosquitto_sub -h localhost -t "test" &
mosquitto_pub -h localhost -t "test" -m "hello"
```

### MQTT Topics Used by P-WOS

| Topic | Direction | Protocol |
|-------|-----------|----------|
| `pwos/sensor/data` | ESP32 → Backend | JSON |
| `pwos/system/hardware` | ESP32 → Backend (LWT) | Plain text |
| `pwos/weather/current` | Backend → ESP32 | JSON |
| `pwos/control/pump` | Backend → ESP32 | JSON |
| `pwos/system/mode` | Bidirectional | Plain text |

See [MQTT Topics Reference](../../technical_reference/specs/mqtt_topics.md) for full details.

---

## 3. Python Setup

### Windows

1. **Download** Python 3.11+ from [python.org](https://www.python.org/downloads/)
2. **Install** — ✅ Check "Add Python to PATH"
3. **Create virtual environment:**
   ```powershell
   cd C:\path\to\pwos
   python -m venv .venv
   .venv\Scripts\activate
   ```
4. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

### Linux

```bash
cd /path/to/pwos
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 4. Node.js & Mobile App Setup

1. **Download** Node.js 18+ from [nodejs.org](https://nodejs.org/)
2. **Install** with default options
3. **Install web frontend dependencies:**
   ```powershell
   cd src/frontend
   npm install
   ```
4. **Install React Native Mobile App dependencies:**
   ```powershell
   cd src/mobile
   npm install --legacy-peer-deps
   ```
   *(Note: `--legacy-peer-deps` resolves peer dependency resolution parameters in the Expo SDK ecosystem).*

---

## 5. Environment Configuration

### Weather API (Optional)

To use real weather data instead of the simulator:

1. Get a free API key from [OpenWeatherMap](https://openweathermap.org/api)
2. Set environment variables:
   ```powershell
   set OPENWEATHERMAP_API_KEY=your_api_key_here
   set WEATHER_API_MODE=openweathermap
   ```

Without an API key, the system uses simulated weather data by default (`WEATHER_API_MODE=simulation`).

---

## 6. Verification Checklist

Run these checks to confirm everything is working:

```powershell
# 1. PostgreSQL is running
pg_isready -h localhost -p 5432
# Expected: localhost:5432 - accepting connections

# 2. Database exists with tables
psql -U postgres -d pwos -c "\dt"
# Expected: 5 tables listed

# 3. Mosquitto is running
mosquitto_sub -h localhost -t "pwos/#" -v
# (leave running, should show no errors)

# 4. Backend starts
python src/backend/app.py
# Expected: "API Connected to MQTT Broker" in logs

# 5. Frontend starts (new terminal)
cd src/frontend && npm run dev
# Expected: opens at http://localhost:5173

# 6. Mobile app starts (new terminal)
cd src/mobile
npx.cmd tsc --noEmit
npx.cmd expo start
# Expected: Type checks successfully and starts the Metro bundler interface.
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `psql: command not found` | Add PostgreSQL bin to PATH: `C:\Program Files\PostgreSQL\15\bin` |
| `Connection refused` on port 5432 | Start PostgreSQL: `net start postgresql-x64-15` (Windows) |
| `Connection refused` on port 1883 | Start Mosquitto: `net start mosquitto` (Windows) |
| `Password authentication failed` | Set `DB_PASSWORD` env var or edit `pg_hba.conf` |
| `npm install` fails | Delete `node_modules` and `package-lock.json`, then retry |
| `ModuleNotFoundError` | Activate venv: `.venv\Scripts\activate` |
| Frontend can't connect to MQTT | Ensure Mosquitto has WebSocket listener on port 9001 |
| Backend says "Model not found" | Run training: `python src/backend/models/train_model.py` |
| Mobile app can't connect to backend | Settings host IP configuration must point to local Wi-Fi router IP (not `localhost`) |
| Mobile app has type errors / SVG errors | Run `npx.cmd tsc --noEmit` and ensure all tags inside Svg components are capitalized (e.g. `<Path>`, not `<path>`) |

---

## Next Steps

After installation:
1. **Start the system** — see [Quick Start Guide](QUICKSTART.md)
2. **Understand the ML model** — see [ML Model Guide](../../ml/ml_model_guide.md)
3. **Explore the database** — see [Database Guide](../technical/database_guide.md)
4. **Debug MQTT** — see [MQTT Topics Reference](../../technical_reference/specs/mqtt_topics.md)
5. **Mobile Setup & Guide** — see [Mobile App Guide](../ui/mobile_guide.md)
