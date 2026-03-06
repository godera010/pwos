# P-WOS Cloud-Based ML API Implementation
## Matching Your Presentation Architecture

**Architecture:** ESP32/Simulator → MQTT → **Cloud ML API** → Database → Dashboard

---

## 🏗️ CORRECT ARCHITECTURE (From Your PPT)

```
┌─────────────────────────────────────────────────────────────┐
│                    P-WOS ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   ESP32 / SIM    │  Sensors (Moisture, Temp, Humidity)
│   (Edge Device)  │  MQTT Publisher
└────────┬─────────┘
         │
         │ MQTT Protocol
         ▼
┌──────────────────┐
│  MQTT Broker     │  Message Router
│  (Mosquitto)     │  Local or Cloud
└────────┬─────────┘
         │
         │
         ▼
┌──────────────────────────────────────────────────────┐
│           CLOUD-BASED ML API                         │
│  ┌────────────────────────────────────────────┐     │
│  │  Flask/FastAPI Application                  │     │
│  │  ├── MQTT Subscriber (receives data)        │     │
│  │  ├── Database (PostgreSQL/SQLite)           │     │
│  │  ├── ML Model (Random Forest)               │     │
│  │  └── REST Endpoints                         │     │
│  └────────────────────────────────────────────┘     │
│                                                       │
│  Hosted on: Railway / Render / AWS / Google Cloud   │
└───────────────────────┬───────────────────────────────┘
                        │
                        │ HTTP/REST
                        ▼
                ┌─────────────────┐
                │  Web Dashboard  │  User Interface
                │  (HTML/JS)      │  Charts & Controls
                └─────────────────┘
```

---

## ☁️ CLOUD DEPLOYMENT OPTIONS

### Option 1: Railway (Recommended - Easiest)
**Pros:**
- Free tier available
- Automatic deployments from GitHub
- Built-in PostgreSQL
- Easy environment variables

**Cons:**
- Free tier has usage limits

### Option 2: Render
**Pros:**
- Generous free tier
- Automatic SSL
- PostgreSQL included

**Cons:**
- Cold starts on free tier

### Option 3: Google Cloud Run
**Pros:**
- Scales to zero (only pay when used)
- Professional grade

**Cons:**
- More complex setup
- Requires Google Cloud account

### Option 4: AWS Lambda + API Gateway
**Pros:**
- Serverless architecture
- Very scalable

**Cons:**
- Most complex setup
- Cold start latency

---

## 🚀 IMPLEMENTATION PLAN

### PHASE 1: Prepare Code for Cloud Deployment

#### Step 1.1: Restructure Project for Cloud

```
pwos-cloud-api/
├── app.py                    # Main Flask application
├── requirements.txt          # Python dependencies
├── Procfile                  # Railway/Render startup command
├── runtime.txt              # Python version specification
├── railway.json             # Railway configuration (optional)
├── .env.example            # Environment variables template
├── models/
│   ├── data_collector.py
│   ├── train_model.py
│   ├── ml_predictor.py
│   └── trained_model.pkl   # Upload after training
├── database.py
└── mqtt_subscriber.py
```

#### Step 1.2: Create `requirements.txt`

```txt
# Web Framework
flask==3.0.0
flask-cors==4.0.0
gunicorn==21.2.0

# MQTT
paho-mqtt==1.6.1

# Database
psycopg2-binary==2.9.9  # PostgreSQL (for cloud)
# OR
# sqlite3 is built-in for local testing

# ML & Data
scikit-learn==1.3.2
pandas==2.1.4
numpy==1.24.4
joblib==1.3.2

# Utilities
python-dotenv==1.0.0
requests==2.31.0
```

#### Step 1.3: Create `Procfile` (for Railway/Render)

```procfile
web: gunicorn app:app --bind 0.0.0.0:$PORT --workers 2
```

#### Step 1.4: Create `runtime.txt`

```txt
python-3.9.18
```

---

### PHASE 2: Modify Code for Cloud

