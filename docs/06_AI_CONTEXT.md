# MASTER PROMPT FOR AI AGENTS
## P-WOS (Predictive Water Optimization System) Development Guide

---

## AGENT IDENTITY

You are an AI development agent working on the P-WOS project - a machine learning-powered smart irrigation system for precision agriculture. Your role is to help build, test, and deploy this complete IoT + ML application.

---

## PROJECT OVERVIEW

**Name:** Predictive Water Optimization System (P-WOS)  
**Goal:** Reduce agricultural water consumption by 15%+ using ML predictions  
**Type:** IoT + Machine Learning + Full-Stack Web Application  
**Status:** Development Phase (Hardware simulation)

**Core Innovation:**
Instead of reactive watering (moisture < 30% → water), we use ML to predict future needs and water proactively, considering weather, temperature, humidity, and historical patterns.

---

## YOUR MISSION

Build a complete working system with these components:
1. **Simulator** - Virtual ESP32 generating realistic sensor data
2. **MQTT Broker** - Message routing between components
3. **Backend API** - Flask server with ML predictions
4. **Database** - SQLite for data storage
5. **ML Model** - Random Forest for irrigation decisions
6. **Frontend** - Web dashboard with real-time charts
7. **Testing Suite** - Automated tests for all components

---

## REFERENCE DOCUMENTS

You have access to these comprehensive guides (read them in order):

### 1. **tech_stack_summary.md** (READ FIRST)
- Complete technology overview
- Architecture diagram
- 7 system layers explained
- Tech stack rationale

### 2. **technical_analysis.md**
- Detailed component breakdown
- What to build for each part
- Code examples and structures
- 10-week development timeline

### 3. **simulation_guide.md**
- How to build without hardware
- Complete simulator code
- MQTT broker setup
- API implementation
- Dashboard creation

### 4. **ml_model_guide.md**
- Rule-based model (Phase 1)
- Data collection strategy
- ML training process (Phase 3)
- Model deployment

### 5. **hardware_shopping_list.md**
- Physical components (future reference)
- $60-80 budget
- Assembly instructions

### 6. **project_structure.md**
- File organization
- Directory structure
- Naming conventions

### 7. **instructions.md**
- Step-by-step build guide
- What to do in what order

### 8. **tasks.md**
- Specific tasks with checkboxes
- Dependencies between tasks
- Completion criteria

### 9. **guidelines.md**
- Code standards
- Best practices
- Quality requirements

### 10. **tests.md**
- What to test
- How to test
- Success criteria

---

## DEVELOPMENT PHASES

### Phase 1: Environment Setup (Week 1)
**Goal:** Get basic simulation running

Tasks:
- [ ] Install Python 3.9+
- [ ] Install Mosquitto MQTT broker
- [ ] Install required libraries
- [ ] Test MQTT connectivity
- [ ] Run hello world examples

**Reference:** `instructions.md` Section 1, `simulation_guide.md` Part 1

---

### Phase 2: ESP32 Simulator (Week 1-2)
**Goal:** Virtual hardware generating data

Tasks:
- [ ] Create `esp32_simulator.py`
- [ ] Implement sensor physics (moisture decay, temp cycles)
- [ ] Connect to MQTT broker
- [ ] Publish sensor data every 60 seconds
- [ ] Subscribe to pump control commands
- [ ] Test data generation

**Code Location:** `src/simulation/esp32_simulator.py`  
**Reference:** `simulation_guide.md` Part 1, `technical_analysis.md` Section 1

**Key Features:**
- Realistic moisture decay (0.5% per hour)
- Daily temperature cycle
- Pump refill simulation
- MQTT pub/sub

---

### Phase 3: Database Layer (Week 2)
**Goal:** Store all sensor data

Tasks:
- [ ] Create `database.py`
- [ ] Define schema (sensor_readings, watering_events, predictions)
- [ ] Implement CRUD operations
- [ ] Add data retrieval methods
- [ ] Test with sample data

**Code Location:** `src/backend/database.py`  
**Reference:** `simulation_guide.md` Part 2, `technical_analysis.md` Section 3

**Tables:**
```sql
sensor_readings (id, timestamp, soil_moisture, temperature, humidity, device_id)
watering_events (id, timestamp, duration, trigger_type, moisture_before)
predictions (id, timestamp, should_water, confidence, features)
```

---

### Phase 4: Backend API (Week 2-3)
**Goal:** REST API for system control

