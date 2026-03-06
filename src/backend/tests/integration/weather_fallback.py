"""
Integration Tests for Weather Source Priority
Tests that app.py correctly prioritizes Real Weather API over Simulator data.
"""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
import json
import sys
import os

# Add src/backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def client():
    """Flask test client."""
    from app import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def real_weather_data():
    """What OpenWeatherMap API would return."""
    return {
        'forecast_minutes': 180,
        'forecast_temp': 22.5,
        'forecast_humidity': 65.0,
        'wind_speed': 10.3,
        'precipitation_chance': 30,
        'rain_intensity': 0.0,
        'cloud_cover': 45.0,
        'condition': 'Clouds',
        'source': 'openweathermap',
        'timestamp': '2026-02-17T12:00:00'
    }


@pytest.fixture
def sim_weather_payload():
    """What weather_simulator.py publishes to pwos/weather/current."""
    return {
        'forecast_minutes': 0,
        'temperature': 25.0,
        'humidity': 60.0,
        'wind_speed': 38.5,   # Suspiciously high (the bug!)
        'precipitation_chance': 10,
        'rain_intensity': 0.0,
        'cloud_cover': 15.0,
        'condition': 'Clouds',
    }


@pytest.fixture
def sensor_payload():
    """What esp32_simulator.py publishes to pwos/sensor/data."""
    return {
        'soil_moisture': 45.0,
        'temperature': 25.0,
        'humidity': 60.0,
        'timestamp': '2026-02-17T12:00:00'
    }


# ============================================================================
# TEST: Weather Source Priority in app.py
# ============================================================================

class TestWeatherSourcePriority:
    """
    Core test: When WEATHER_API_MODE='openweathermap', the system must
    use Real Weather data, NOT the Simulator's weather broadcasts.
    """

    @patch('app.WEATHER_API_MODE', 'openweathermap')
    def test_real_mode_ignores_sim_weather(self, sim_weather_payload):
        """
        In Real Mode, pwos/weather/current messages from the simulator
        should NOT update latest_sensor_data.
        """
        from app import on_message, latest_sensor_data

        # Clear state
        latest_sensor_data.clear()

        # Simulate receiving a weather/current MQTT message
        mock_msg = MagicMock()
        mock_msg.topic = "pwos/weather/current"
        mock_msg.payload.decode.return_value = json.dumps(sim_weather_payload)

        on_message(None, None, mock_msg)

        # Simulator's high wind should NOT be in latest_sensor_data
        assert latest_sensor_data.get('wind_speed') != 38.5, \
            "Simulator weather should be IGNORED in openweathermap mode!"

    @patch('app.WEATHER_API_MODE', 'simulation')
    def test_sim_mode_accepts_sim_weather(self, sim_weather_payload):
        """
        In Simulation Mode, pwos/weather/current messages SHOULD update
        latest_sensor_data.
        """
        from app import on_message, latest_sensor_data

        latest_sensor_data.clear()

        mock_msg = MagicMock()
        mock_msg.topic = "pwos/weather/current"
        mock_msg.payload.decode.return_value = json.dumps(sim_weather_payload)

        on_message(None, None, mock_msg)

        # Simulator's wind SHOULD be accepted
        assert latest_sensor_data.get('wind_speed') == 38.5, \
            "Simulator weather should be ACCEPTED in simulation mode!"

    @patch('app.WEATHER_API_MODE', 'openweathermap')
    def test_real_mode_fetches_real_weather_on_sensor_update(
        self, sensor_payload, real_weather_data
    ):
        """
        In Real Mode, when pwos/sensor/data arrives, app.py should
        fetch weather from weather_api and merge it into latest_sensor_data.
        """
        from app import on_message, latest_sensor_data

        latest_sensor_data.clear()

        # Mock weather_api.get_forecast to return real data
        with patch('app.weather_api') as mock_weather:
            mock_weather.get_forecast.return_value = real_weather_data

            mock_msg = MagicMock()
            mock_msg.topic = "pwos/sensor/data"
            mock_msg.payload.decode.return_value = json.dumps(sensor_payload)

            on_message(None, None, mock_msg)

        # Sensor data should be present
        assert latest_sensor_data['soil_moisture'] == 45.0

        # Real weather should be merged in
        assert latest_sensor_data['wind_speed'] == 10.3, \
            "Real weather wind speed should be used!"
        assert latest_sensor_data['weather_source'] == 'openweathermap'

    @patch('app.WEATHER_API_MODE', 'openweathermap')
    def test_real_mode_sensor_update_survives_api_failure(self, sensor_payload):
        """
        If weather_api.get_forecast() fails during sensor update,
        sensor data should still be saved. Weather fields should NOT
        be overwritten with simulator data.
        """
        from app import on_message, latest_sensor_data

        latest_sensor_data.clear()

        with patch('app.weather_api') as mock_weather:
            mock_weather.get_forecast.side_effect = Exception("API Down")

            mock_msg = MagicMock()
            mock_msg.topic = "pwos/sensor/data"
            mock_msg.payload.decode.return_value = json.dumps(sensor_payload)

            on_message(None, None, mock_msg)

        # Sensor data should still be saved
        assert latest_sensor_data['soil_moisture'] == 45.0
        # Weather fields should NOT contain simulator data (38.5 km/h)
        assert latest_sensor_data.get('wind_speed', 0) != 38.5


