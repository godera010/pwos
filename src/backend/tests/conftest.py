import pytest
import sys
import os
import logging

# Add src/backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# --- Test Logging Setup ---
# Direct test logs to logs/test/
_project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
_test_log_dir = os.path.join(_project_root, "logs", "test")
os.makedirs(_test_log_dir, exist_ok=True)

_test_logger = logging.getLogger("pwos_test")
if not _test_logger.handlers:
    _test_logger.setLevel(logging.DEBUG)
    _fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    _fh = logging.FileHandler(os.path.join(_test_log_dir, "test.log"), encoding='utf-8')
    _fh.setFormatter(_fmt)
    _test_logger.addHandler(_fh)

from models.ml_predictor import MLPredictor

@pytest.fixture
def predictor():
    """Returns a fresh MLPredictor instance for each test."""
    # We might need to mock the model loading if no model exists in CI/CD
    # For now, we assume local dev environment has the model
    return MLPredictor()

@pytest.fixture
def mock_sensor_data():
    return {
        'soil_moisture': 45.0,
        'temperature': 25.0,
        'humidity': 60.0,
        'forecast_minutes': 0,
        'wind_speed': 5.0,
        'rain_intensity': 0.0
    }
