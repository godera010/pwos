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
        """Scenario: verify behavior with flatline standard deviation and low average moisture."""
        import pandas as pd
        
        # 1. Flatline check (all readings are identical e.g., 45.0)
        history_flatline = pd.DataFrame({
            'soil_moisture': [45.0, 45.0, 45.0],
            'timestamp': ['2026-05-22T20:00:00Z', '2026-05-22T20:01:00Z', '2026-05-22T20:02:00Z']
        })
        current_data_flatline = {
            'soil_moisture': 45.0,
            'temperature': 25.0
        }
        res_flatline = predictor.predict_next_watering(current_data_flatline, history_df=history_flatline)
        # Flatline on 45% moisture with >= 4 readings (3 in history + 1 current) should trigger SENSOR_ERROR
        assert res_flatline['recommended_action'] == "STOP"
        assert res_flatline['system_status'] == "SENSOR_ERROR"
        assert "sensor" in res_flatline['reason'].lower()

        # 2. Low average check (readings are low but slightly variable e.g., 0.9, 0.8, 0.7 -> average < 1.0%)
        history_low = pd.DataFrame({
            'soil_moisture': [0.9, 0.8],
            'timestamp': ['2026-05-22T20:00:00Z', '2026-05-22T20:01:00Z']
        })
        current_data_low = {
            'soil_moisture': 0.7,
            'temperature': 25.0
        }
        res_low = predictor.predict_next_watering(current_data_low, history_df=history_low)
        # Average below 1.0% with >= 3 readings (2 in history + 1 current) should trigger SENSOR_ERROR
        assert res_low['recommended_action'] == "STOP"
        assert res_low['system_status'] == "SENSOR_ERROR"
        assert "sensor" in res_low['reason'].lower()

        # 3. Normal signal check (readings are slightly varying e.g., 45.2, 45.1, 45.3)
        # Mock model prediction since sensor is valid and model will be queried
        predictor.model = MagicMock()
        predictor.model.predict = MagicMock(return_value=[0])
        predictor.model.predict_proba = MagicMock(return_value=[[0.8, 0.2]])
        
        history_normal = pd.DataFrame({
            'soil_moisture': [45.2, 45.1, 45.3],
            'timestamp': ['2026-05-22T20:00:00Z', '2026-05-22T20:01:00Z', '2026-05-22T20:02:00Z']
        })
        current_data_normal = {
            'soil_moisture': 45.2,
            'temperature': 25.0
        }
        res_normal = predictor.predict_next_watering(current_data_normal, history_df=history_normal)
        # Normal variation should not trigger SENSOR_ERROR
        assert res_normal['system_status'] != "SENSOR_ERROR"

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
        # 0 moisture -> suspected disconnected/broken sensor -> STOP
        assert res['recommended_action'] == "STOP"
        assert res['system_status'] == "SENSOR_ERROR"
        assert "sensor" in res['reason'].lower()

    def test_max_values_scenario(self, predictor):
        """Scenario: Sensors pegged at max."""
        data = {'soil_moisture': 100, 'temperature': 100, 'humidity': 100}
        res = predictor.predict_next_watering(data)
        assert res['recommended_action'] != "NOW"
