import pytest
from unittest.mock import MagicMock

class TestEdgeCases:
    """
    Scenario tests for sensor anomalies and edge cases.
    Targeting ~10 scenarios.
    """

    def test_sudden_moisture_spike(self, predictor):
        """
        Scenario: Moisture spikes from 10% to 90% instantly (e.g., sensor short).
        Expected: Should likely STOP watering if running, but verify system logic.
        """
        predictor.model = MagicMock()
        
        # 1. Low moisture
        data_low = {'soil_moisture': 10, 'temperature': 25}
        
        # 2. Spike
        data_spike = {'soil_moisture': 90, 'temperature': 25}
        
        # Logic might differ: 
        # - If spike is real (flash flood), we STOP.
        # - If spike is 'Impossible', we might handle differently (but basic logic accepts it).
        
        res = predictor.predict_next_watering(data_spike)
        # Should detect saturation/high moisture
        assert res['recommended_action'] in ["STOP", "MONITOR"] # Definitley not WATER_NOW

    def test_sensor_drift_handling(self, predictor):
        """Scenario: verify behavior with consistent but weird values."""
        pass

    def test_negative_readings(self, predictor):
        """Scenario: Sensor returns negative value (Hardware failure)."""
        data = {'soil_moisture': -50.0}
        # Predictor might crash or clamp. 
        # If it clamps, it sees 0 -> Critical. 
        # If it uses raw, model might output garbage.
        # Let's test robustness.
        pass

    def test_all_zeros_scenario(self, predictor):
        """Scenario: Dead sensor (all 0s)."""
        data = {'soil_moisture': 0, 'temperature': 0, 'humidity': 0}
        res = predictor.predict_next_watering(data)
        # 0 moisture -> usually critical clean water
        assert res['recommended_action'] == "NOW"

    def test_max_values_scenario(self, predictor):
        """Scenario: Sensors pegged at max."""
        data = {'soil_moisture': 100, 'temperature': 100, 'humidity': 100}
        res = predictor.predict_next_watering(data)
        assert res['recommended_action'] != "NOW"
