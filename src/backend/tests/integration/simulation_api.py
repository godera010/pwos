import pytest
from app import app
from unittest.mock import patch, MagicMock

# Helper to client
@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestSimulationAPI:
    """
    Tests for the Simulation API endpoints (Reset, Step, State).
    Targeting ~5 scenarios.
    """

    def test_reset_default_scenario(self, client):
        """Test resetting simulation to default state."""
        response = client.post('/api/simulation/reset', json={})
        assert response.status_code == 200
        data = response.json
        assert data['status'] == 'reset'
        assert data['scenario'] == 'mixed_weather'
        assert data['state']['running'] is False

    def test_reset_custom_scenario(self, client):
        """Test resetting to a specific scenario (heat_wave)."""
        response = client.post('/api/simulation/reset', json={'scenario': 'heat_wave'})
        assert response.status_code == 200
        data = response.json
        assert data['scenario'] == 'heat_wave'
        # Check if heat wave temp is applied (base temp 38 as per app.py)
        assert data['state']['weather']['temperature'] == 38

    def test_simulation_step_logic(self, client):
        """Test stepping the simulation forward."""
        # First reset
        client.post('/api/simulation/reset', json={})
        
        # Take a step
        response = client.post('/api/simulation/step')
        assert response.status_code == 200
        data = response.json
        
        assert data['step'] == 1
        # Hour should advance by 0.25 (15 mins)
        assert data['hour'] == 8.25

    def test_get_simulation_state(self, client):
        """Test fetching current state."""
        client.post('/api/simulation/reset')
        response = client.get('/api/simulation/state')
        assert response.status_code == 200
        assert 'fields' in response.json
        assert 'weather' in response.json

    def test_invalid_scenario_fallback(self, client):
        """Test that invalid scenario name falls back to default."""
        response = client.post('/api/simulation/reset', json={'scenario': 'invalid_name'})
        data = response.json
        assert data['scenario'] == 'mixed_weather' # Should fallback
