# DEVELOPMENT GUIDELINES
## Code Standards and Best Practices for P-WOS

---

## GENERAL PRINCIPLES

### 1. **Keep It Simple**
- Write clear, readable code over clever code
- One function should do one thing
- Avoid premature optimization
- Comment why, not what

### 2. **Test Early, Test Often**
- Test each component before integration
- Write tests as you code, not after
- Manual testing first, then automate
- Fix bugs immediately

### 3. **Document Everything**
- Code comments for complex logic
- Docstrings for all functions
- README for each major module
- Update docs when code changes

### 4. **Version Control Discipline**
- Commit frequently with clear messages
- One feature per commit
- Never commit broken code
- Use branches for experiments

---

## PYTHON CODE STANDARDS

### Naming Conventions

```python
# Classes: PascalCase
class ESP32Simulator:
    pass

class DatabaseManager:
    pass

# Functions and methods: snake_case
def calculate_moisture_decay():
    pass

def get_sensor_reading():
    pass

# Constants: UPPER_SNAKE_CASE
MAX_MOISTURE = 100
MIN_TEMPERATURE = -10
MQTT_BROKER_URL = "localhost"

# Variables: snake_case
soil_moisture = 45.5
current_temperature = 25.0
is_pump_active = False

# Private methods/variables: prefix with underscore
def _internal_helper_function():
    pass

_private_constant = 42
```

### Function Documentation

```python
def predict_watering_need(sensor_data: dict, weather_data: dict) -> dict:
    """
    Predict whether watering is needed based on sensor and weather data.
    
    This function uses a rule-based decision tree to determine if the plant
    needs watering. It considers current moisture levels, temperature, 
    humidity, and upcoming weather forecasts.
    
    Args:
        sensor_data (dict): Current sensor readings
            - soil_moisture (float): Percentage 0-100
            - temperature (float): Celsius
            - humidity (float): Percentage 0-100
            - timestamp (str): ISO format timestamp
        
        weather_data (dict): Weather forecast
            - rain_predicted (bool): Rain in next 6 hours
            - rain_probability (float): Percentage 0-100
            - avg_temp_next_12h (float): Celsius
    
    Returns:
        dict: Prediction result
            - should_water (bool): Whether to water
            - confidence (float): Confidence score 0.0-1.0
            - reasoning (str): Human-readable explanation
            - urgency (str): CRITICAL, HIGH, MEDIUM, LOW, NONE
    
    Examples:
        >>> sensor = {"soil_moisture": 28, "temperature": 26, ...}
        >>> weather = {"rain_predicted": False, "rain_probability": 10}
        >>> result = predict_watering_need(sensor, weather)
        >>> result['should_water']
        True
    
    Raises:
        ValueError: If sensor_data or weather_data is missing required fields
        TypeError: If data types are incorrect
    
    Notes:
        - Decision thresholds are configurable in config.py
        - Function is stateless and has no side effects
        - See ml_model_guide.md for decision logic details
    """
    # Validate inputs
    if not sensor_data or not weather_data:
        raise ValueError("Missing required data")
    
    # Implementation...
    pass
```

### Error Handling

```python
# Always handle exceptions specifically
try:
    reading = get_sensor_reading()
except ConnectionError as e:
    logger.error(f"Sensor connection failed: {e}")
    return None
except TimeoutError as e:
    logger.warning(f"Sensor timeout: {e}")
    return None
except Exception as e:
    logger.critical(f"Unexpected error: {e}")
    raise

# Use context managers for resources
with sqlite3.connect(db_path) as conn:
    cursor = conn.cursor()
    # Do work
# Automatically closes connection

# Fail fast - validate inputs early
def set_moisture_threshold(value: float) -> None:
    if not 0 <= value <= 100:
        raise ValueError(f"Moisture must be 0-100, got {value}")
    
    # Rest of function...
```

### Type Hints

