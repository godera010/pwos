# BUILD INSTRUCTIONS
## Step-by-Step Guide to Building P-WOS

---

## PREREQUISITES

Before starting, ensure you have:
- [ ] Computer with 4GB+ RAM
- [ ] Windows, macOS, or Linux
- [ ] Internet connection
- [ ] Admin/sudo access for installations
- [ ] 2-3 hours for initial setup

---

## SECTION 1: ENVIRONMENT SETUP

### Step 1.1: Install Python

**Windows:**
1. Download Python 3.9+ from python.org
2. Run installer
3. ✅ Check "Add Python to PATH"
4. Verify:
```bash
python --version
# Should show: Python 3.9.x or higher
```

**macOS:**
```bash
# Using Homebrew
brew install python@3.9

# Verify
python3 --version
```

**Linux:**
```bash
sudo apt update
sudo apt install python3.9 python3-pip

# Verify
python3 --version
```

---

### Step 1.2: Install MQTT Broker (Mosquitto)

**macOS:**
```bash
brew install mosquitto
brew services start mosquitto

# Verify
ps aux | grep mosquitto
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Verify
sudo systemctl status mosquitto
```

**Windows:**
```bash
# Using Chocolatey
choco install mosquitto

# Or download from: https://mosquitto.org/download/
# Then start as service
```

**Test MQTT:**
```bash
# Terminal 1: Subscribe
mosquitto_sub -h localhost -t "test/topic" -v

# Terminal 2: Publish
mosquitto_pub -h localhost -t "test/topic" -m "Hello MQTT"

# You should see "Hello MQTT" in Terminal 1
```

---

### Step 1.3: Create Project Directory

```bash
# Navigate to where you want the project
cd ~/Documents  # or wherever you prefer

# Create project structure
mkdir -p pwos-project/{docs,src/{simulation,backend/{models,utils},frontend,firmware},data/logs,tests/{integration},scripts,config}

# Navigate into project
cd pwos-project

# Verify structure
ls -la
```

---

### Step 1.4: Install Python Dependencies

```bash
# Create requirements.txt
cat > requirements.txt << EOF
paho-mqtt==1.6.1
flask==3.0.0
flask-cors==4.0.0
pandas==2.1.0
numpy==1.24.0
scikit-learn==1.3.0
joblib==1.3.2
requests==2.31.0
python-dotenv==1.0.0
EOF

# Install all dependencies
pip install -r requirements.txt

# Verify installation
pip list | grep -E "paho-mqtt|flask|pandas|scikit-learn"
```

---

## SECTION 2: BUILD SIMULATOR

### Step 2.1: Create ESP32 Simulator

```bash
# Navigate to simulation directory
cd src/simulation

# Create the simulator file
nano esp32_simulator.py  # or use your favorite editor
```

**Copy this code into `esp32_simulator.py`:**

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
        
        self.soil_moisture = 50.0
        self.temperature = 25.0
        self.humidity = 60.0
        self.pump_on = False
        
        self.moisture_decay_rate = 0.5
        self.pump_refill_rate = 10.0
        
    def connect(self):
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.connect(self.broker, self.port, 60)
        self.client.loop_start()
        
    def on_connect(self, client, userdata, flags, rc):
        print(f"✅ Connected to MQTT (code {rc})")
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
            except Exception as e:
                print(f"Error: {e}")
    
    def simulate_sensors(self, minutes=1):
        hour = datetime.now().hour
        temp_base = 20 + 8 * math.sin((hour - 6) * math.pi / 12)
        self.temperature = temp_base + random.uniform(-1, 1)
        
        hum_base = 80 - (self.temperature - 20) * 2
        self.humidity = max(30, min(90, hum_base + random.uniform(-5, 5)))
        
        if self.pump_on:
            self.soil_moisture += self.pump_refill_rate * (minutes / 60)
        else:
            decay = self.moisture_decay_rate * (minutes / 60)
            decay *= 1 + (self.temperature - 25) / 50
            self.soil_moisture -= decay
        
        self.soil_moisture = max(0, min(100, self.soil_moisture))
        self.soil_moisture += random.uniform(-0.3, 0.3)
    
    def publish(self):
        data = {
            "timestamp": datetime.now().isoformat(),
            "soil_moisture": round(self.soil_moisture, 2),
            "temperature": round(self.temperature, 2),
            "humidity": round(self.humidity, 2),
            "pump_status": "ON" if self.pump_on else "OFF",
            "device_id": "SIM_ESP32_001"
        }
        self.client.publish("pwos/sensor/data", json.dumps(data))
        print(f"📊 M:{data['soil_moisture']}% T:{data['temperature']}°C H:{data['humidity']}%")
    
    def run(self, interval=60):
        print("🚀 ESP32 Simulator Started")
        print(f"Publishing every {interval}s to {self.broker}:{self.port}")
        print("-" * 60)
        
        try:
            while True:
                self.simulate_sensors(interval / 60)
                self.publish()
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n👋 Stopping")
            self.client.loop_stop()
            self.client.disconnect()

