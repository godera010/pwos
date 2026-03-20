import pytest
from unittest.mock import MagicMock, patch

class TestDecisionLogic:
    
    def test_emergency_watering_low_moisture(self, predictor):
        """Test emergency watering when moisture is critically low."""
        # Mock model predict to return 0 (No rain needed according to model, but rule overrides)
        predictor.model = MagicMock()
        predictor.model.predict.return_value = [0]
        predictor.model.predict_proba.return_value = [[0.9, 0.1]]
        
        # Scenario: 10% moisture (Critical < 15%), Standard temp
        data = {
            'soil_moisture': 10,
            'temperature': 25,
            'humidity': 50,
            'forecast_minutes': 0
        }
        
        result = predictor.predict_next_watering(data)
        
        assert result['recommended_action'] == "NOW"
        assert result['system_status'] == "CRITICAL"
        assert "Critically low moisture" in result['reason']

    def test_rain_delay_logic(self, predictor):
        """Test stalling when rain is expected."""
        predictor.model = MagicMock()
        predictor.model.predict.return_value = [1] # Model says water
        predictor.model.predict_proba.return_value = [[0.1, 0.9]]
        
        # Scenario: Moisture 30% (Low but not critical), Rain in 60 mins
        data = {
            'soil_moisture': 30,
            'temperature': 20,
            'humidity': 60,
            'forecast_minutes': 60, # 1 hour
            'weather_source': 'openweathermap'
        }
        
        result = predictor.predict_next_watering(data)
        
        assert result['recommended_action'] == "STALL"
        assert result['system_status'] == "RAIN_EXPECTED"
        assert "Rain" in result['reason']

    def test_vpd_delay_midday(self, predictor):
        """Test stalling during high VPD at midday."""
        predictor.model = MagicMock()
        # Mock datetime to be 13:00 (midday)
        with patch('models.ml_predictor.datetime') as mock_date:
            mock_date.now.return_value.hour = 13
            mock_date.now.return_value.month = 1 # Summer
            mock_date.now.return_value.weekday.return_value = 0
            
            # Scenario: High Temp, Low Humidity -> High VPD
            data = {
                'soil_moisture': 30, # Low
                'temperature': 35,
                'humidity': 20, # Very dry
                'forecast_minutes': 0
            }
            
            result = predictor.predict_next_watering(data)
            
            # Should stall due to extreme VPD > 2.0 (approx 4.0 here)
            assert result['recommended_action'] == "STALL"
            assert result['system_status'] == "VPD_DELAY"

    def test_stop_if_raining(self, predictor):
        """Test system stop if currently raining."""
        predictor.model = MagicMock()
        
        data = {
            'soil_moisture': 50,
            'temperature': 20,
            'rain_intensity': 5.0, # Raining
            'weather_source': 'openweathermap'
        }
        
        result = predictor.predict_next_watering(data)
        
        assert result['recommended_action'] == "STOP"
        assert result['system_status'] == "RAINING"

    def test_proactive_morning_watering(self, predictor):
        """Test proactive watering in morning before heatwave."""
        with patch('models.ml_predictor.datetime') as mock_date:
            mock_date.now.return_value.hour = 5 # 5 AM
            mock_date.now.return_value.month = 1
            mock_date.now.return_value.weekday.return_value = 0 # Fix: Mock weekday to return int
            
            # Scenario: Moderate moisture (40%), but high predicted temp/vpd implied by 'is_extreme_vpd' logic 
            # (Note: In actual code, is_extreme_vpd is calculated from CURRENT vals, 
            # so for this test we need current vals to be high enough to trigger flag, 
            # OR we rely on the forecast integration. 
            # Looking at code: it checks `features.get('is_extreme_vpd')`.
            # Let's force a high VPD condition or check logic coverage.
            
            # Actually, the code implies checking current conditions. 
            # If it's 5AM, temp is usually low. 
            # The logic `is_morning and features.get('is_extreme_vpd', 0) == 1` might be flawed if using current temp.
            # But let's test the logic branch assuming input triggers it.
            
            data = {
                'soil_moisture': 40, # < Proactive (50%)
                'temperature': 30, # Unusually warm morning?
                'humidity': 20     # Dry
            }
            # This yields VPD > 2.0
            
            result = predictor.predict_next_watering(data)
            
            assert result['recommended_action'] == "NOW"
            assert result['system_status'] == "PREHEAT"
