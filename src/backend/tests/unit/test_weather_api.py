"""
Unit Tests for Weather API
Tests parsing, fallback logic, and data format consistency.
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
def mock_owm_response():
    """Realistic OpenWeatherMap API response."""
    return {
        "list": [
            {
                "dt": 1740000000,
                "main": {"temp": 22.5, "humidity": 65},
                "wind": {"speed": 3.5},  # m/s
                "clouds": {"all": 45},
                "pop": 0.3,
                "weather": [{"main": "Clouds", "description": "scattered clouds"}]
            },
            {
                "dt": 1740010800,
                "main": {"temp": 20.0, "humidity": 70},
                "wind": {"speed": 2.0},
                "clouds": {"all": 80},
                "pop": 0.7,
                "weather": [{"main": "Rain", "description": "light rain"}]
            }
        ]
    }


@pytest.fixture
def mock_owm_rain_response():
    """OWM response where it's currently raining."""
    return {
        "list": [
            {
                "dt": 1740000000,
                "main": {"temp": 18.0, "humidity": 90},
                "wind": {"speed": 5.0},
                "clouds": {"all": 100},
                "pop": 0.95,
                "rain": {"3h": 4.5},  # 4.5mm in 3 hours
                "weather": [{"main": "Rain", "description": "moderate rain"}]
            }
        ]
    }


@pytest.fixture
def mock_sim_weather():
    """Simulated weather MQTT payload."""
    return {
        "timestamp": "2026-02-17T12:00:00",
        "condition": "Clouds",
        "temperature": 20.0,
        "humidity": 65.0,
        "rain_intensity": 0.0,
        "cloud_cover": 55.0,
        "wind_speed": 8.5,
        "precipitation_chance": 30,
        "forecast_minutes": 120
    }


@pytest.fixture
def mock_current_response():
    """Realistic OpenWeatherMap Current Weather API response."""
    return {
        "main": {"temp": 22.5, "humidity": 65},
        "wind": {"speed": 3.5},  # m/s
        "clouds": {"all": 45},
        "weather": [{"main": "Clouds", "description": "scattered clouds"}]
    }


@pytest.fixture
def mock_current_rain_response():
    """OWM Current Weather response when raining."""
    return {
        "main": {"temp": 18.0, "humidity": 90},
        "wind": {"speed": 5.0},
        "clouds": {"all": 100},
        "weather": [{"main": "Rain", "description": "moderate rain"}]
    }


# ============================================================================
# UNIT TESTS: WeatherAPI._parse_combined_data
# ============================================================================