Tasks:
- [ ] Create Flask app (`app.py`)
- [ ] Implement MQTT subscriber
- [ ] Create API endpoints
- [ ] Integrate database
- [ ] Add CORS support
- [ ] Test with curl/Postman

**Code Location:** `src/backend/app.py`  
**Reference:** `simulation_guide.md` Part 2, `technical_analysis.md` Section 2

**Endpoints:**
```
GET  /api/status          - Current system state
GET  /api/sensor-data     - Historical readings
GET  /api/predict         - ML prediction
POST /api/control/pump    - Manual pump control
POST /api/auto-control    - Automated decision
```

---

### Phase 5: Rule-Based ML Model (Week 3)
**Goal:** Smart decision logic

Tasks:
- [ ] Create `ml_model_v1.py`
- [ ] Implement decision tree logic
- [ ] Add weather simulation
- [ ] Test different scenarios
- [ ] Integrate with API

**Code Location:** `src/backend/models/ml_model_v1.py`  
**Reference:** `ml_model_guide.md` Phase 1

**Decision Rules:**
1. Moisture < 25% → WATER (critical)
2. Moisture < 30% + No rain → WATER
3. Moisture < 30% + Rain coming → WAIT
4. Moisture < 40% + High temp → WATER (preventive)
5. Else → NO ACTION

---

### Phase 6: Web Dashboard (Week 3-4)
**Goal:** User interface

Tasks:
- [ ] Create `dashboard.html`
- [ ] Add Chart.js for graphs
- [ ] Display real-time sensor data
- [ ] Show ML predictions
- [ ] Add manual controls
- [ ] Style with CSS

**Code Location:** `src/frontend/dashboard.html`  
**Reference:** `simulation_guide.md` Part 4

**Features:**
- Current moisture/temp/humidity
- Historical line charts
- ML prediction box with confidence
- "Water Now" button
- "Run Auto-Control" button
- System status indicator

---

### Phase 7: Integration & Testing (Week 4-5)
**Goal:** Everything working together

Tasks:
- [ ] Run full system (4 terminals)
- [ ] Verify data flow: Simulator → MQTT → API → DB → Dashboard
- [ ] Test manual pump control
- [ ] Test auto-control
- [ ] Fix bugs
- [ ] Write automated tests

**Reference:** `tests.md`, `simulation_guide.md` Part 5

**Test Scenarios:**
1. 24-hour continuous operation
2. Moisture drops to critical level
3. Manual watering
4. Auto-control decision
5. MQTT disconnection/reconnection

---

### Phase 8: Data Collection (Week 5-8)
**Goal:** Gather training data

Tasks:
- [ ] Run system 24/7
- [ ] Log all sensor readings
- [ ] Log all watering events
- [ ] Monitor plant health (if physical setup)
- [ ] Export data weekly

**Reference:** `ml_model_guide.md` Phase 2

**Target:** 
- 2-4 weeks of data
- 2000-4000 sensor readings
- 100-200 watering events

---

### Phase 9: ML Model Training (Week 8-9)
**Goal:** Train actual ML model

Tasks:
- [ ] Create `data_collector.py`
- [ ] Export training data to CSV
- [ ] Create `train_model.py`
- [ ] Train Random Forest classifier
- [ ] Evaluate model (accuracy, precision, recall)
- [ ] Save model as `.pkl`

**Code Location:** `src/backend/models/train_model.py`  
**Reference:** `ml_model_guide.md` Phase 3

**Features:**
- soil_moisture
- temperature
- humidity
- hour_of_day
- day_of_week
- moisture_change_rate

**Target:** >75% accuracy

---

### Phase 10: ML Model Deployment (Week 9-10)
**Goal:** Use real ML predictions

Tasks:
- [ ] Create `ml_predictor.py`
- [ ] Load trained model
- [ ] Update API to use ML model
- [ ] Test predictions
- [ ] Compare to rule-based
- [ ] Monitor performance

**Code Location:** `src/backend/models/ml_predictor.py`  
**Reference:** `ml_model_guide.md` Phase 4

---

### Phase 11: Documentation & Presentation (Week 10-12)
**Goal:** Final deliverables

Tasks:
- [ ] Write final report
- [ ] Create presentation slides
- [ ] Record demo video
- [ ] Document water savings
- [ ] Prepare code repository
- [ ] Write README

---

## CODE STANDARDS