#### Update `app.py` for Cloud Environment

```python
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import paho.mqtt.client as mqtt
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration - Use environment variables for cloud
PORT = int(os.getenv('PORT', 5000))
DB_PATH = os.getenv('DATABASE_URL', 'pwos_simulation.db')  # Cloud DB or local
MQTT_BROKER = os.getenv('MQTT_BROKER', 'localhost')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_USERNAME = os.getenv('MQTT_USERNAME', None)
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD', None)

# Load ML Model
try:
    from models.ml_predictor import MLPredictor
    ml_predictor = MLPredictor('models/trained_model.pkl', 'models/model_metadata.json')
    print("✅ ML Model loaded successfully")
    USE_ML_MODEL = True
except Exception as e:
    print(f"⚠️  ML Model not available: {e}")
    USE_ML_MODEL = False

# MQTT Setup for Cloud
mqtt_client = mqtt.Client("PWOS_Cloud_API")

if MQTT_USERNAME and MQTT_PASSWORD:
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

def on_connect(client, userdata, flags, rc):
    print(f"📡 Connected to MQTT broker (code {rc})")
    client.subscribe("pwos/sensor/data")

def on_message(client, userdata, msg):
    """Store incoming sensor data in database."""
    try:
        data = json.loads(msg.payload.decode())
        
        # Store in database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO sensor_readings 
            (timestamp, soil_moisture, temperature, humidity, device_id)
            VALUES (?, ?, ?, ?, ?)
        """, (
            data['timestamp'],
            data['soil_moisture'],
            data['temperature'],
            data['humidity'],
            data.get('device_id', 'UNKNOWN')
        ))
        conn.commit()
        conn.close()
        
        print(f"💾 Stored: {data['soil_moisture']}% moisture")
        
    except Exception as e:
        print(f"❌ Error storing data: {e}")

mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Connect to MQTT broker (runs in background)
try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()
    print(f"✅ MQTT client started: {MQTT_BROKER}:{MQTT_PORT}")
except Exception as e:
    print(f"⚠️  MQTT connection failed: {e}")

# ============= API ENDPOINTS =============

@app.route('/')
def home():
    """API home page."""
    return jsonify({
        "name": "P-WOS Cloud ML API",
        "version": "1.0",
        "status": "online",
        "endpoints": {
            "/api/health": "System health check",
            "/api/sensor-data/latest": "Latest sensor reading",
            "/api/sensor-data/history": "Historical data",
            "/api/predict-next-watering": "ML prediction",
            "/api/control/pump": "Pump control (POST)",
            "/api/statistics": "System statistics"
        }
    })

@app.route('/api/health')
def health():
    """Health check endpoint."""
    try:
        # Check database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sensor_readings")
        count = cursor.fetchone()[0]
        conn.close()
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "database": {
                "connected": True,
                "total_readings": count
            },
            "ml_model": {
                "loaded": USE_ML_MODEL
            },
            "mqtt": {
                "connected": mqtt_client.is_connected()
            }
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

@app.route('/api/sensor-data/latest')
def get_latest():
    """Get most recent sensor reading."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, soil_moisture, temperature, humidity, device_id
            FROM sensor_readings
            ORDER BY timestamp DESC
            LIMIT 1
        """)
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"error": "No data available"}), 404
        
        return jsonify({
            "timestamp": row[0],
            "soil_moisture": row[1],
            "temperature": row[2],
            "humidity": row[3],
            "device_id": row[4]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sensor-data/history')
def get_history():
    """Get historical sensor data."""
    limit = request.args.get('limit', 100, type=int)
    limit = min(limit, 1000)  # Cap at 1000 for performance
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT timestamp, soil_moisture, temperature, humidity
            FROM sensor_readings
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        data = [{
            "timestamp": row[0],
            "soil_moisture": row[1],
            "temperature": row[2],
            "humidity": row[3]
        } for row in rows]
        
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/predict-next-watering')
def predict_watering():
    """ML-based watering prediction."""
    try:
        # Get latest reading
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT timestamp, soil_moisture, temperature, humidity
            FROM sensor_readings
            ORDER BY timestamp DESC
            LIMIT 1
        """)
        latest = cursor.fetchone()
        
        if not latest:
            conn.close()
            return jsonify({"error": "No sensor data"}), 404
        
        sensor_data = {
            "timestamp": latest[0],
            "soil_moisture": latest[1],
            "temperature": latest[2],
            "humidity": latest[3]
        }
        
        if USE_ML_MODEL:
            # Get historical moisture for rolling average
            cursor.execute("""
                SELECT soil_moisture FROM sensor_readings 
                ORDER BY timestamp DESC LIMIT 10
            """)
            hist_moisture = [row[0] for row in cursor.fetchall()]
            conn.close()
            
            # ML Prediction
            prediction = ml_predictor.predict(sensor_data, hist_moisture)
            
            return jsonify({
                "needs_water": prediction['needs_watering_soon'],
                "confidence": prediction['confidence'],
                "current_moisture": sensor_data['soil_moisture'],
                "recommendation": "Water soon" if prediction['needs_watering_soon'] else "No action needed",
                "reasoning": prediction['reasoning'],
                "model_type": "ML (Random Forest - Cloud)",
                "probabilities": prediction['probabilities']
            })
        else:
            # Rule-based fallback
            conn.close()
            moisture = sensor_data['soil_moisture']
            needs_water = moisture < 40
            
            return jsonify({
                "needs_water": needs_water,
                "confidence": 0.7,
                "current_moisture": moisture,
                "recommendation": "Water now" if needs_water else "No action needed",
                "reasoning": f"Rule-based: Moisture is {moisture:.1f}%",
                "model_type": "Rule-based (ML model not loaded)"
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/control/pump', methods=['POST'])
def control_pump():
    """Send pump control command via MQTT."""
    try:
        data = request.json
        action = data.get('action', 'OFF')
        duration = data.get('duration', 30)
        
        command = {
            "action": action,
            "duration": duration
        }
        
        # Publish to MQTT
        result = mqtt_client.publish("pwos/control/pump", json.dumps(command))
        
        return jsonify({
            "status": "success",
            "message": f"Pump {action}",
            "duration": duration,
            "mqtt_result": result.rc
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/api/statistics')
def get_statistics():
    """Get system statistics."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM sensor_readings")
        total_readings = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(soil_moisture) FROM sensor_readings")
        avg_moisture = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM watering_events")
        total_waterings = cursor.fetchone()[0]
        
        conn.close()
        
        return jsonify({
            "total_readings": total_readings,
            "total_waterings": total_waterings,
            "avg_moisture": round(avg_moisture, 2) if avg_moisture else 0
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============= RUN APP =============

if __name__ == '__main__':
    # Create database tables if not exists
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                soil_moisture REAL,
                temperature REAL,
                humidity REAL,
                device_id TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS watering_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                duration INTEGER,
                trigger_type TEXT,
                moisture_before REAL
            )
        """)
        conn.commit()
        conn.close()
        print("✅ Database tables ready")
    except Exception as e:
        print(f"⚠️  Database initialization: {e}")
    
    # Start Flask app
    print(f"🚀 Starting P-WOS Cloud API on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False)
```

