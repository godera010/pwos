import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock

def test_health_check(client):
    """Test health check endpoint"""
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'online'
    assert 'database' in data

def test_get_latest_data_empty(client):
    """Test getting latest data when empty"""
    response = client.get('/api/sensor-data/latest')
    assert response.status_code == 404

def test_get_latest_data_populated(client, db):
    """Test getting latest data with content"""
    # Insert data via DB directly
    db.insert_sensor_reading({
        'timestamp': datetime.now().isoformat(),
        'soil_moisture': 55.0,
        'temperature': 22.0,
        'humidity': 60.0,
        'device_id': 'TEST_DEV'
    })
    
    response = client.get('/api/sensor-data/latest')
    assert response.status_code == 200
    data = response.get_json()
    assert data['soil_moisture'] == 55.0
    assert data['device_id'] == 'TEST_DEV'

@patch('src.backend.app.mqtt_client')
def test_pump_control(mock_mqtt, client, db):
    """Test pump control endpoint"""
    # Insert initial reading so moisture_before is recorded
    db.insert_sensor_reading({
        'timestamp': datetime.now().isoformat(),
        'soil_moisture': 25.0,
        'temperature': 25.0,
        'humidity': 50.0,
        'device_id': 'TEST'
    })
    
    # Mock publish return
    mock_mqtt.publish.return_value.rc = 0
    
    payload = {'action': 'ON', 'duration': 15}
    response = client.post('/api/control/pump', 
                         data=json.dumps(payload),
                         content_type='application/json')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'success'
    
    # Verify MQTT call
    mock_mqtt.publish.assert_called_once()
    
    # Verify DB logging
    events = db.get_watering_events(limit=1)
    assert len(events) == 1
    assert events[0][2] == 15 # duration
    assert events[0][3] == 'MANUAL'

def test_prediction_endpoint(client, db):
    """Test prediction endpoint"""
    # Note: This uses the real MLPredictor initialized in app.py
    # We populate `latest_sensor_data` implicitly via app logic?
    # Actually app.py updates `latest_sensor_data` via MQTT callback.
    # But in test environment, we might need to update it manually or via a fixture.
    
    # However, strictly unit testing the endpoint logic:
    # app.py's `latest_sensor_data` is a global. We can patch it.
    
    with patch('src.backend.app.latest_sensor_data', {
        'soil_moisture': 20.0, # LOW moisture
        'temperature': 30.0,
        'humidity': 50.0,
        'forecast_minutes': 0 # No Rain
    }):
        response = client.get('/api/predict-next-watering')
        assert response.status_code == 200
        data = response.get_json()
        
        # Should recommend WATER_NOW because moisture < 30 and no rain
        # Or at least return valid structure
        assert 'recommended_action' in data
        assert data['recommended_action'] == 'WATER_NOW'
        assert data['system_status'] == 'DRY_TRIGGER' # or similar depending on exact logic path

def test_prediction_endpoint_rain_stall(client, db):
    """Test stalling logic via API"""
    with patch('src.backend.app.latest_sensor_data', {
        'soil_moisture': 20.0, # LOW moisture
        'temperature': 30.0,
        'humidity': 50.0,
        'forecast_minutes': 60 # Rain in 1 hour
    }):
        response = client.get('/api/predict-next-watering')
        assert response.status_code == 200
        data = response.get_json()
        
        assert data['recommended_action'] == 'STALL'
        assert data['system_status'] == 'RAIN_DELAY'