```python
from typing import List, Dict, Optional, Tuple, Union

def process_readings(
    readings: List[Dict[str, float]], 
    min_count: int = 10
) -> Optional[Dict[str, float]]:
    """Process sensor readings and return summary statistics."""
    pass

def get_prediction(
    model: 'MLModel',
    features: List[float]
) -> Tuple[bool, float]:
    """Returns (prediction, confidence)."""
    pass

# Use Optional for values that can be None
def find_reading(timestamp: str) -> Optional[Dict]:
    """Returns reading dict or None if not found."""
    pass
```

### Logging

```python
import logging

# Setup at module level
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data/logs/system.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Usage
logger.debug("Detailed debugging info")        # Development only
logger.info("System started successfully")     # Normal operations
logger.warning("Moisture below 20%")           # Potential issues
logger.error("Failed to connect to MQTT")      # Errors
logger.critical("Database corrupted!")         # System-breaking

# Always include context
logger.info(f"Received reading: moisture={moisture}%, temp={temp}°C")
logger.error(f"MQTT connection failed: {error_message}")
```

---

## FILE ORGANIZATION

### Module Structure

```python
"""
Module: esp32_simulator
Purpose: Simulate ESP32 hardware for testing without physical devices
Author: [Your name]
Created: 2025-01-15
Modified: 2025-02-06

This module provides a virtual ESP32 that generates realistic sensor data
and responds to pump control commands via MQTT.
"""

# Standard library imports
import json
import time
from datetime import datetime
from typing import Dict

# Third-party imports
import paho.mqtt.client as mqtt

# Local imports
from config import MQTT_BROKER, MQTT_PORT

# Constants
DEFAULT_MOISTURE = 50.0
DECAY_RATE = 0.5  # % per hour

# Class definitions
class ESP32Simulator:
    """Virtual ESP32 with realistic sensor physics."""
    pass

# Helper functions
def calculate_temperature_cycle(hour: int) -> float:
    """Calculate temperature based on time of day."""
    pass

# Main execution
if __name__ == "__main__":
    # Module-specific test code
    pass
```

### Configuration Files

```python
# config/settings.py
"""Application configuration settings."""

# MQTT Settings
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_KEEPALIVE = 60

# Sensor Thresholds
CRITICAL_MOISTURE = 25.0
LOW_MOISTURE = 30.0
COMFORTABLE_MOISTURE = 40.0

# Timing
SENSOR_INTERVAL = 60  # seconds
API_REFRESH_RATE = 10  # seconds

# Database
DB_PATH = "data/sensor_data.db"
DB_BACKUP_INTERVAL = 86400  # 24 hours in seconds

# ML Model
MODEL_PATH = "data/trained_model.pkl"
MODEL_CONFIDENCE_THRESHOLD = 0.65
```

```python
# Use in code:
from config.settings import MQTT_BROKER, CRITICAL_MOISTURE
```

### Environment Variables

```bash
# .env file (never commit to Git!)
OPENWEATHER_API_KEY=your_api_key_here
MQTT_USERNAME=admin
MQTT_PASSWORD=secret123
DATABASE_URL=postgresql://user:pass@host:5432/db

# Production only
DEBUG=False
ENVIRONMENT=production
```

```python
# Load in Python
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv('OPENWEATHER_API_KEY')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
```

---

## API DESIGN

### REST Endpoint Standards

```python
# Good endpoint design:
GET  /api/sensor-data?limit=100&device=ESP32_001
POST /api/control/pump
GET  /api/predict
GET  /api/status

# Bad endpoint design:
GET  /api/getSensorData        # Don't use verbs in URL
POST /api/pumpControl          # Inconsistent naming
GET  /api/prediction_endpoint  # Underscores in URL
```

### Response Format

```python
# Success response
{
    "status": "success",
    "data": {
        "soil_moisture": 45.5,
        "temperature": 25.3,
        "timestamp": "2025-02-06T14:30:00"
    },
    "message": "Sensor reading retrieved successfully"
}

# Error response
{
    "status": "error",
    "error": {
        "code": "SENSOR_OFFLINE",
        "message": "Unable to reach sensor device",
        "details": "Connection timeout after 5 seconds"
    },
    "timestamp": "2025-02-06T14:30:00"
}

# Pagination
{
    "status": "success",
    "data": [...],
    "pagination": {
        "page": 1,
        "per_page": 50,
        "total": 1245,
        "pages": 25
    }
}
```