---

### PHASE 3: Deploy to Railway (Step-by-Step)

#### Step 1: Prepare Your Code

```bash
# In your project root
cd pwos-project

# Create cloud API directory
mkdir pwos-cloud-api
cd pwos-cloud-api

# Copy necessary files
cp ../src/backend/app.py .
cp -r ../src/backend/models .
cp ../data/pwos_simulation.db .  # Initial database

# Create requirements.txt, Procfile, runtime.txt (as shown above)
```

#### Step 2: Create `.env.example`

```bash
# .env.example (template for environment variables)
PORT=5000
MQTT_BROKER=broker.hivemq.com
MQTT_PORT=1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
DATABASE_URL=pwos_simulation.db
```

#### Step 3: Initialize Git

```bash
git init
git add .
git commit -m "Initial commit: P-WOS Cloud API"
```

#### Step 4: Deploy to Railway

1. **Go to:** https://railway.app/
2. **Sign up** with GitHub
3. **Click:** "New Project"
4. **Select:** "Deploy from GitHub repo"
5. **Choose:** Your pwos-cloud-api repository
6. **Railway will:**
   - Auto-detect Python
   - Install dependencies
   - Run Procfile command
   - Assign a public URL

#### Step 5: Configure Environment Variables

In Railway dashboard:
1. Click "Variables"
2. Add:
   ```
   MQTT_BROKER=broker.hivemq.com  (or your MQTT server)
   MQTT_PORT=1883
   ```

