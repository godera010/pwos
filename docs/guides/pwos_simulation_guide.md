# P-WOS Simulation Environment Setup
## Develop Your Entire System Without Hardware

---

## OVERVIEW

You can build and test your ENTIRE system before hardware arrives:
- **Virtual ESP32** that generates realistic sensor data
- **MQTT broker** for message passing
- **Cloud API** with ML model
- **Web dashboard** showing live data
- **Complete data pipeline** end-to-end

Everything will work identically to the real system. When hardware arrives, you'll just swap the simulator for real sensors.

---

## QUICK START (5 Minutes)

### What You Need:
- Python 3.8+
- pip (Python package manager)
- Web browser
- Text editor (VS Code recommended)

### Installation:
```bash
# Install Python libraries
pip install paho-mqtt flask flask-cors scikit-learn pandas numpy

# Install MQTT broker (choose one):
# Windows (with chocolatey): choco install mosquitto
# macOS: brew install mosquitto && brew services start mosquitto
# Linux: sudo apt-get install mosquitto && sudo systemctl start mosquitto
```

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                  SIMULATION ENVIRONMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌─────────────────┐          │
│  │  ESP32 Simulator │────────▶│  MQTT Broker    │          │
│  │  (Python Script) │         │  (Mosquitto)    │          │
│  │                  │         │                 │          │
│  │  Generates:      │         └────────┬────────┘          │
│  │  - Soil moisture │                  │                   │
│  │  - Temperature   │                  │                   │
│  │  - Humidity      │                  ▼                   │
│  │  - Realistic     │         ┌─────────────────┐          │
│  │    variations    │         │   Flask API     │          │
│  └──────────────────┘         │                 │          │
│                                │  - Stores data  │          │
│                                │  - ML predict   │          │
│                                │  - Auto control │          │
│                                └────────┬────────┘          │
│                                         │                   │
│                                         ▼                   │
│                                ┌─────────────────┐          │
│                                │  Web Dashboard  │          │
│                                │  (HTML/Chart.js)│          │
│                                │                 │          │
│                                │  - Real-time    │          │
│                                │  - Controls     │          │
│                                │  - Charts       │          │
│                                └─────────────────┘          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## PART 1: ESP32 SIMULATOR

Create a folder `pwos-simulation` and inside it create `esp32_simulator.py`:

