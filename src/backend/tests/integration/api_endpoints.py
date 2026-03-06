import pytest
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from app import app
from unittest.mock import patch, MagicMock

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestAPIEndpoints:
    
    def test_health_check(self, client):
        """Test the health check endpoint."""
        response = client.get('/api/health')
        assert response.status_code == 200
        assert response.json['status'] == 'online'

    @patch('app.predictor.predict_next_watering')
    def test_predict_endpoint(self, mock_predict, client):
        """Test /predict-next-watering endpoint."""
        mock_response = {
            'recommended_action': "MONITOR", 
            'confidence': 95.0,
            'reason': "Test reason",
            'recommended_duration': 0,
            'system_status': 'STABLE'
        }
        mock_predict.return_value = mock_response
        
        response = client.get('/api/predict-next-watering')
        assert response.status_code == 200
        assert response.json['recommended_action'] == "MONITOR"

    def test_control_pump_manual(self, client):
        """Test manual pump control."""
        with patch('app.mqtt_client.publish') as mock_publish:
            mock_publish.return_value.rc = 0
            
            response = client.post('/api/control/pump', json={
                'action': 'ON',
                'duration': 10,
                'trigger_source': 'MANUAL'
            })
            
            assert response.status_code == 200
            assert response.json['status'] == 'success'
            mock_publish.assert_called_once()
            
    def test_logs_retrieval(self, client):
        """Test fetching logs."""
        with patch('app.db.get_logs') as mock_get_logs:
            mock_get_logs.return_value = []
            
            response = client.get('/api/logs')
            assert response.status_code == 200
            assert isinstance(response.json, list)