### HTTP Status Codes

```python
# Use appropriate status codes
200 OK                  # Successful GET
201 Created             # Successful POST
204 No Content          # Successful DELETE
400 Bad Request         # Invalid input
401 Unauthorized        # Authentication required
403 Forbidden           # No permission
404 Not Found           # Resource doesn't exist
500 Internal Server     # Server error

# Example usage
@app.route('/api/sensor-data', methods=['GET'])
def get_sensor_data():
    try:
        limit = int(request.args.get('limit', 100))
        if limit < 1 or limit > 1000:
            return jsonify({
                "status": "error",
                "error": "limit must be between 1 and 1000"
            }), 400
        
        data = db.get_recent(limit)
        return jsonify({
            "status": "success",
            "data": data
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        return jsonify({
            "status": "error",
            "error": "Internal server error"
        }), 500
```

---

## DATABASE GUIDELINES

### Query Safety

```python
# GOOD - Parameterized queries (safe from SQL injection)
cursor.execute(
    "SELECT * FROM sensor_readings WHERE device_id = ?",
    (device_id,)
)

# BAD - String formatting (vulnerable to SQL injection!)
cursor.execute(
    f"SELECT * FROM sensor_readings WHERE device_id = '{device_id}'"
)

# GOOD - Multiple parameters
cursor.execute(
    """INSERT INTO sensor_readings 
       (timestamp, moisture, temperature) 
       VALUES (?, ?, ?)""",
    (timestamp, moisture, temp)
)
```

### Connection Management

```python
# GOOD - Use context manager
def get_readings():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sensor_readings LIMIT 10")
        return cursor.fetchall()
    # Connection auto-closes

# BAD - Manual connection management
def get_readings():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sensor_readings LIMIT 10")
    data = cursor.fetchall()
    # Forgot to close connection!
    return data
```

### Indexing

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_device_id ON sensor_readings(device_id);

-- Check query performance
EXPLAIN QUERY PLAN 
SELECT * FROM sensor_readings 
WHERE timestamp > '2025-01-01' 
ORDER BY timestamp DESC;
```

---

## TESTING STANDARDS

### Test Structure

```python
# tests/test_simulator.py
import pytest
from src.simulation.esp32_simulator import ESP32Simulator

class TestESP32Simulator:
    """Test suite for ESP32 simulator."""
    
    @pytest.fixture
    def simulator(self):
        """Create fresh simulator for each test."""
        return ESP32Simulator("localhost", 1883)
    
    def test_initial_moisture_in_range(self, simulator):
        """Initial moisture should be between 0 and 100."""
        assert 0 <= simulator.soil_moisture <= 100
    
    def test_moisture_decays_over_time(self, simulator):
        """Moisture should decrease when pump is off."""
        initial = simulator.soil_moisture
        simulator.simulate_sensors(minutes=60)
        assert simulator.soil_moisture < initial
    
    def test_pump_increases_moisture(self, simulator):
        """Moisture should increase when pump is on."""
        simulator.soil_moisture = 30
        simulator.pump_on = True
        initial = simulator.soil_moisture
        simulator.simulate_sensors(minutes=5)
        assert simulator.soil_moisture > initial
    
    def test_moisture_stays_bounded(self, simulator):
        """Moisture should never go below 0 or above 100."""
        simulator.soil_moisture = 99
        simulator.pump_on = True
        simulator.simulate_sensors(minutes=60)
        assert simulator.soil_moisture <= 100
        
        simulator.soil_moisture = 1
        simulator.pump_on = False
        simulator.simulate_sensors(minutes=60)
        assert simulator.soil_moisture >= 0

