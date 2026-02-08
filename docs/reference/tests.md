# TESTING DOCUMENTATION
## Complete Testing Guide for P-WOS

---

## TESTING PHILOSOPHY

**Test Early, Test Often, Test Everything**

- Write tests as you code, not after
- Each component should be tested independently
- Integration tests verify components work together
- End-to-end tests simulate real user workflows
- Automated tests prevent regressions

---

## TESTING LEVELS

```
┌─────────────────────────────────┐
│   End-to-End Tests              │  Full system workflows
│   (Black box, user perspective) │
└─────────────────────────────────┘
           ↑
┌─────────────────────────────────┐
│   Integration Tests             │  Component interaction
│   (Multiple modules)            │
└─────────────────────────────────┘
           ↑
┌─────────────────────────────────┐
│   Unit Tests                    │  Individual functions
│   (Isolated, fast)              │
└─────────────────────────────────┘
```

---

## SECTION 1: ENVIRONMENT SETUP TESTS

### Test 1.1: Python Installation

**Purpose:** Verify Python 3.9+ is installed

```bash
# Run this command
python --version

# Expected output:
Python 3.9.x (or higher)

# If fails:
# - Reinstall Python
# - Check PATH environment variable
```

**Pass Criteria:** Version 3.9.0 or higher displayed

---

### Test 1.2: Package Installation

**Purpose:** Verify all Python packages installed correctly

```bash
# Create test script: tests/test_packages.py
import sys

required_packages = [
    'paho.mqtt.client',
    'flask',
    'flask_cors',
    'pandas',
    'numpy',
    'sklearn',
    'joblib'
]

def test_imports():
    """Test that all required packages can be imported."""
    for package in required_packages:
        try:
            __import__(package.replace('.', '_'))
            print(f"✅ {package}")
        except ImportError as e:
            print(f"❌ {package}: {e}")
            return False
    return True

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
```

```bash
# Run test
python tests/test_packages.py
```

**Pass Criteria:** All packages show ✅

---

### Test 1.3: MQTT Broker

**Purpose:** Verify Mosquitto is running and accessible

```bash
# Terminal 1: Start subscriber
mosquitto_sub -h localhost -t "test/ping" -v

# Terminal 2: Publish message
mosquitto_pub -h localhost -t "test/ping" -m "pong"

# Expected: Terminal 1 shows "test/ping pong"
```

**Pass Criteria:**
- No connection errors
- Message received in under 1 second
- Can publish and subscribe successfully

---

## SECTION 2: SIMULATOR TESTS

### Test 2.1: Simulator Initialization

```python
# tests/test_simulator.py
from src.simulation.esp32_simulator import ESP32Simulator

def test_simulator_init():
    """Test simulator initializes with valid defaults."""
    sim = ESP32Simulator("localhost", 1883)
    
    # Check initial values
    assert 0 <= sim.soil_moisture <= 100
    assert -10 <= sim.temperature <= 50
    assert 0 <= sim.humidity <= 100
    assert sim.pump_on == False
    
    print("✅ Simulator initializes correctly")

if __name__ == "__main__":
    test_simulator_init()
```

**Pass Criteria:**
- No exceptions raised
- All assertions pass
- Initial values reasonable

---

### Test 2.2: Moisture Decay

```python
def test_moisture_decay():
    """Test that moisture decreases over time."""
    sim = ESP32Simulator("localhost", 1883)
    sim.soil_moisture = 50.0
    sim.pump_on = False
    
    initial_moisture = sim.soil_moisture
    
    # Simulate 1 hour
    sim.simulate_sensors(minutes=60)
    
    # Moisture should have decreased
    assert sim.soil_moisture < initial_moisture
    print(f"✅ Moisture decayed from {initial_moisture}% to {sim.soil_moisture}%")

if __name__ == "__main__":
    test_moisture_decay()
```

**Pass Criteria:**
- Moisture decreases by 0.3-0.7% per hour
- Never goes below 0%
- Decay rate affected by temperature

---

### Test 2.3: Pump Effect