if __name__ == "__main__":
    sim = ESP32Simulator("localhost", 1883)
    sim.connect()
    sim.run(60)
```

**Test the simulator:**
```bash
python esp32_simulator.py

# You should see:
# ✅ Connected to MQTT (code 0)
# 📊 M:50.0% T:24.3°C H:62.1%
# (updating every 60 seconds)
```

---

## SECTION 3: BUILD DATABASE

### Step 3.1: Create Database Module

```bash
cd ../backend
nano database.py
```

**Copy this code into `database.py`:**

```python
import sqlite3
from datetime import datetime

class Database:
    def __init__(self, path="../data/sensor_data.db"):
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
        print("✅ Database initialized")
    
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

**Test the database:**
```bash
python3 -c "from database import Database; db = Database(); print('Database works!')"
```

---

## SECTION 4: BUILD BACKEND API

### Step 4.1: Create MQTT Subscriber

```bash
nano mqtt_subscriber.py
```

**Copy code** (from simulation_guide.md, mqtt_subscriber.py section)

### Step 4.2: Create ML Model (Rule-Based)

```bash
mkdir -p models
nano models/ml_model_v1.py
```

**Copy code** (from ml_model_guide.md, RuleBasedPredictor section)

### Step 4.3: Create Main API

```bash
nano app.py
```

**Copy code** (from simulation_guide.md, app.py section)

### Step 4.4: Test API

```bash
# Start API
python app.py

# In another terminal, test:
curl http://localhost:5000/api/status
```

---

## SECTION 5: BUILD FRONTEND

### Step 5.1: Create Dashboard

```bash
cd ../frontend
nano dashboard.html
```

**Copy code** (from simulation_guide.md, dashboard.html section)

### Step 5.2: Test Dashboard

```bash
# Open in browser
open dashboard.html  # macOS
xdg-open dashboard.html  # Linux
start dashboard.html  # Windows

# Or use simple HTTP server:
python3 -m http.server 8000
# Then visit: http://localhost:8000/dashboard.html
```

---

## SECTION 6: RUN COMPLETE SYSTEM

### Step 6.1: Start All Components

**Terminal 1: MQTT Broker**
```bash
mosquitto
```

**Terminal 2: Backend API**
```bash
cd pwos-project/src/backend
python app.py
```

**Terminal 3: Simulator**
```bash
cd pwos-project/src/simulation
python esp32_simulator.py
```

**Terminal 4: Dashboard**
```bash
cd pwos-project/src/frontend
python3 -m http.server 8000
# Open browser: http://localhost:8000/dashboard.html
```

### Step 6.2: Verify Everything Works

✅ Simulator shows sensor data updating  
✅ API shows "MQTT Subscriber connected"  
✅ Dashboard displays real-time data  
✅ Charts are populating  
✅ Manual "Water Now" button works  
✅ Auto-control makes decisions  

