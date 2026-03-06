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
        data_dry = {'soil_moisture': 40, 'temperature': 25, 'rain_intensity': 0}
        res_dry = predictor.predict_next_watering(data_dry)
        # Assuming model says water or monitor, but not STOP
        assert res_dry['recommended_action'] != "STOP"
        
        # Event: Rain starts
        data_rain = {'soil_moisture': 42, 'temperature': 24, 'rain_intensity': 10}
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
            mock_date.now.return_value.month = 1
            mock_date.now.return_value.weekday.return_value = 0 # Mock weekday
            
            # High VPD conditions
            data = {
                'soil_moisture': 32, # Needs water (Low threshold 35)
                'temperature': 38,
                'humidity': 15,
                'forecast_minutes': 0
            }
            
            res = predictor.predict_next_watering(data)
            
            assert res['recommended_action'] == "STALL"
            assert "VPD" in res['reason'] or "Stalling" in res['reason']

    def test_high_wind_safety(self, predictor):
        """
        Scenario: High wind gusts (>20km/h).
        Expected: STALL to prevent spray drift.
        """
        predictor.model = MagicMock()
        
        data = {
            'soil_moisture': 30,
            'wind_speed': 25.0, # High wind
            'temperature': 25
        }
        
        res = predictor.predict_next_watering(data)
        
        assert res['recommended_action'] == "STALL"
        assert "Wind" in res['reason']
