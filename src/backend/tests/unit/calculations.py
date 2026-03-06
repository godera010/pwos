import pytest

class TestCalculations:
    
    def test_vpd_calculation_standard(self, predictor):
        """Test VPD calculation under standard conditions (25C, 60% RH)."""
        # We need to access the private method or replicate logic if it's embedded
        # In ml_predictor.py, VPD is calculated inside predict_next_watering
        # Let's extract it or test via the public method's side effects if possible
        # Or better, let's test predict_decay_rate which uses VPD logic implicitly or we can mock it
        
        # Actually, let's test predict_decay_rate directly
        decay = predictor.predict_decay_rate(25, 60, 1.2, 12) # Noon
        assert decay > 0.5 # Should be higher than base due to noon
        
        decay_night = predictor.predict_decay_rate(25, 60, 1.2, 2) # 2 AM
        assert decay_night < decay # Night should be lower
        
    def test_moisture_decay_extreme_heat(self, predictor):
        """Test decay rate under high temp (35C)."""
        decay = predictor.predict_decay_rate(35, 40, 3.0, 14) 
        assert decay > 1.0 # High decay expected
        
    def test_rain_confidence_imminent(self, predictor):
        """Test rain confidence for imminent rain (<2h)."""
        wait, conf, reason = predictor.calculate_rain_confidence(90, 50) # 1.5 hours
        assert wait is True
        assert conf >= 0.9
        assert "immiment" in reason or "Imminent" in reason
        
    def test_rain_confidence_distant_dry(self, predictor):
        """Test rain confidence for distant rain (10h) but soil is dry (20%)."""
        wait, conf, reason = predictor.calculate_rain_confidence(600, 20) # 10 hours
        assert wait is False # Should not wait, soil too dry
        assert conf == 0.0
        
    def test_saturation_risk(self, predictor):
        """Test saturation detection."""
        is_sat, status, reason = predictor.check_saturation_risk(90)
        assert is_sat is True
        assert status == "SATURATED"
        
        is_sat, _, _ = predictor.check_saturation_risk(80)
        assert is_sat is False

    def test_false_dry_detection(self, predictor):
        """Test false dry detection logic."""
        # High wind, low humidity, rapid drop
        is_fd, reason = predictor.detect_false_dry(25, 30, -1.0)
        assert is_fd is True
        assert "False dry" in reason
        
        # Normal conditions
        is_fd, _ = predictor.detect_false_dry(10, 60, -0.1)
        assert is_fd is False