# ============================================================================
# TEST: Weather Fallback via /api/weather/forecast endpoint
# ============================================================================

class TestWeatherFallbackEndpoint:
    """
    Tests for the /api/weather/forecast endpoint.
    Verifies it returns valid data regardless of source.
    """

    def test_weather_endpoint_returns_200(self, client):
        """Weather endpoint should always return 200."""
        response = client.get('/api/weather/forecast')
        assert response.status_code == 200

    def test_weather_endpoint_has_required_keys(self, client):
        """Response must contain all required weather fields."""
        response = client.get('/api/weather/forecast')
        data = response.json

        required = ['temperature', 'condition']
        for key in required:
            assert key in data, f"Missing key: {key}"

    def test_weather_endpoint_wind_is_reasonable(self, client):
        """Wind speed should be within realistic bounds (0-150 km/h)."""
        response = client.get('/api/weather/forecast')
        data = response.json

        wind = data.get('wind_speed', 0)
        assert 0 <= wind <= 150, f"Unrealistic wind speed: {wind} km/h"


# ============================================================================
# TEST: Data Flow Consistency (Sensor + Weather → Database)
# ============================================================================

class TestDataFlowConsistency:
    """
    Tests that the weather source field in logged data
    accurately reflects where the weather data came from.
    """

    @patch('app.WEATHER_API_MODE', 'openweathermap')
    def test_weather_source_is_openweathermap_in_real_mode(
        self, sensor_payload, real_weather_data
    ):
        """
        When logging sensor data in Real Mode, weather_source
        must be 'openweathermap', never 'simulation'.
        """
        from app import on_message, latest_sensor_data

        latest_sensor_data.clear()

        with patch('app.weather_api') as mock_weather:
            mock_weather.get_forecast.return_value = real_weather_data

            mock_msg = MagicMock()
            mock_msg.topic = "pwos/sensor/data"
            mock_msg.payload.decode.return_value = json.dumps(sensor_payload)

            on_message(None, None, mock_msg)

        assert latest_sensor_data.get('weather_source') == 'openweathermap'

    @patch('app.WEATHER_API_MODE', 'simulation')
    def test_weather_source_is_simulation_in_sim_mode(self, sim_weather_payload):
        """
        When logging sensor data in Simulation Mode, weather_source
        must be 'simulation'.
        """
        from app import on_message, latest_sensor_data

        latest_sensor_data.clear()

        mock_msg = MagicMock()
        mock_msg.topic = "pwos/weather/current"
        mock_msg.payload.decode.return_value = json.dumps(sim_weather_payload)

        on_message(None, None, mock_msg)

        assert latest_sensor_data.get('weather_source') == 'simulation'