```python
def test_pump_increases_moisture():
    """Test that pump increases moisture."""
    sim = ESP32Simulator("localhost", 1883)
    sim.soil_moisture = 30.0
    sim.pump_on = True
    
    initial = sim.soil_moisture
    
    # Simulate 5 minutes of pumping
    sim.simulate_sensors(minutes=5)
    
    assert sim.soil_moisture > initial
    increase = sim.soil_moisture - initial
    assert 0.5 <= increase <= 1.5  # About 10% per minute / 12
    
    print(f"✅ Pump increased moisture by {increase:.2f}%")

if __name__ == "__main__":
    test_pump_increases_moisture()
```

**Pass Criteria:**
- Moisture increases when pump on
- Rate approximately 10% per minute
- Never exceeds 100%

---

### Test 2.4: MQTT Publishing

```python
def test_mqtt_publishing():
    """Test simulator publishes data to MQTT."""
    import paho.mqtt.client as mqtt
    import json
    import time
    
    received_data = []
    
    def on_message(client, userdata, msg):
        data = json.loads(msg.payload.decode())
        received_data.append(data)
    
    # Setup subscriber
    client = mqtt.Client("test_subscriber")
    client.on_message = on_message
    client.connect("localhost", 1883, 60)
    client.subscribe("pwos/sensor/data")
    client.loop_start()
    
    # Start simulator
    sim = ESP32Simulator("localhost", 1883)
    sim.connect()
    time.sleep(2)  # Wait for connection
    
    # Publish one reading
    sim.publish()
    time.sleep(1)
    
    # Check received data
    assert len(received_data) > 0
    data = received_data[0]
    assert 'soil_moisture' in data
    assert 'temperature' in data
    assert 'humidity' in data
    assert 'timestamp' in data
    
    print("✅ MQTT publishing works correctly")
    
    client.loop_stop()
    client.disconnect()

if __name__ == "__main__":
    test_mqtt_publishing()
```

**Pass Criteria:**
- Data received via MQTT
- JSON format valid
- All required fields present

---

## SECTION 3: DATABASE TESTS

### Test 3.1: Database Initialization

```python
# tests/test_database.py
import os
from src.backend.database import Database

def test_database_creation():
    """Test database file and tables are created."""
    test_db = "test_sensor_data.db"
    
    # Remove if exists
    if os.path.exists(test_db):
        os.remove(test_db)
    
    # Create database
    db = Database(test_db)
    
    # Check file exists
    assert os.path.exists(test_db)
    
    # Check tables exist
    import sqlite3
    conn = sqlite3.connect(test_db)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table'
    """)
    tables = [row[0] for row in cursor.fetchall()]
    
    assert 'sensor_readings' in tables
    assert 'watering_events' in tables
    
    conn.close()
    os.remove(test_db)
    
    print("✅ Database initialized correctly")

if __name__ == "__main__":
    test_database_creation()
```

**Pass Criteria:**
- Database file created
- All required tables exist
- Schema matches specification

---

### Test 3.2: Insert and Retrieve Data

```python
def test_insert_and_retrieve():
    """Test inserting and retrieving sensor data."""
    test_db = ":memory:"  # In-memory database
    db = Database(test_db)
    
    # Insert test data
    test_reading = {
        'timestamp': '2025-02-06T10:00:00',
        'soil_moisture': 45.5,
        'temperature': 25.3,
        'humidity': 62.1,
        'device_id': 'TEST_001'
    }
    
    db.add_reading(test_reading)
    
    # Retrieve data
    readings = db.get_recent(1)
    
    assert len(readings) == 1
    retrieved = readings[0]
    
    assert retrieved['soil_moisture'] == 45.5
    assert retrieved['temperature'] == 25.3
    assert retrieved['humidity'] == 62.1
    
    print("✅ Data insertion and retrieval works")

if __name__ == "__main__":
    test_insert_and_retrieve()
```

**Pass Criteria:**
- Data inserted successfully
- Retrieved data matches inserted data
- No data corruption

---

### Test 3.3: Large Dataset Performance