class TestParseOWMForecast:
    """Tests for the _parse_combined_data method of WeatherAPI."""

    def test_parse_wind_speed_conversion(self, mock_current_response, mock_owm_response):
        """Wind speed must be converted from m/s to km/h."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        # 3.5 m/s * 3.6 = 12.6 km/h
        assert result['wind_speed'] == 12.6, \
            f"Expected 12.6 km/h, got {result['wind_speed']}"

    def test_parse_temperature_humidity(self, mock_current_response, mock_owm_response):
        """Should extract temp and humidity from current weather data."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        assert result['forecast_temp'] == 22.5
        assert result['forecast_humidity'] == 65

    def test_parse_cloud_cover(self, mock_current_response, mock_owm_response):
        """Cloud cover should be extracted from current weather 'clouds.all'."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        assert result['cloud_cover'] == 45.0

    def test_parse_precipitation_chance(self, mock_current_response, mock_owm_response):
        """Precipitation chance should be scaled from 0-1 to 0-100."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        # pop=0.3 -> 30%
        assert result['precipitation_chance'] == 30

    def test_parse_rain_intensity(self, mock_current_rain_response, mock_owm_rain_response):
        """Rain intensity should be derived from mm/3h with scaling."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_rain_response, mock_owm_rain_response)

        # 4.5mm * 20 = 90%
        assert result['rain_intensity'] == 90.0

    def test_parse_condition_cloudy(self, mock_current_response, mock_owm_response):
        """Condition from current weather should be 'Clouds'."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        assert result['condition'] == 'Clouds'

    def test_parse_condition_raining(self, mock_current_rain_response, mock_owm_rain_response):
        """Condition from current weather should be 'Rain'."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_rain_response, mock_owm_rain_response)

        assert result['condition'] == 'Rain'

    def test_parse_rain_forecast_minutes(self, mock_current_response, mock_owm_response):
        """Should calculate minutes until rain from future forecast items."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        # Second entry has 'Rain', so forecast_minutes should be >= 0
        assert result['forecast_minutes'] >= 0

    def test_parse_source_openweathermap(self, mock_current_response, mock_owm_response):
        """Source should always be 'openweathermap'."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        assert result['source'] == 'openweathermap'

    def test_parse_empty_forecast(self):
        """Should return safe defaults if forecast list is empty."""
        from weather_api import WeatherAPI

        empty_current = {}
        empty_forecast = {"list": []}

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(empty_current, empty_forecast)

        assert result['wind_speed'] == 0.0
        assert result['forecast_temp'] == 25.0
        assert result['forecast_humidity'] == 60.0
        assert result['condition'] == 'Clear'
        assert result['source'] == 'openweathermap'


# ============================================================================
# UNIT TESTS: WeatherAPI._simulate_weather
# ============================================================================

class TestSimulateWeather:
    """Tests for the _simulate_weather method (MQTT Simulation fallback)."""

    def test_simulate_with_mqtt_data(self, mock_sim_weather):
        """When MQTT data exists, should return simulation data."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api._latest_sim_weather = mock_sim_weather
            result = api._simulate_weather()

        assert result['wind_speed'] == 8.5
        assert result['condition'] == 'Clouds'
        assert result['cloud_cover'] == 55.0
        assert result['source'] == 'simulation'

    def test_simulate_without_mqtt_data(self):
        """When no MQTT data, should return safe fallback defaults."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api._latest_sim_weather = None
            result = api._simulate_weather()

        assert result['wind_speed'] == 0.0
        assert result['condition'] == 'unknown'
        assert result['source'] == 'fallback'
        assert result['forecast_minutes'] == 0


# ============================================================================
# UNIT TESTS: WeatherAPI.get_forecast (Mode Routing)
# ============================================================================

class TestGetForecast:
    """Tests for get_forecast mode routing."""

    @patch('weather_api.WEATHER_API_MODE', 'openweathermap')
    def test_openweathermap_mode_calls_fetch(self):
        """In OWM mode, should call _fetch_openweathermap."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api.mode = 'openweathermap'

            with patch.object(api, '_fetch_openweathermap', return_value={'source': 'openweathermap'}) as mock_fetch:
                result = api.get_forecast()

            mock_fetch.assert_called_once()
            assert result['source'] == 'openweathermap'

    @patch('weather_api.WEATHER_API_MODE', 'simulation')
    def test_simulation_mode_calls_simulate(self):
        """In simulation mode, should call _simulate_weather."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api.mode = 'simulation'

            with patch.object(api, '_simulate_weather', return_value={'source': 'simulation'}) as mock_sim:
                result = api.get_forecast()

            mock_sim.assert_called_once()
            assert result['source'] == 'simulation'


# ============================================================================
# UNIT TESTS: OWM Fallback to Simulator
# ============================================================================

class TestOWMFallback:
    """Tests for OpenWeatherMap API failure → Simulator fallback.
    
    Fallback chain: OpenWeatherMap → Simulator → Safe defaults
    """

    def test_fallback_to_simulator_on_api_error(self):
        """If OWM API fails, should fall back to simulator."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api.mode = 'openweathermap'
            api._cache = None

            # Mock the HTTP request to fail
            with patch('weather_api.requests.get', side_effect=Exception("API Down")):
                with patch.object(api, '_simulate_weather', return_value={
                    'source': 'simulation', 'wind_speed': 5.0,
                    'forecast_minutes': 0, 'forecast_temp': 25.0,
                    'forecast_humidity': 60.0, 'precipitation_chance': 0,
                    'rain_intensity': 0.0, 'cloud_cover': 0.0,
                    'condition': 'unknown', 'timestamp': '2026-02-17T12:00:00'
                }) as mock_sim:
                    result = api.get_forecast()

            mock_sim.assert_called_once()
            assert result['source'] == 'simulation'

    def test_fallback_to_simulator_on_timeout(self):
        """If OWM API times out, should fall back to simulator."""
        import requests as req
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api.mode = 'openweathermap'
            api._cache = None

            with patch('weather_api.requests.get', side_effect=req.Timeout("Timeout")):
                with patch.object(api, '_simulate_weather', return_value={
                    'source': 'simulation', 'wind_speed': 0.0,
                    'forecast_minutes': 0, 'forecast_temp': 25.0,
                    'forecast_humidity': 60.0, 'precipitation_chance': 0,
                    'rain_intensity': 0.0, 'cloud_cover': 0.0,
                    'condition': 'unknown', 'timestamp': '2026-02-17T12:00:00'
                }) as mock_sim:
                    result = api.get_forecast()

            mock_sim.assert_called_once()
            assert result['source'] == 'simulation'

    def test_simulator_returns_safe_defaults_when_unavailable(self):
        """If simulator has no data, _simulate_weather returns safe defaults."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api._latest_sim_weather = None  # No simulator data
            
            result = api._simulate_weather()

        assert result['source'] == 'fallback'
        assert result['wind_speed'] == 0.0

    def test_cache_prevents_repeated_api_calls(self, mock_owm_response):
        """Cached result should be returned without hitting the API again."""
        from weather_api import WeatherAPI
        from datetime import datetime, timezone

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api.mode = 'openweathermap'

            # Pre-populate cache
            cached_result = {'source': 'openweathermap', 'wind_speed': 10.0, 'cached': True}
            api._cache = cached_result
            api._cache_time = datetime.now(timezone.utc)

            result = api.get_forecast()

        # Should return cached result
        assert result.get('cached') == True
        assert result['wind_speed'] == 10.0


# ============================================================================
# UNIT TESTS: Unified Format Consistency
# ============================================================================

class TestUnifiedFormat:
    """All weather sources must return the same keys."""

    REQUIRED_KEYS = [
        'forecast_minutes', 'forecast_temp', 'forecast_humidity',
        'wind_speed', 'precipitation_chance', 'rain_intensity',
        'cloud_cover', 'condition', 'source', 'timestamp'
    ]

    def test_owm_format_has_all_keys(self, mock_current_response, mock_owm_response):
        """OWM parsed result must have all required keys."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            result = api._parse_combined_data(mock_current_response, mock_owm_response)

        for key in self.REQUIRED_KEYS:
            assert key in result, f"Missing key in OWM result: {key}"

    def test_simulation_format_has_all_keys(self, mock_sim_weather):
        """Simulation result must have all required keys."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api._latest_sim_weather = mock_sim_weather
            result = api._simulate_weather()

        for key in self.REQUIRED_KEYS:
            assert key in result, f"Missing key in simulation result: {key}"

    def test_fallback_format_has_all_keys(self):
        """Fallback (no data) must have all required keys."""
        from weather_api import WeatherAPI

        with patch.object(WeatherAPI, '_setup_mqtt_listener'):
            api = WeatherAPI()
            api._latest_sim_weather = None
            result = api._simulate_weather()

        for key in self.REQUIRED_KEYS:
            assert key in result, f"Missing key in fallback result: {key}"
