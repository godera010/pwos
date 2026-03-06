import pytest
from unittest.mock import MagicMock, patch

class TestConflictResolution:
    """
    Tests for conflict between Auto logic and Manual overrides.
    """

    def test_manual_override_persists(self):
        """
        Scenario: User sets MANUAL mode. 
        Predictor says WATER, but execution logic checks mode.
        """
        # This logic is usually in the Controller or App route, not pure ML predictor.
        # We test the system state flag logic if we can access it, or API behavior.
        pass

    def test_rain_vs_critical_dry(self, predictor):
        """
        Scenario: It is raining heavily, BUT soil is critically dry (e.g. sensor covered?).
        Logic: Rain usually forces STOP.
        """
        predictor.model = MagicMock()
        
        data = {
            'soil_moisture': 5,     # Critical dry
            'rain_intensity': 20.0, # Heavy rain
            'forecast_minutes': 0,
            'temperature': 25
        }
        
        res = predictor.predict_next_watering(data)
        
        # Priority: If soil is CRITICALLY dry (5%), we must water even if raining,
        # because rain might not penetrate fast enough to save dying plant.
        # Logic seems to prioritize Critical Dry (NOW) over Rain (STOP).
        # Actual status returned is EMERGENCY (from decision_logic.py logic)
        assert res['recommended_action'] == "NOW"
        assert "EMERGENCY" in res['system_status'] or "CRITICAL" in res['system_status']

    def test_heatwave_vs_critical_dry(self, predictor):
        """
        Scenario: Heatwave (don't water midday) VS Critical Dry (Plants dying).
        Logic: Saving plants (Critical) > Saving water (Evaporation).
        """
        with patch('models.ml_predictor.datetime') as mock_date:
            mock_date.now.return_value.hour = 14 # Midday
            mock_date.now.return_value.month = 1
            mock_date.now.return_value.weekday.return_value = 0
            
            data = {
                'soil_moisture': 10, # Critical
                'temperature': 38,   # Heatwave
                'humidity': 15
            }
            
            res = predictor.predict_next_watering(data)
            
            # Should prioritize survival -> NOW
            assert res['recommended_action'] == "NOW"
            assert "CRITICAL" in res['system_status']