```python
def test_large_dataset():
    """Test database with 10,000 readings."""
    import time
    from datetime import datetime, timedelta
    
    test_db = ":memory:"
    db = Database(test_db)
    
    # Insert 10,000 readings
    start_time = time.time()
    base_time = datetime.now()
    
    for i in range(10000):
        reading = {
            'timestamp': (base_time + timedelta(minutes=i)).isoformat(),
            'soil_moisture': 50 + (i % 30) - 15,
            'temperature': 20 + (i % 20),
            'humidity': 60 + (i % 30),
            'device_id': 'TEST_001'
        }
        db.add_reading(reading)
    
    insert_time = time.time() - start_time
    
    # Retrieve recent 100
    start_time = time.time()
    readings = db.get_recent(100)
    query_time = time.time() - start_time
    
    assert len(readings) == 100
    assert insert_time < 10  # Should complete in under 10 seconds
    assert query_time < 1    # Should query in under 1 second
    
    print(f"✅ Inserted 10k rows in {insert_time:.2f}s")
    print(f"✅ Queried 100 rows in {query_time:.3f}s")

if __name__ == "__main__":
    test_large_dataset()
```

**Pass Criteria:**
- 10,000 inserts complete successfully
- Query performance acceptable
- No memory leaks

---

## SECTION 4: API TESTS

### Test 4.1: API Server Startup

```bash
# Start API server
cd src/backend
python app.py

# In another terminal, test basic connectivity
curl http://localhost:5000/api/status

# Expected: JSON response with status
# {
#   "status": "online",
#   "latest_reading": {...},
#   ...
# }
```

**Pass Criteria:**
- Server starts without errors
- Responds to HTTP requests
- Returns valid JSON

---

### Test 4.2: All Endpoints

```python
# tests/test_api.py
import requests
import json

API_BASE = "http://localhost:5000/api"

def test_status_endpoint():
    """Test GET /api/status"""
    response = requests.get(f"{API_BASE}/status")
    assert response.status_code == 200
    data = response.json()
    assert 'status' in data
    print("✅ Status endpoint works")

def test_sensor_data_endpoint():
    """Test GET /api/sensor-data"""
    response = requests.get(f"{API_BASE}/sensor-data?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    print("✅ Sensor data endpoint works")

def test_predict_endpoint():
    """Test GET /api/predict"""
    response = requests.get(f"{API_BASE}/predict")
    assert response.status_code == 200
    data = response.json()
    assert 'prediction' in data
    assert 'should_water' in data['prediction']
    print("✅ Predict endpoint works")

def test_control_pump():
    """Test POST /api/control/pump"""
    command = {
        "action": "ON",
        "duration": 30
    }
    response = requests.post(
        f"{API_BASE}/control/pump",
        json=command
    )
    assert response.status_code == 200
    print("✅ Pump control endpoint works")

if __name__ == "__main__":
    test_status_endpoint()
    test_sensor_data_endpoint()
    test_predict_endpoint()
    test_control_pump()
    print("\n🎉 All API tests passed!")
```

```bash
# Run tests (make sure API server is running first!)
python tests/test_api.py
```

**Pass Criteria:**
- All endpoints return 200 OK
- Response format matches specification
- Response time < 2 seconds

---

## SECTION 5: ML MODEL TESTS

### Test 5.1: Rule-Based Model Decisions

