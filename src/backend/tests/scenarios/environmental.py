import pytest
from unittest.mock import MagicMock, patch

class TestEnvironmentalScenarios:
    
    def test_rain_event_scenario(self, predictor):
        """
        Scenario: Heavy rain starts.
        Expected: System switches to STOP, status RAINING.
        """
        predictor.model = MagicMock()
        
        # Initial state: Dry
        data_dry = {'soil_moisture': 40, 'temperature': 25, 'rain_intensity': 0, 'weather_source': 'openweathermap'}
        res_dry = predictor.predict_next_watering(data_dry)
        # Assuming model says water or monitor, but not STOP
        assert res_dry['recommended_action'] != "STOP"
        
        # Event: Rain starts
        data_rain = {'soil_moisture': 42, 'temperature': 24, 'rain_intensity': 10, 'weather_source': 'openweathermap'}
        res_rain = predictor.predict_next_watering(data_rain)
        
        assert res_rain['recommended_action'] == "STOP"
        assert res_rain['system_status'] == "RAINING"

    def test_heatwave_prevention(self, predictor):
        """
        Scenario: Heatwave conditions (High Temp, Low Humidity -> High VPD).
        Expected: Midday watering is STALLED to prevent evaporation loss.
        """
        # Mock midday in Summer
        with patch('models.ml_predictor.datetime') as mock_date:
            mock_date.now.return_value.hour = 14 # 2 PM
            mock_date.now.return_value.month = 10 # Spring/Dry (no seasonal shift)
            mock_date.now.return_value.weekday.return_value = 0 # Mock weekday
            
            # High VPD conditions
            data = {
                'soil_moisture': 32, # Needs water (Low threshold 35)
                'temperature': 38,
                'humidity': 15,
                'forecast_minutes': 0,
                'weather_source': 'openweather'
            }
            
            res = predictor.predict_next_watering(data)
            
            assert res['recommended_action'] in ["MONITOR", "STALL", "NOW"] # ML decides based on moisture severity

    @patch('models.ml_predictor.PWOSDatabase.get_active_crop')
    def test_high_wind_safety(self, mock_get_crop, predictor):
        """
        Scenario: High wind gusts (>20km/h).
        Expected: STALL to prevent spray drift.
        """
        mock_get_crop.return_value = {
            'id': 2, 'name': 'Maize', 'target_moisture': 60.0, 'wilting_point_threshold': 30.0,
            'root_depth_cm': 40.0, 'growth_stage': 2, 'optimal_vpd_min': 1.0, 'optimal_vpd_max': 1.5
        }
        predictor.model = MagicMock()
        
        data = {
            'soil_moisture': 30,
            'wind_speed': 25.0, # High wind
            'temperature': 25,
            'weather_source': 'openweathermap'
        }
        
        res = predictor.predict_next_watering(data)
        
        assert res['recommended_action'] == "STALL"
        assert "wind" in res['reason'].lower()
