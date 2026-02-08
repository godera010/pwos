# TASKS CHECKLIST
## P-WOS Development Tasks

**Legend:**
- [ ] Not started
- [→] In progress
- [x] Complete
- [!] Blocked

---

## PHASE 1: ENVIRONMENT SETUP

### Task 1.1: Install Core Software
- [x] Install Python 3.9+
- [x] Install pip package manager
- [x] Install Mosquitto MQTT broker
- [x] Install Git
- [x] Install code editor (VS Code recommended)

**Completion Criteria:**
- `python --version` shows 3.9+
- `mosquitto --help` works
- `git --version` works

**Dependencies:** None  
**Estimated Time:** 30 minutes  
**Reference:** `instructions.md` Section 1.1-1.2

---

### Task 1.2: Create Project Structure
- [x] Create root directory `pwos-project/`
- [x] Create subdirectories (docs, src, data, tests, scripts, config)
- [x] Initialize Git repository
- [x] Create .gitignore file

**Completion Criteria:**
- Directory structure matches `project_structure.md`
- Git initialized successfully
- .gitignore present

**Dependencies:** Task 1.1  
**Estimated Time:** 15 minutes  
**Reference:** `instructions.md` Section 1.3, `project_structure.md`

---

### Task 1.3: Install Python Dependencies
- [x] Create `requirements.txt`
- [x] Install paho-mqtt
- [x] Install flask and flask-cors
- [x] Install pandas and numpy
- [x] Install scikit-learn
- [x] Install joblib
- [x] Verify all installations

**Completion Criteria:**
- `pip list` shows all required packages
- No installation errors
- `requirements.txt` in project root

**Dependencies:** Task 1.1  
**Estimated Time:** 15 minutes  
**Reference:** `instructions.md` Section 1.4

---

### Task 1.4: Test MQTT Broker
- [x] Start Mosquitto service
- [x] Test subscribe in one terminal
- [x] Test publish in another terminal
- [x] Verify message received

**Completion Criteria:**
- MQTT broker running
- Pub/sub test successful
- No connection errors

**Dependencies:** Task 1.1  
**Estimated Time:** 10 minutes  
**Reference:** `instructions.md` Section 1.2

---

## PHASE 2: SIMULATOR DEVELOPMENT

### Task 2.1: Create ESP32 Simulator Base
- [x] Create `src/simulation/esp32_simulator.py`
- [x] Implement `ESP32Simulator` class
- [x] Add MQTT client initialization
- [x] Add basic connection logic

**Completion Criteria:**
- File created
- Class instantiates without errors
- Connects to MQTT broker successfully

**Dependencies:** Task 1.3, Task 1.4  
**Estimated Time:** 30 minutes  
**Reference:** `instructions.md` Section 2.1, `simulation_guide.md` Part 1

---

### Task 2.2: Implement Sensor Physics
- [ ] Add moisture decay simulation
- [ ] Add temperature daily cycle
- [ ] Add humidity calculations
- [ ] Add realistic noise/variations

**Completion Criteria:**
- Moisture decreases over time
- Temperature follows daily pattern
- Values stay within realistic bounds

**Dependencies:** Task 2.1  
**Estimated Time:** 45 minutes  
**Reference:** `simulation_guide.md` Part 1

---

### Task 2.3: Implement Pump Control
- [ ] Subscribe to pump control topic
- [ ] Handle ON/OFF commands
- [ ] Simulate moisture increase when pumping
- [ ] Add duration-based auto-shutoff

**Completion Criteria:**
- Receives MQTT commands
- Moisture increases when pump active
- Auto-shutoff works correctly

**Dependencies:** Task 2.2  
**Estimated Time:** 30 minutes  
**Reference:** `simulation_guide.md` Part 1

---

### Task 2.4: Implement Data Publishing
- [x] Format sensor data as JSON
- [x] Publish to MQTT every 60 seconds
- [x] Add timestamp to each reading
- [x] Include device ID

**Completion Criteria:**
- Data publishes every 60s
- JSON format is valid
- All fields present

**Dependencies:** Task 2.2  
**Estimated Time:** 20 minutes  
**Reference:** `simulation_guide.md` Part 1

---

### Task 2.5: Test Simulator End-to-End
- [ ] Run simulator for 10 minutes
- [ ] Monitor MQTT traffic with mosquitto_sub
- [ ] Verify data format
- [ ] Test pump control

**Completion Criteria:**
- 10+ readings published
- No errors or crashes
- Data format correct

**Dependencies:** Task 2.4  
**Estimated Time:** 30 minutes  
**Reference:** `tests.md` Section 2

---