```python
# tests/test_ml_model.py
from src.backend.models.ml_model_v1 import RuleBasedPredictor

def test_critical_moisture():
    """Test critical moisture triggers watering."""
    model = RuleBasedPredictor()
    
    sensor = {
        'soil_moisture': 20,  # Critical
        'temperature': 25,
        'humidity': 60
    }
    weather = {
        'rain_predicted': False,
        'rain_probability': 10
    }
    
    prediction = model.predict(sensor, weather)
    
    assert prediction['should_water'] == True
    assert prediction['urgency'] == 'CRITICAL'
    assert prediction['confidence'] > 0.9
    print("✅ Critical moisture test passed")

def test_rain_delays_watering():
    """Test rain forecast delays watering."""
    model = RuleBasedPredictor()
    
    sensor = {
        'soil_moisture': 28,  # Low
        'temperature': 25,
        'humidity': 60
    }
    weather = {
        'rain_predicted': True,
        'rain_probability': 80
    }
    
    prediction = model.predict(sensor, weather)
    
    assert prediction['should_water'] == False
    assert 'rain' in prediction['reasoning'].lower()
    print("✅ Rain delay test passed")

def test_preventive_watering():
    """Test preventive watering in hot weather."""
    model = RuleBasedPredictor()
    
    sensor = {
        'soil_moisture': 35,
        'temperature': 32,  # Hot
        'humidity': 40
    }
    weather = {
        'rain_predicted': False,
        'rain_probability': 5
    }
    
    prediction = model.predict(sensor, weather)
    
    assert prediction['should_water'] == True
    assert 'temperature' in prediction['reasoning'].lower()
    print("✅ Preventive watering test passed")

if __name__ == "__main__":
    test_critical_moisture()
    test_rain_delays_watering()
    test_preventive_watering()
    print("\n🎉 All ML model tests passed!")
```

**Pass Criteria:**
- All decision scenarios work correctly
- Confidence scores reasonable (0.6-1.0)
- Reasoning makes sense

---

## SECTION 6: FRONTEND TESTS

### Test 6.1: Dashboard Loads

```bash
# Open dashboard
cd src/frontend
python3 -m http.server 8000

# Visit in browser: http://localhost:8000/dashboard.html

# Manual checks:
# [ ] Page loads without errors
# [ ] All UI elements visible
# [ ] No console errors (F12)
# [ ] Charts render correctly
# [ ] Buttons are clickable
```

**Pass Criteria:**
- Page loads in < 3 seconds
- No JavaScript errors
- All sections display

---

### Test 6.2: Real-Time Updates

```bash
# With all services running:
# 1. Open dashboard
# 2. Watch for 2 minutes
# 3. Verify:

# [ ] Moisture value updates
# [ ] Temperature updates
# [ ] Humidity updates
# [ ] Charts add new data points
# [ ] Last update timestamp changes
# [ ] Prediction box updates
```

**Pass Criteria:**
- Data updates every 10-30 seconds
- Charts animate smoothly
- No UI freezing

---

### Test 6.3: Manual Controls

```javascript
// Browser console test
async function testManualControl() {
    // Test Water Now button
    const response = await fetch('http://localhost:5000/api/control/pump', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'ON', duration: 30})
    });
    
    const data = await response.json();
    console.log('Water Now:', data);
    
    // Should see moisture increase in next reading
}

testManualControl();
```

**Pass Criteria:**
- Button triggers API call
- Feedback message displays
- Moisture increases after watering

---

## SECTION 7: INTEGRATION TESTS

### Test 7.1: Full Data Flow

**Purpose:** Verify end-to-end data pipeline

```
Simulator → MQTT → API → Database → Dashboard
```

**Steps:**
1. Start all 4 services
2. Wait 5 minutes
3. Verify each step

```bash
# Check simulator is publishing
mosquitto_sub -h localhost -t "pwos/sensor/data" -C 5

# Check database has data
sqlite3 data/sensor_data.db "SELECT COUNT(*) FROM sensor_readings;"

# Check API returns data
curl http://localhost:5000/api/sensor-data?limit=5

# Check dashboard displays data
# (manually in browser)
```

**Pass Criteria:**
- Data flows through entire pipeline
- No data loss (>95% capture rate)
- Latency < 5 seconds end-to-end

---

### Test 7.2: 1-Hour Stability Test

```bash
# Start all services
./scripts/start_all.sh

# Let run for 1 hour

# After 1 hour, verify:
sqlite3 data/sensor_data.db "
SELECT 
    COUNT(*) as total_readings,
    MIN(soil_moisture) as min_moisture,
    MAX(soil_moisture) as max_moisture,
    AVG(temperature) as avg_temp
FROM sensor_readings
WHERE timestamp > datetime('now', '-1 hour');
"

# Expected: ~60 readings (one per minute)
```

**Pass Criteria:**
- 55-65 readings (allowing for minor delays)
- No crashes or restarts
- Memory usage stable
- CPU usage < 50%