---

## SECTION 7: CREATE HELPER SCRIPTS

### Step 7.1: Start All Script

```bash
cd ../../scripts
nano start_all.sh
```

**Content:**
```bash
#!/bin/bash
echo "🚀 Starting P-WOS System..."

# Start MQTT broker
echo "Starting MQTT broker..."
mosquitto &
MOSQUITTO_PID=$!

# Wait for MQTT to start
sleep 2

# Start API
echo "Starting API..."
cd ../src/backend
python app.py &
API_PID=$!

# Wait for API
sleep 3

# Start simulator
echo "Starting Simulator..."
cd ../simulation
python esp32_simulator.py &
SIM_PID=$!

# Start frontend
echo "Starting Dashboard..."
cd ../frontend
python3 -m http.server 8000 &
WEB_PID=$!

echo "✅ All services started!"
echo "📊 Dashboard: http://localhost:8000/dashboard.html"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for interrupt
wait
```

**Make executable:**
```bash
chmod +x start_all.sh
```

---

## SECTION 8: TESTING

### Step 8.1: Manual Testing Checklist

- [ ] System starts without errors
- [ ] Data appears in dashboard within 60 seconds
- [ ] Moisture level changes over time
- [ ] Temperature shows daily cycle
- [ ] Manual pump control works
- [ ] Auto-control makes decisions
- [ ] Database stores all readings
- [ ] Charts update automatically

### Step 8.2: 24-Hour Test

```bash
# Start system
./scripts/start_all.sh

# Let it run overnight
# Check in morning:
cd data
sqlite3 sensor_data.db "SELECT COUNT(*) FROM sensor_readings;"
# Should show ~1440 readings (60s intervals * 24h)
```

---

## SECTION 9: DATA COLLECTION

### Step 9.1: Run for 2-4 Weeks

Keep system running continuously to collect training data.

### Step 9.2: Monitor Health

```bash
# Check logs daily
tail -f data/logs/system.log

# Verify data collection
sqlite3 data/sensor_data.db "SELECT COUNT(*) FROM sensor_readings;"

# Export weekly backup
python scripts/backup_database.py
```

---

## SECTION 10: TRAIN ML MODEL

(After 2-4 weeks of data collection)

### Step 10.1: Export Training Data

```bash
cd src/backend/models
python data_collector.py
# Creates: training_data.csv
```

### Step 10.2: Train Model

```bash
python train_model.py
# Creates: trained_model.pkl, model_metadata.json
```

### Step 10.3: Deploy Model

Update `app.py` to use trained model instead of rules.

---

## TROUBLESHOOTING

### Problem: "Module not found"
```bash
# Solution: Install dependencies
pip install -r requirements.txt
```

### Problem: "Can't connect to MQTT"
```bash
# Check Mosquitto is running
ps aux | grep mosquitto

# Restart if needed
brew services restart mosquitto  # macOS
sudo systemctl restart mosquitto  # Linux
```

### Problem: "Database locked"
```bash
# Close all connections
pkill -f "python.*app.py"
# Restart API
```

### Problem: "Dashboard not updating"
```bash
# Check browser console (F12)
# Verify API is running:
curl http://localhost:5000/api/status
```

---

## NEXT STEPS

After completing all sections:

1. ✅ Mark tasks in `tasks.md` as complete
2. ✅ Run tests from `tests.md`
3. ✅ Document any issues
4. ✅ Commit code to Git
5. ✅ Move to ML training phase

---

## SUCCESS CRITERIA

You've successfully built P-WOS when:

✅ All 4 terminals run without errors  
✅ Dashboard shows live data  
✅ System runs 24+ hours continuously  
✅ Database has 1000+ readings  
✅ Manual and auto controls work  
✅ You understand what each component does  

---

**Congratulations! You now have a working smart irrigation system! 🎉**

Refer to `tasks.md` for detailed task tracking and `guidelines.md` for code standards.