## PHASE 3: DATABASE LAYER

### Task 3.1: Create Database Module
- [x] Create `src/backend/database.py`
- [x] Implement `Database` class
- [x] Add database initialization
- [x] Create schema for sensor_readings table
- [x] Create schema for watering_events table
- [x] Create schema for predictions table

**Completion Criteria:**
- File created
- All tables created successfully
- Database file in `data/` directory

**Dependencies:** Task 1.3  
**Estimated Time:** 30 minutes  
**Reference:** `instructions.md` Section 3.1, `simulation_guide.md` Part 2

---

### Task 3.2: Implement CRUD Operations
- [ ] Add `add_reading()` method
- [ ] Add `get_recent()` method
- [ ] Add `log_watering()` method
- [ ] Add error handling

**Completion Criteria:**
- Can insert data
- Can retrieve data
- No SQL injection vulnerabilities

**Dependencies:** Task 3.1  
**Estimated Time:** 45 minutes  
**Reference:** `simulation_guide.md` Part 2

---

### Task 3.3: Test Database Operations
- [ ] Test insert sample data
- [ ] Test retrieve data
- [ ] Test with large dataset (1000+ rows)
- [ ] Verify data integrity

**Completion Criteria:**
- All CRUD operations work
- No data corruption
- Performance acceptable

**Dependencies:** Task 3.2  
**Estimated Time:** 30 minutes  
**Reference:** `tests.md` Section 3

---

## PHASE 4: BACKEND API

### Task 4.1: Create MQTT Subscriber
- [x] Create `src/backend/mqtt_subscriber.py`
- [x] Implement subscriber class
- [x] Connect to MQTT broker
- [x] Subscribe to sensor data topic
- [x] Store received data in database

**Completion Criteria:**
- Connects to MQTT successfully
- Receives sensor data
- Stores in database automatically

**Dependencies:** Task 3.3  
**Estimated Time:** 45 minutes  
**Reference:** `instructions.md` Section 4.1, `simulation_guide.md` Part 2

---

### Task 4.2: Create Flask API Server
- [x] Create `src/backend/app.py`
- [x] Initialize Flask application
- [x] Add CORS support
- [x] Start MQTT subscriber in background
- [x] Create basic route (`/api/status`)

**Completion Criteria:**
- Server starts without errors
- `/api/status` returns response
- CORS headers present

**Dependencies:** Task 4.1  
**Estimated Time:** 30 minutes  
**Reference:** `instructions.md` Section 4.3, `simulation_guide.md` Part 2

---

### Task 4.3: Implement API Endpoints
- [ ] `GET /api/status` - System status
- [ ] `GET /api/sensor-data` - Historical data
- [ ] `GET /api/predict` - ML prediction
- [ ] `POST /api/control/pump` - Manual control
- [ ] `POST /api/auto-control` - Automated control

**Completion Criteria:**
- All endpoints respond correctly
- Proper HTTP status codes
- Error handling in place

**Dependencies:** Task 4.2  
**Estimated Time:** 1.5 hours  
**Reference:** `simulation_guide.md` Part 2

---

### Task 4.4: Test API with Curl
- [ ] Test each endpoint with curl
- [ ] Verify JSON responses
- [ ] Test error conditions
- [ ] Check response times

**Completion Criteria:**
- All endpoints accessible
- Responses under 2 seconds
- No unhandled exceptions

**Dependencies:** Task 4.3  
**Estimated Time:** 30 minutes  
**Reference:** `tests.md` Section 4

---

## PHASE 5: ML MODEL (RULE-BASED)

### Task 5.1: Create Rule-Based Model
- [ ] Create `src/backend/models/ml_model_v1.py`
- [ ] Implement `RuleBasedPredictor` class
- [ ] Add decision tree logic
- [ ] Add confidence scoring

**Completion Criteria:**
- Class instantiates
- Returns predictions
- Confidence scores between 0-1

**Dependencies:** Task 1.3  
**Estimated Time:** 1 hour  
**Reference:** `ml_model_guide.md` Phase 1

---

### Task 5.2: Create Weather Simulator
- [x] Create `src/simulation/weather_simulator.py`
- [x] Implement `WeatherSimulator` class
- [x] Add realistic rain patterns (storms, drizzle)
- [x] Add temperature/humidity forecasts
- [x] Publish weather data to MQTT (`pwos/weather/current`)

**Completion Criteria:**
- Simulator publishes realistic weather data
- Weather patterns vary over time
- Data is accessible via MQTT

**Dependencies:** None  
**Estimated Time:** 45 minutes  
**Reference:** `simulation_guide.md` Part 2

---