---

### Test 7.3: 24-Hour Test

```bash
# Start system
./scripts/start_all.sh

# Let run overnight

# Next day, check:
sqlite3 data/sensor_data.db "
SELECT COUNT(*) FROM sensor_readings;
"

# Should be ~1440 readings (24 hours * 60 readings/hour)
```

**Pass Criteria:**
- 1350-1500 readings (93-104% capture)
- System still running
- No errors in logs
- Database not corrupted

---

### Test 7.4: Pump Control Integration

```python
# tests/integration/test_pump_control.py
import time
import requests

def test_pump_control_flow():
    """Test complete pump control flow."""
    
    # 1. Get current moisture
    response = requests.get('http://localhost:5000/api/status')
    initial_moisture = response.json()['latest_reading']['soil_moisture']
    print(f"Initial moisture: {initial_moisture}%")
    
    # 2. Activate pump for 30 seconds
    requests.post('http://localhost:5000/api/control/pump', 
                  json={'action': 'ON', 'duration': 30})
    print("Pump activated")
    
    # 3. Wait for pump to finish + new reading
    time.sleep(90)  # 30s pump + 60s max reading interval
    
    # 4. Get new moisture
    response = requests.get('http://localhost:5000/api/status')
    new_moisture = response.json()['latest_reading']['soil_moisture']
    print(f"New moisture: {new_moisture}%")
    
    # 5. Verify increase
    assert new_moisture > initial_moisture
    print(f"✅ Moisture increased by {new_moisture - initial_moisture:.2f}%")

if __name__ == "__main__":
    test_pump_control_flow()
```

**Pass Criteria:**
- Pump activation confirmed
- Moisture increases after watering
- Event logged in database

---

## SECTION 8: ML TRAINING TESTS

### Test 8.1: Data Export

```python
# tests/test_data_collection.py
from src.backend.models.data_collector import DataCollector
import os

def test_export_training_data():
    """Test exporting data for ML training."""
    collector = DataCollector()
    
    # Export data
    df = collector.export_for_training('test_training_data.csv')
    
    # Verify file created
    assert os.path.exists('test_training_data.csv')
    
    # Verify data quality
    assert len(df) > 100  # At least 100 samples
    assert 'soil_moisture' in df.columns
    assert 'needs_watering' in df.columns
    
    # Check label balance
    positive = df['needs_watering'].sum()
    negative = len(df) - positive
    
    print(f"✅ Exported {len(df)} samples")
    print(f"   Positive: {positive}, Negative: {negative}")
    
    # Cleanup
    os.remove('test_training_data.csv')

if __name__ == "__main__":
    test_export_training_data()
```

**Pass Criteria:**
- CSV file created
- All required features present
- Both positive and negative examples
- No missing values

---

### Test 8.2: Model Training

```python
# tests/test_ml_training.py
from src.backend.models.train_model import MLModelTrainer
import os

def test_model_training():
    """Test ML model training process."""
    
    # Need at least 2 weeks of data first
    # This test should only run after data collection
    
    if not os.path.exists('training_data.csv'):
        print("⚠️  No training data available, skipping")
        return
    
    trainer = MLModelTrainer('training_data.csv')
    results = trainer.train()
    
    # Verify training completed
    assert 'train_score' in results
    assert 'test_score' in results
    
    # Verify minimum accuracy
    assert results['test_score'] > 0.70  # At least 70%
    
    print(f"✅ Model trained successfully")
    print(f"   Train accuracy: {results['train_score']:.2%}")
    print(f"   Test accuracy: {results['test_score']:.2%}")

if __name__ == "__main__":
    test_model_training()
```

**Pass Criteria:**
- Training completes without errors
- Test accuracy > 70%
- Model file saved successfully

---

## SECTION 9: PERFORMANCE TESTS

### Test 9.1: API Response Time