```python
import paho.mqtt.client as mqtt
import json
import time
import random
import math
from datetime import datetime

class ESP32Simulator:
    def __init__(self, broker_address, broker_port=1883):
        self.client = mqtt.Client("ESP32_Simulator")
        self.broker = broker_address
        self.port = broker_port
        
        # Initial state (starts at reasonable values)
        self.soil_moisture = 50.0
        self.temperature = 25.0
        self.humidity = 60.0
        self.pump_on = False
        
        # Physics parameters
        self.moisture_decay_rate = 0.5    # % per hour
        self.pump_refill_rate = 10.0      # % per minute
        
    def connect(self):
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
        
    def on_connect(self, client, userdata, flags, rc):
        print(f"✅ Connected to MQTT broker (code {rc})")
        self.client.subscribe("pwos/control/pump")
        
    def on_message(self, client, userdata, msg):
        if msg.topic == "pwos/control/pump":
            try:
                cmd = json.loads(msg.payload.decode())
                if cmd.get('action') == 'ON':
                    self.pump_on = True
                    duration = cmd.get('duration', 30)
                    print(f"🚿 PUMP ON for {duration}s")
                    time.sleep(duration)
                    self.pump_on = False
                    print("🛑 PUMP OFF")
                elif cmd.get('action') == 'OFF':
                    self.pump_on = False
                    print("🛑 PUMP OFF (manual)")
            except Exception as e:
                print(f"Error: {e}")
    
    def simulate_sensors(self, minutes_passed=1):
        """Simulate realistic sensor readings"""
        # Daily temperature cycle
        hour = datetime.now().hour
        temp_base = 20 + 8 * math.sin((hour - 6) * math.pi / 12)
        self.temperature = temp_base + random.uniform(-1, 1)
        
        # Humidity inversely related to temperature
        hum_base = 80 - (self.temperature - 20) * 2
        self.humidity = max(30, min(90, hum_base + random.uniform(-5, 5)))
        
        # Soil moisture physics
        if self.pump_on:
            self.soil_moisture += self.pump_refill_rate * (minutes_passed / 60)
        else:
            decay = self.moisture_decay_rate * (minutes_passed / 60)
            decay *= 1 + (self.temperature - 25) / 50  # Faster at high temp
            self.soil_moisture -= decay
        
        # Keep in bounds
        self.soil_moisture = max(0, min(100, self.soil_moisture))
        self.soil_moisture += random.uniform(-0.3, 0.3)  # Noise
    
    def get_reading(self):
        return {
            "timestamp": datetime.now().isoformat(),
            "soil_moisture": round(self.soil_moisture, 2),
            "temperature": round(self.temperature, 2),
            "humidity": round(self.humidity, 2),
            "pump_status": "ON" if self.pump_on else "OFF",
            "device_id": "SIM_ESP32_001"
        }
    
    def publish(self):
        data = self.get_reading()
        self.client.publish("pwos/sensor/data", json.dumps(data))
        print(f"📊 M:{data['soil_moisture']}% T:{data['temperature']}°C H:{data['humidity']}%")
    
    def run(self, interval_sec=60):
        print("🚀 ESP32 Simulator Started")
        print(f"📡 Publishing every {interval_sec}s to {self.broker}:{self.port}")
        print("-" * 60)
        
        try:
            while True:
                self.simulate_sensors(interval_sec / 60)
                self.publish()
                time.sleep(interval_sec)
        except KeyboardInterrupt:
            print("\n👋 Stopping simulator")
            self.client.loop_stop()
            self.client.disconnect()

if __name__ == "__main__":
    sim = ESP32Simulator("localhost", 1883)
    sim.connect()
    sim.run(60)  # Publish every 60 seconds
```

**Test it:**
```bash
python esp32_simulator.py
```

---

## PART 2: BACKEND API

Create these files in `pwos-simulation/`:

### `database.py`
```python
import sqlite3
import json
from datetime import datetime

class Database:
    def __init__(self, path="sensor_data.db"):
        self.path = path
        self.init_db()
    
    def init_db(self):
        conn = sqlite3.connect(self.path)
        c = conn.cursor()
        
        c.execute('''CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY,
            timestamp TEXT,
            soil_moisture REAL,
            temperature REAL,
            humidity REAL,
            device_id TEXT
        )''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS watering_events (
            id INTEGER PRIMARY KEY,
            timestamp TEXT,
            duration INTEGER,
            trigger_type TEXT,
            moisture_before REAL
        )''')
        
        conn.commit()
        conn.close()
    
    def add_reading(self, data):
        conn = sqlite3.connect(self.path)
        c = conn.cursor()
        c.execute('''INSERT INTO sensor_readings 
                    (timestamp, soil_moisture, temperature, humidity, device_id)
                    VALUES (?, ?, ?, ?, ?)''',
                  (data['timestamp'], data['soil_moisture'], 
                   data['temperature'], data['humidity'], data['device_id']))
        conn.commit()
        conn.close()
    
    def get_recent(self, limit=100):
        conn = sqlite3.connect(self.path)
        c = conn.cursor()
        c.execute('''SELECT timestamp, soil_moisture, temperature, humidity 
                    FROM sensor_readings ORDER BY timestamp DESC LIMIT ?''', (limit,))
        rows = c.fetchall()
        conn.close()
        return [{'timestamp': r[0], 'soil_moisture': r[1], 
                'temperature': r[2], 'humidity': r[3]} for r in rows]
    
    def log_watering(self, duration, trigger, moisture):
        conn = sqlite3.connect(self.path)
        c = conn.cursor()
        c.execute('''INSERT INTO watering_events 
                    (timestamp, duration, trigger_type, moisture_before)
                    VALUES (?, ?, ?, ?)''',
                  (datetime.now().isoformat(), duration, trigger, moisture))
        conn.commit()
        conn.close()
```