### Task 5.3: Integrate Weather with Hardware
- [x] Subscribe `esp32_simulator.py` to weather topic
- [x] Modify sensor physics to react to rain (moisture increase)
- [x] Modify evaporation rate based on humidity/temp
- [x] Simulate "cooling effect" of rain

**Completion Criteria:**
- Soil moisture increases when it "rains"
- Temperature drops during rain
- Evaporation slows down when humid


---

### Task 5.4: Integrate ML Model with API
- [ ] Import ML model in app.py
- [ ] Update `/api/predict` endpoint
- [ ] Add weather data to predictions
- [ ] Return confidence scores

**Completion Criteria:**
- Predictions work end-to-end
- Weather data included
- Reasoning provided

**Dependencies:** Task 5.1, Task 5.2, Task 5.3, Task 4.3  
**Estimated Time:** 45 minutes  
**Reference:** `simulation_guide.md` Part 2

---

### Task 5.4: Test ML Decision Logic
- [ ] Test critical moisture scenario
- [ ] Test low moisture + rain scenario
- [ ] Test preventive watering scenario
- [ ] Verify reasoning strings

**Completion Criteria:**
- All scenarios produce expected decisions
- Confidence scores make sense
- No logic errors

**Dependencies:** Task 5.3  
**Estimated Time:** 45 minutes  
**Reference:** `tests.md` Section 5

---

## PHASE 6: WEB DASHBOARD

### Task 6.1: Create HTML Structure
- [x] Create `src/frontend/dashboard.html`
- [x] Add HTML structure
- [x] Create layout sections
- [x] Add Chart.js library

**Completion Criteria:**
- HTML valid
- Page loads in browser
- Layout displays correctly

**Dependencies:** None  
**Estimated Time:** 30 minutes  
**Reference:** `instructions.md` Section 5.1

---

### Task 6.2: Style Dashboard
- [ ] Add CSS styling
- [ ] Create card components
- [ ] Add gradient background
- [ ] Make responsive

**Completion Criteria:**
- Visually appealing
- Works on mobile
- Consistent spacing

**Dependencies:** Task 6.1  
**Estimated Time:** 45 minutes  
**Reference:** `simulation_guide.md` Part 4

---

### Task 6.3: Implement Data Fetching
- [ ] Add API fetch functions
- [ ] Fetch current status
- [ ] Fetch historical data
- [ ] Fetch predictions
- [ ] Handle fetch errors

**Completion Criteria:**
- Data fetches successfully
- Updates every 10-30 seconds
- Errors displayed to user

**Dependencies:** Task 6.2, Task 4.4  
**Estimated Time:** 1 hour  
**Reference:** `simulation_guide.md` Part 4

---

### Task 6.4: Create Charts
- [ ] Initialize Chart.js
- [ ] Create moisture chart
- [ ] Create temperature chart
- [ ] Create humidity chart
- [ ] Auto-update charts

**Completion Criteria:**
- Charts display correctly
- Multiple datasets visible
- Updates automatically

**Dependencies:** Task 6.3  
**Estimated Time:** 45 minutes  
**Reference:** `simulation_guide.md` Part 4

---

### Task 6.5: Add Control Buttons
- [ ] "Water Now" button
- [ ] "Stop Pump" button
- [ ] "Run Auto-Control" button
- [ ] Display feedback messages

**Completion Criteria:**
- Buttons trigger API calls
- Feedback shown to user
- Actions confirmed

**Dependencies:** Task 6.3  
**Estimated Time:** 30 minutes  
**Reference:** `simulation_guide.md` Part 4

---

### Task 6.6: Test Dashboard
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on mobile
- [ ] Test all buttons
- [ ] Verify charts update

**Completion Criteria:**
- Works on all browsers
- All features functional
- No console errors

**Dependencies:** Task 6.5  
**Estimated Time:** 30 minutes  
**Reference:** `tests.md` Section 6

---

## PHASE 7: INTEGRATION & TESTING

### Task 7.1: Create Startup Script
- [ ] Create `scripts/start_all.sh`
- [ ] Start MQTT broker
- [ ] Start API server
- [ ] Start simulator
- [ ] Start web server

**Completion Criteria:**
- Single command starts everything
- Services start in correct order
- No startup errors

**Dependencies:** All Phase 2-6 tasks  
**Estimated Time:** 30 minutes  
**Reference:** `instructions.md` Section 7.1

---

### Task 7.2: Run 1-Hour Test
- [ ] Start all services
- [ ] Monitor for errors
- [ ] Check data flow
- [ ] Verify dashboard updates

**Completion Criteria:**
- System runs 1 hour without crash
- 60+ sensor readings logged
- Dashboard shows live data