```python
# tests/test_performance.py
import requests
import time

def test_api_response_times():
    """Test API endpoints respond quickly."""
    
    endpoints = [
        '/api/status',
        '/api/sensor-data?limit=10',
        '/api/predict'
    ]
    
    for endpoint in endpoints:
        times = []
        for _ in range(10):
            start = time.time()
            requests.get(f'http://localhost:5000{endpoint}')
            elapsed = time.time() - start
            times.append(elapsed)
        
        avg_time = sum(times) / len(times)
        max_time = max(times)
        
        assert avg_time < 0.5  # Average under 500ms
        assert max_time < 2.0  # Max under 2 seconds
        
        print(f"✅ {endpoint}: avg={avg_time*1000:.0f}ms, max={max_time*1000:.0f}ms")

if __name__ == "__main__":
    test_api_response_times()
```

**Pass Criteria:**
- Average response < 500ms
- Maximum response < 2 seconds
- Consistent across multiple requests

---

### Test 9.2: Memory Usage

```bash
# Monitor memory while running
ps aux | grep python

# Should see processes like:
# python app.py          ~50-100 MB
# python esp32_simulator.py   ~30-50 MB

# Total memory usage should be < 300 MB
```

**Pass Criteria:**
- Total Python processes < 300 MB
- No memory leaks (stable over time)
- No excessive growth

---

## SECTION 10: DEPLOYED ML MODEL TESTS

### Test 10.1: Production Predictions

```python
# tests/test_ml_predictor.py
from src.backend.models.ml_predictor import MLPredictor
from datetime import datetime

def test_ml_predictor():
    """Test deployed ML model makes predictions."""
    
    try:
        predictor = MLPredictor()
    except FileNotFoundError:
        print("⚠️  Model not trained yet, skipping")
        return
    
    # Test prediction
    sensor = {
        'soil_moisture': 32,
        'temperature': 27,
        'humidity': 55,
        'timestamp': datetime.now().isoformat()
    }
    weather = {
        'rain_predicted': False
    }
    
    result = predictor.predict(sensor, weather)
    
    assert 'should_water' in result
    assert 'confidence' in result
    assert 0 <= result['confidence'] <= 1
    
    print(f"✅ ML prediction works")
    print(f"   Should water: {result['should_water']}")
    print(f"   Confidence: {result['confidence']:.2%}")

if __name__ == "__main__":
    test_ml_predictor()
```

**Pass Criteria:**
- Model loads successfully
- Predictions return valid format
- Confidence scores between 0-1

---

## TEST SUMMARY CHECKLIST

### Before Submitting Project:

**Environment:**
- [ ] Python 3.9+ installed
- [ ] All packages installed
- [ ] MQTT broker running
- [ ] No installation errors

**Components:**
- [ ] Simulator publishes data
- [ ] Database stores data
- [ ] API responds to all endpoints
- [ ] ML model makes predictions
- [ ] Dashboard displays correctly

**Integration:**
- [ ] Full pipeline works
- [ ] 24-hour test passed
- [ ] Pump control works
- [ ] Auto-control works

**Performance:**
- [ ] API response < 2 seconds
- [ ] Memory usage < 300 MB
- [ ] No crashes in 24 hours
- [ ] Data capture > 95%

**ML Model (if trained):**
- [ ] Training data collected
- [ ] Model trained
- [ ] Accuracy > 70%
- [ ] Model deployed

**Documentation:**
- [ ] All code documented
- [ ] README complete
- [ ] Test results recorded

---

## RUNNING ALL TESTS

```bash
# Run all automated tests
pytest tests/ -v

# Or run individually
python tests/test_simulator.py
python tests/test_database.py
python tests/test_api.py
python tests/test_ml_model.py

# Integration tests (requires all services running)
python tests/integration/test_full_pipeline.py
```

---

## TEST RESULTS LOG

Keep a log of test results:

```
Date: 2025-02-06
Test: 24-Hour Stability
Status: PASS
Notes: 1438 readings collected, 2 minor MQTT reconnections

Date: 2025-02-10
Test: ML Model Training
Status: PASS
Accuracy: 78%
Notes: Good performance on test set

Date: 2025-02-12
Test: A/B Comparison
Status: IN PROGRESS
Notes: ML model running for week 1
```

---

**Complete testing ensures a reliable, production-ready system! 🧪✅**