### `ml_model.py`
```python
class SimplePredictionModel:
    """Simple rule-based model (replace with sklearn later)"""
    
    def predict(self, sensor_data, weather_data):
        moisture = sensor_data['soil_moisture']
        temp = sensor_data['temperature']
        rain = weather_data['rain_predicted']
        
        # Decision logic
        if moisture < 25:
            return {
                "should_water": True,
                "confidence": 0.95,
                "reasoning": "Critical moisture level"
            }
        elif moisture < 30 and not rain:
            return {
                "should_water": True,
                "confidence": 0.85,
                "reasoning": "Low moisture, no rain predicted"
            }
        elif moisture < 35 and temp > 28:
            return {
                "should_water": True,
                "confidence": 0.75,
                "reasoning": "Low moisture + high temperature"
            }
        else:
            return {
                "should_water": False,
                "confidence": 0.80,
                "reasoning": f"Moisture adequate ({moisture:.1f}%)"
            }

class WeatherSimulator:
    """Simulates weather forecast"""
    
    def get_forecast(self):
        import random
        hour = datetime.now().hour
        rain_prob = 0.3 if 6 <= hour <= 18 else 0.15
        
        return {
            "rain_predicted": random.random() < rain_prob,
            "rain_probability": rain_prob * 100,
            "avg_temp_next_12h": 25 + random.uniform(-3, 3)
        }
```

### `mqtt_subscriber.py`
```python
import paho.mqtt.client as mqtt
import json
from database import Database

class MQTTSubscriber:
    def __init__(self, broker, port=1883):
        self.client = mqtt.Client("API_Subscriber")
        self.broker = broker
        self.port = port
        self.db = Database()
        
    def on_connect(self, client, userdata, flags, rc):
        print(f"✅ API connected to MQTT (code {rc})")
        self.client.subscribe("pwos/sensor/data")
        
    def on_message(self, client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            print(f"📥 Received: M={data['soil_moisture']}%")
            self.db.add_reading(data)
            print("💾 Saved to database")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    def start(self):
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
```

### `app.py`
```python
from flask import Flask, jsonify, request
from flask_cors import CORS
import paho.mqtt.client as mqtt
import json
from database import Database
from ml_model import SimplePredictionModel, WeatherSimulator
from mqtt_subscriber import MQTTSubscriber
from datetime import datetime

app = Flask(__name__)
CORS(app)

db = Database()
ml_model = SimplePredictionModel()
weather = WeatherSimulator()

# MQTT for publishing commands
mqtt_client = mqtt.Client("API_Publisher")
MQTT_BROKER = "localhost"

# Start background subscriber
subscriber = MQTTSubscriber(MQTT_BROKER)
subscriber.start()

@app.route('/api/status')
def status():
    readings = db.get_recent(1)
    if not readings:
        return jsonify({"error": "No data"}), 404
    return jsonify({
        "status": "online",
        "latest": readings[0],
        "total_records": len(db.get_recent(1000))
    })

@app.route('/api/sensor-data')
def sensor_data():
    limit = request.args.get('limit', 100, type=int)
    return jsonify(db.get_recent(limit))

@app.route('/api/predict')
def predict():
    readings = db.get_recent(1)
    if not readings:
        return jsonify({"error": "No data"}), 404
    
    sensor = readings[0]
    forecast = weather.get_forecast()
    prediction = ml_model.predict(sensor, forecast)
    
    return jsonify({
        "prediction": prediction,
        "sensor_data": sensor,
        "weather": forecast
    })

@app.route('/api/control/pump', methods=['POST'])
def control_pump():
    data = request.json
    action = data.get('action', 'OFF')
    duration = data.get('duration', 30)
    
    cmd = {"action": action, "duration": duration}
    mqtt_client.connect(MQTT_BROKER, 1883, 60)
    mqtt_client.publish("pwos/control/pump", json.dumps(cmd))
    mqtt_client.disconnect()
    
    if action == 'ON':
        readings = db.get_recent(1)
        if readings:
            db.log_watering(duration, "MANUAL", readings[0]['soil_moisture'])
    
    return jsonify({"status": "success", "command": cmd})

@app.route('/api/auto-control', methods=['POST'])
def auto_control():
    readings = db.get_recent(1)
    if not readings:
        return jsonify({"error": "No data"}), 404
    
    sensor = readings[0]
    forecast = weather.get_forecast()
    prediction = ml_model.predict(sensor, forecast)
    
    if prediction['should_water']:
        cmd = {"action": "ON", "duration": 30}
        mqtt_client.connect(MQTT_BROKER, 1883, 60)
        mqtt_client.publish("pwos/control/pump", json.dumps(cmd))
        mqtt_client.disconnect()
        
        db.log_watering(30, "ML_PREDICTION", sensor['soil_moisture'])
        
        return jsonify({
            "action": "WATERED",
            "prediction": prediction
        })
    else:
        return jsonify({
            "action": "NO_ACTION",
            "prediction": prediction
        })

if __name__ == '__main__':
    print("🚀 P-WOS API Starting...")
    print(f"📡 MQTT: {MQTT_BROKER}:1883")
    print("🌐 API: http://localhost:5000")
    print("-" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)
```