**Dependencies:** Task 7.1  
**Estimated Time:** 1 hour  
**Reference:** `tests.md` Section 7

---

### Task 7.3: Run 24-Hour Test
- [ ] Start system
- [ ] Let run overnight
- [ ] Check logs in morning
- [ ] Verify data completeness

**Completion Criteria:**
- 1440+ readings in database
- No crashes or restarts
- Data capture >95%

**Dependencies:** Task 7.2  
**Estimated Time:** 24 hours (passive)  
**Reference:** `tests.md` Section 7

---

### Task 7.4: Test Manual Control
- [ ] Click "Water Now"
- [ ] Verify moisture increases
- [ ] Check pump duration
- [ ] Log watering event

**Completion Criteria:**
- Pump activates on command
- Moisture rises appropriately
- Event logged in database

**Dependencies:** Task 7.1  
**Estimated Time:** 15 minutes  
**Reference:** `tests.md` Section 7

---

### Task 7.5: Test Auto-Control
- [ ] Let moisture drop to 30%
- [ ] Click "Run Auto-Control"
- [ ] Verify ML decision
- [ ] Check if pump activates

**Completion Criteria:**
- Auto-control makes decision
- Decision matches expectation
- Action logged

**Dependencies:** Task 7.1  
**Estimated Time:** 30 minutes  
**Reference:** `tests.md` Section 7

---

## PHASE 8: DATA COLLECTION

### Task 8.1: Run System for 1 Week
- [ ] Start system
- [ ] Monitor daily
- [ ] Export data backups
- [ ] Document any issues

**Completion Criteria:**
- 7+ days of continuous operation
- 10,000+ sensor readings
- No major outages

**Dependencies:** Task 7.3  
**Estimated Time:** 1 week (passive)  
**Reference:** `ml_model_guide.md` Phase 2

---

### Task 8.2: Run System for 2-4 Weeks
- [ ] Continue operation
- [ ] Weekly data exports
- [ ] Monitor plant health (if physical)
- [ ] Log manual interventions

**Completion Criteria:**
- 2-4 weeks continuous data
- 20,000-40,000 readings
- Diverse conditions captured

**Dependencies:** Task 8.1  
**Estimated Time:** 2-4 weeks (passive)  
**Reference:** `ml_model_guide.md` Phase 2

---

## PHASE 9: ML MODEL TRAINING

### Task 9.1: Create Data Collector
- [ ] Create `src/backend/models/data_collector.py`
- [ ] Extract sensor readings
- [ ] Extract watering events
- [ ] Create labels (needs_watering)
- [ ] Add time features

**Completion Criteria:**
- CSV generated successfully
- Labels created correctly
- Features engineered

**Dependencies:** Task 8.2  
**Estimated Time:** 1.5 hours  
**Reference:** `ml_model_guide.md` Phase 2

---

### Task 9.2: Export Training Data
- [ ] Run data collector
- [ ] Generate `training_data.csv`
- [ ] Verify data quality
- [ ] Check class balance

**Completion Criteria:**
- CSV file created
- At least 1000 samples
- Positive and negative examples present

**Dependencies:** Task 9.1  
**Estimated Time:** 15 minutes  
**Reference:** `ml_model_guide.md` Phase 2

---

### Task 9.3: Create Training Script
- [ ] Create `src/backend/models/train_model.py`
- [ ] Implement data loading
- [ ] Split train/test sets
- [ ] Train Random Forest
- [ ] Evaluate performance

**Completion Criteria:**
- Script runs without errors
- Model trains successfully
- Metrics calculated

**Dependencies:** Task 9.2  
**Estimated Time:** 2 hours  
**Reference:** `ml_model_guide.md` Phase 3

---

### Task 9.4: Train and Evaluate Model
- [ ] Run training script
- [ ] Review accuracy metrics
- [ ] Check feature importance
- [ ] Analyze confusion matrix

**Completion Criteria:**
- Accuracy >70%
- Precision >65%
- Recall >80%
- Model saved as .pkl

**Dependencies:** Task 9.3  
**Estimated Time:** 30 minutes  
**Reference:** `ml_model_guide.md` Phase 3

---

### Task 9.5: Tune Hyperparameters (Optional)
- [ ] Adjust n_estimators
- [ ] Adjust max_depth
- [ ] Try different features
- [ ] Re-evaluate

**Completion Criteria:**
- Accuracy improved
- No overfitting
- Model stable

**Dependencies:** Task 9.4  
**Estimated Time:** 1-2 hours  
**Reference:** `ml_model_guide.md` Phase 3

---

## PHASE 10: ML MODEL DEPLOYMENT