### Python Style:
```python
# Use type hints
def predict(sensor_data: dict, weather_data: dict) -> dict:
    pass

# Docstrings for all functions
def calculate_confidence(moisture: float) -> float:
    """
    Calculate prediction confidence based on moisture level.
    
    Args:
        moisture: Soil moisture percentage (0-100)
    
    Returns:
        Confidence score (0.0-1.0)
    """
    pass

# Clear variable names
soil_moisture_percentage = 45.5  # Good
x = 45.5  # Bad

# Error handling
try:
    data = fetch_sensor_data()
except ConnectionError as e:
    logger.error(f"Connection failed: {e}")
    return None
```

### File Organization:
```python
# Standard import order:
# 1. Standard library
import json
import time
from datetime import datetime

# 2. Third-party
import paho.mqtt.client as mqtt
from flask import Flask, jsonify

# 3. Local
from database import Database
from ml_model import MLModel
```

### Logging:
```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("System started")
logger.warning("Moisture below threshold")
logger.error("Failed to connect to MQTT")
```

---

## TESTING REQUIREMENTS

### Unit Tests:
```python
# Test each function
def test_moisture_decay():
    simulator = ESP32Simulator()
    initial = simulator.soil_moisture
    simulator.simulate_sensors(minutes_passed=60)
    assert simulator.soil_moisture < initial

def test_database_insert():
    db = Database(":memory:")
    data = {"timestamp": "2025-01-15T10:00:00", ...}
    db.add_reading(data)
    readings = db.get_recent(1)
    assert len(readings) == 1
```

### Integration Tests:
```python
# Test component interaction
def test_mqtt_to_database_flow():
    # Start MQTT subscriber
    # Publish test message
    # Verify data in database
    pass
```

---

## COMMON ISSUES & SOLUTIONS

### Issue: MQTT won't connect
**Solution:**
```bash
# Check Mosquitto is running
ps aux | grep mosquitto

# Restart Mosquitto
brew services restart mosquitto  # macOS
sudo systemctl restart mosquitto  # Linux
```

### Issue: API can't find module
**Solution:**
```bash
# Ensure correct directory
cd pwos-project/src/backend

# Check Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Or use relative imports
from .database import Database
```

### Issue: Dashboard not updating
**Solution:**
```javascript
// Check browser console for errors
// Verify API is running
fetch('http://localhost:5000/api/status')
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error(e))
```

---

## WORKFLOW FOR EACH TASK

1. **Read** relevant documentation
2. **Plan** implementation approach
3. **Code** the feature
4. **Test** manually first
5. **Write** automated test
6. **Document** what you built
7. **Commit** to Git
8. **Move** to next task

---

## SUCCESS CRITERIA

Your work is complete when:

✅ All tasks in `tasks.md` are checked off  
✅ System runs continuously for 24+ hours  
✅ Data collection rate >95%  
✅ ML model accuracy >75%  
✅ API response time <2 seconds  
✅ All tests pass  
✅ Documentation is complete  
✅ Code is on GitHub  

---

## COMMUNICATION PROTOCOL

When reporting progress:
```
Task: [Task name from tasks.md]
Status: [In Progress / Complete / Blocked]
Progress: [X%]
Issues: [Any problems encountered]
Next: [What you'll work on next]
```

Example:
```
Task: ESP32 Simulator
Status: Complete
Progress: 100%
Issues: None
Next: Database Layer
```

---

## ASKING FOR HELP

If stuck, provide:
1. What you're trying to do
2. What you've tried
3. Error messages (full text)
4. Relevant code snippet
5. Which documentation you've read

---

## PRIORITY ORDER

1. **Working simulation** (prove concept)
2. **Data collection** (need data for ML)
3. **ML model** (core innovation)
4. **Testing** (ensure reliability)
5. **Documentation** (make it reproducible)
6. **Polish** (UI improvements)

---

## FINAL NOTES

- **Start small, iterate often**
- **Test continuously, not at the end**
- **Document as you go**
- **Ask questions early**
- **Celebrate small wins**

This project is your capstone - make it something you're proud of! 🚀

---

## QUICK REFERENCE

**Start development:**
```bash
cd pwos-project
cat docs/instructions.md  # Read build steps
cat docs/tasks.md         # See what to do
```

**Run system:**
```bash
# Terminal 1
mosquitto

# Terminal 2
cd src/backend && python app.py

# Terminal 3
cd src/simulation && python esp32_simulator.py

# Terminal 4
open src/frontend/dashboard.html
```

**Check progress:**
```bash
cat docs/tasks.md | grep "\[x\]"  # Completed tasks
cat docs/tasks.md | grep "\[ \]"  # Remaining tasks
```

---

**Now go build something amazing! Follow instructions.md for your first steps.**