**Test it:**
```bash
python app.py
```

Then in another terminal:
```bash
curl http://localhost:5000/api/status
```

---

## PART 3: FRONTEND (React App)
The frontend has been upgraded to a modern React application.

### Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173` to see the live dashboard!

### Building for Production
To build the optimized static files served by Flask:
```bash
npm run build
```
This generates the `dist/` folder that Flask serves on port 5000.

---

## RUNNING EVERYTHING

### Terminal 1: MQTT Broker
```bash
mosquitto
```

### Terminal 2: API Server
```bash
cd pwos-simulation
python app.py
```

### Terminal 3: ESP32 Simulator
```bash
cd pwos-simulation
python esp32_simulator.py
```

### Terminal 4: Dashboard
Open `dashboard.html` in your web browser!

---

## WHAT YOU'LL SEE

✅ **ESP32 Simulator** generates realistic sensor data every 60 seconds  
✅ **MQTT** routes messages between components  
✅ **API** stores data and makes ML predictions  
✅ **Dashboard** shows real-time data, charts, and controls  

You can:
- Watch moisture decrease naturally over time
- Click "Water Now" to see moisture increase
- Use "Auto-Control" to let ML decide
- See predictions change based on conditions

---

## TESTING IDEAS

### Test 1: Natural Drying
1. Start with moisture at 60%
2. Let it run for 1 hour
3. Watch it gradually decrease
4. Note when ML recommends watering

### Test 2: Manual Override
1. Let moisture drop to 25%
2. Click "Water Now"
3. Observe moisture increase
4. See how long until next watering needed

### Test 3: Auto-Control
1. Let system run autonomously
2. Click "Run Auto-Control" periodically
3. Check if decisions make sense
4. Review watering logs in database

---

## COLLECTING DATA FOR ML

After running for a while, export your data:

```python
import sqlite3
import pandas as pd

conn = sqlite3.connect('sensor_data.db')
df = pd.read_sql_query("SELECT * FROM sensor_readings", conn)
df.to_csv('training_data.csv', index=False)
```

Use this data to train a real scikit-learn model later!

---

## WHEN HARDWARE ARRIVES

You'll just need to:
1. Flash ESP32 with similar code (replace simulator functions with real sensor reads)
2. Point ESP32 to same MQTT broker
3. **Everything else stays the same!**

---

## TROUBLESHOOTING

**Simulator won't connect:**
- Check Mosquitto is running: `ps aux | grep mosquitto`
- Verify port 1883 is open

**API can't connect to MQTT:**
- Make sure MQTT_BROKER in app.py matches your broker address

**Dashboard not updating:**
- Check browser console for errors
- Verify API is running: `curl http://localhost:5000/api/status`

**No data in charts:**
- Let simulator run for 2-3 minutes first
- Check database exists: `ls sensor_data.db`

---

**You're ready to simulate! Start all 4 terminals and watch your system come alive! 🚀🌱**