### Task 10.1: Create ML Predictor
- [ ] Create `src/backend/models/ml_predictor.py`
- [ ] Implement model loading
- [ ] Add prediction method
- [ ] Add feature preparation

**Completion Criteria:**
- Loads saved model
- Makes predictions
- Returns correct format

**Dependencies:** Task 9.4  
**Estimated Time:** 1 hour  
**Reference:** `ml_model_guide.md` Phase 4

---

### Task 10.2: Update API to Use ML Model
- [ ] Import MLPredictor in app.py
- [ ] Replace rule-based with ML
- [ ] Update prediction endpoint
- [ ] Add fallback to rules if model fails

**Completion Criteria:**
- API uses ML predictions
- Graceful fallback if errors
- Response format unchanged

**Dependencies:** Task 10.1  
**Estimated Time:** 30 minutes  
**Reference:** `ml_model_guide.md` Phase 4

---

### Task 10.3: Test ML Predictions
- [ ] Test with low moisture
- [ ] Test with high moisture
- [ ] Test edge cases
- [ ] Compare to rule-based

**Completion Criteria:**
- Predictions make sense
- Confidence scores reasonable
- Better than rules

**Dependencies:** Task 10.2  
**Estimated Time:** 45 minutes  
**Reference:** `tests.md` Section 10

---

### Task 10.4: Run A/B Comparison
- [ ] Week 1-2: ML model
- [ ] Week 3-4: Rule-based
- [ ] Log water usage for both
- [ ] Compare efficiency

**Completion Criteria:**
- Both systems tested equally
- Water usage tracked
- Results documented

**Dependencies:** Task 10.3  
**Estimated Time:** 4 weeks (passive)  
**Reference:** `ml_model_guide.md` - Improving the Model

---

## PHASE 11: DOCUMENTATION

### Task 11.1: Write README
- [x] Project description
- [x] Installation instructions
- [x] Usage guide
- [x] Screenshots

**Completion Criteria:**
- Clear and comprehensive
- Anyone can follow it
- Includes examples

**Dependencies:** None  
**Estimated Time:** 1 hour

---

### Task 11.2: Document Code
- [x] Add docstrings to all functions
- [x] Add inline comments
- [x] Create module-level docs
- [x] Generate API documentation

**Completion Criteria:**
- All public functions documented
- Code is self-explanatory
- Documentation generated

**Dependencies:** All code complete  
**Estimated Time:** 2 hours

---

### Task 11.3: Create Final Report
- [x] Project overview
- [x] System architecture
- [x] Results and findings
- [x] Water savings analysis
- [ ] Conclusions

**Completion Criteria:**
- Complete technical report
- Data visualizations included
- Professional formatting

**Dependencies:** Task 10.4  
**Estimated Time:** 4-6 hours

---

### Task 11.4: Create Presentation
- [ ] Title slide
- [ ] Problem statement
- [ ] Solution architecture
- [ ] Demo screenshots
- [ ] Results
- [ ] Future work

**Completion Criteria:**
- 10-15 slides
- Visually appealing
- Ready to present

**Dependencies:** Task 11.3  
**Estimated Time:** 2-3 hours

---

## SUMMARY CHECKLIST

### Must Complete:
- [ ] All Phase 1 tasks (Setup)
- [ ] All Phase 2 tasks (Simulator)
- [ ] All Phase 3 tasks (Database)
- [ ] All Phase 4 tasks (API)
- [ ] All Phase 5 tasks (Rule-based ML)
- [ ] All Phase 6 tasks (Dashboard)
- [ ] All Phase 7 tasks (Integration)
- [ ] Task 8.1 (1 week data collection minimum)
- [ ] All Phase 11 tasks (Documentation)

### Should Complete:
- [ ] Task 8.2 (2-4 weeks data collection)
- [ ] All Phase 9 tasks (ML Training)
- [ ] All Phase 10 tasks (ML Deployment)

### Optional (Bonus):
- [ ] Task 9.5 (Hyperparameter tuning)
- [ ] Task 10.4 (A/B comparison)
- [ ] Additional features in dashboard
- [ ] Mobile app interface

---

## PROGRESS TRACKING

**Total Tasks:** 75  
**Completed:** 0  
**In Progress:** 0  
**Blocked:** 0  

**Estimated Total Time:** 60-80 hours of active work  
**Estimated Calendar Time:** 8-12 weeks

---

## NOTES

- Mark tasks as [x] when complete
- Mark as [→] when actively working
- Mark as [!] if blocked
- Update progress tracking weekly
- Commit to Git after each completed task

---

**Start with Phase 1 and work systematically through each phase!**