# Run tests
# pytest tests/test_simulator.py -v
```

### Test Coverage Goals

- **Unit Tests:** 80%+ code coverage
- **Integration Tests:** All critical paths
- **End-to-End Tests:** Full user workflows

---

## GIT WORKFLOW

### Commit Messages

```bash
# Good commit messages
git commit -m "feat(simulator): add moisture decay simulation"
git commit -m "fix(api): correct MQTT reconnection logic"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(ml): add model accuracy tests"
git commit -m "refactor(database): optimize query performance"

# Bad commit messages
git commit -m "fixed stuff"
git commit -m "updates"
git commit -m "wip"
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructure
- `test`: Adding tests
- `chore`: Maintenance

**Example:**
```
feat(ml): implement Random Forest classifier

- Load training data from CSV
- Train model with cross-validation
- Save model and metadata
- Achieve 78% accuracy on test set

Closes #23
```

### Branch Strategy

```bash
# Main branches
main         # Production-ready code
develop      # Integration branch

# Feature branches
git checkout -b feature/esp32-simulator
git checkout -b feature/ml-training
git checkout -b fix/mqtt-connection

# Merge when complete
git checkout develop
git merge feature/esp32-simulator
git branch -d feature/esp32-simulator
```

---

## SECURITY CONSIDERATIONS

### Never Commit Secrets

```python
# BAD
API_KEY = "sk_live_abc123xyz789"
PASSWORD = "mypassword123"

# GOOD
API_KEY = os.getenv('API_KEY')
PASSWORD = os.getenv('DATABASE_PASSWORD')
```

### Input Validation

```python
# Always validate user input
def set_watering_duration(duration: int) -> None:
    # Validate range
    if not 1 <= duration <= 300:
        raise ValueError("Duration must be 1-300 seconds")
    
    # Validate type
    if not isinstance(duration, int):
        raise TypeError("Duration must be an integer")
    
    # Safe to use
    activate_pump(duration)
```

### MQTT Security

```python
# Use authentication in production
client.username_pw_set(username, password)

# Use TLS encryption
client.tls_set(ca_certs="/path/to/ca.crt")

# Validate message sources
def on_message(client, userdata, msg):
    # Check topic is expected
    if not msg.topic.startswith("pwos/"):
        logger.warning(f"Unexpected topic: {msg.topic}")
        return
    
    # Validate payload
    try:
        data = json.loads(msg.payload)
    except json.JSONDecodeError:
        logger.error("Invalid JSON payload")
        return
```

---

## PERFORMANCE GUIDELINES

### Database Optimization

```python
# Batch inserts for better performance
def insert_batch(readings: List[Dict]) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.executemany(
            """INSERT INTO sensor_readings 
               (timestamp, moisture, temp, humidity)
               VALUES (?, ?, ?, ?)""",
            [(r['timestamp'], r['moisture'], 
              r['temp'], r['humidity']) 
             for r in readings]
        )
        conn.commit()

# Better than 1000 individual inserts!
```

### API Caching

```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=128)
def get_weather_forecast(lat: float, lon: float, date: str) -> Dict:
    """Cache weather forecasts for 1 hour."""
    # Expensive API call
    return fetch_from_api(lat, lon, date)

# Clear cache periodically
# lru_cache doesn't have TTL, so manually clear every hour
```

---

## CODE REVIEW CHECKLIST

Before merging code, verify:

- [ ] Code follows naming conventions
- [ ] All functions have docstrings
- [ ] Error handling is present
- [ ] No hardcoded secrets or passwords
- [ ] Tests are included and passing
- [ ] No commented-out code (use Git instead)
- [ ] Imports are organized
- [ ] Logging is appropriate
- [ ] Performance is acceptable
- [ ] Documentation is updated

---

## ADDITIONAL RESOURCES

### Python Style
- PEP 8: https://pep8.org/
- Google Python Style Guide
- Type hints: PEP 484

### Flask Best Practices
- Flask documentation
- REST API design principles
- Error handling patterns

### Testing
- pytest documentation
- Test-Driven Development (TDD)
- Integration testing strategies

---

**Following these guidelines will ensure high-quality, maintainable code! 🚀**