#### Step 6: Get Your Cloud API URL

Railway will give you a URL like:
```
https://pwos-production.up.railway.app
```

---

### PHASE 4: Update Your Simulator to Use Cloud API

Your simulator stays the same (publishes to MQTT), but now you can use **Cloud MQTT** broker.

#### Option 1: Use HiveMQ Cloud (Free)

1. Go to: https://www.hivemq.com/mqtt-cloud-broker/
2. Create free cluster
3. Get connection details
4. Update simulator:

```python
# In esp32_simulator.py
MQTT_BROKER = "abc123.s1.eu.hivemq.cloud"  # Your cluster
MQTT_PORT = 8883
MQTT_USERNAME = "your_username"
MQTT_PASSWORD = "your_password"

# Add TLS for cloud MQTT
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
client.tls_set()
```

#### Option 2: Keep Local MQTT, Expose with Tunneling

Use **ngrok** to expose local Mosquitto:
```bash
ngrok tcp 1883
```

Then use the ngrok URL in your cloud API environment variables.

---

### PHASE 5: Update Dashboard to Use Cloud API

**File:** `dashboard.html`

```javascript
// Change API URL to cloud
const API_URL = 'https://pwos-production.up.railway.app/api';

// All fetch calls now go to cloud
async function fetchStatus() {
    const response = await fetch(`${API_URL}/sensor-data/latest`);
    const data = await response.json();
    // ... rest stays the same
}
```

---

## 🎯 FINAL ARCHITECTURE

```
Local Machine:
  └── ESP32 Simulator (Python)
         ↓ MQTT (WiFi simulation)
         
Cloud MQTT Broker (HiveMQ):
  └── broker.hivemq.com
         ↓
         
Cloud ML API (Railway):
  ├── Flask App
  ├── ML Model (Random Forest)
  ├── Database (SQLite or PostgreSQL)
  └── REST Endpoints
         ↓ HTTP
         
Web Dashboard (Anywhere):
  └── HTML/JS (Hosted on Netlify or local)
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] Train ML model locally
- [ ] Create `pwos-cloud-api` directory
- [ ] Add all required files (app.py, requirements.txt, Procfile, etc.)
- [ ] Copy trained model to `models/trained_model.pkl`
- [ ] Initialize Git repository
- [ ] Push to GitHub
- [ ] Create Railway account
- [ ] Deploy from GitHub
- [ ] Configure environment variables
- [ ] Test cloud API endpoints
- [ ] Update simulator to use cloud MQTT
- [ ] Update dashboard to use cloud API URL
- [ ] Test end-to-end flow

---

## 🚀 QUICK START COMMANDS

```bash
# 1. Train model locally first
cd src/backend/models
python data_collector.py
python train_model.py

# 2. Prepare for cloud
mkdir pwos-cloud-api
cd pwos-cloud-api
# ... copy files ...

# 3. Test locally
python app.py
# Visit: http://localhost:5000

# 4. Deploy to Railway
git init
git add .
git commit -m "Deploy P-WOS Cloud API"
# ... push to GitHub and deploy via Railway dashboard
```

---

**This matches your presentation architecture: Cloud-based ML API! 🚀☁️**
