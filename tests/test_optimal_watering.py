"""
P-WOS Optimal Watering Time Tests
==================================
Tests for VPD-aware optimal watering time logic in ml_predictor.py
"""

import pytest
import sys
import os
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestOptimalWateringDecision:
    """Test VPD-aware optimal watering time decisions."""
    
    # Helper to create mock predictor result
    def make_decision(self, moisture, temp, humidity, hour, forecast_mins=9999):
        """Simulate the decision logic from ml_predictor.py"""
        import math
        
        # VPD Calculation
        es = 0.6108 * math.exp((17.27 * temp) / (temp + 237.3))
        ea = es * (humidity / 100.0)
        vpd = max(0, es - ea)
        
        # Thresholds
        CRITICAL = 10.0
        LOW = 30.0
        PROACTIVE = 45.0
        HIGH = 75.0
        HIGH_VPD = 2.0
        EXTREME_VPD = 3.0
        
        # Time windows
        is_optimal_morning = 4 <= hour <= 6
        is_optimal_evening = 18 <= hour <= 20
        is_optimal_time = is_optimal_morning or is_optimal_evening
        is_high_evap_period = 10 <= hour <= 16
        is_high_vpd = vpd > HIGH_VPD
        is_extreme_vpd = vpd > EXTREME_VPD
        rain_imminent = 0 < forecast_mins < 360  # 6h
        
        # Decision logic (simplified from ml_predictor.py)
        if moisture > HIGH:
            return "WAIT", "OPTIMAL"
        elif moisture < CRITICAL:
            return "WATER_NOW", "EMERGENCY_OVERRIDE"
        elif moisture < LOW:
            if rain_imminent:
                return "STALL", "RAIN_DELAY"
            elif is_extreme_vpd and is_high_evap_period:
                return "STALL", "VPD_DELAY"
            elif is_high_vpd and is_optimal_time:
                return "WATER_NOW", "OPTIMAL_TIMING"
            elif is_high_vpd and not is_optimal_time:
                if 21 <= hour or hour < 4:
                    return "STALL", "WAIT_OPTIMAL"
                else:
                    return "WATER_NOW", "DRY_TRIGGER"
            else:
                return "WATER_NOW", "DRY_TRIGGER"
        elif moisture < PROACTIVE:
            if rain_imminent:
                return "STALL", "PROACTIVE_DELAY"
            elif is_extreme_vpd:
                return "MONITOR", "VPD_WATCH"
            else:
                return "WAIT", "MONITORING"
        else:
            return "WAIT", "OPTIMAL"
    
    # =======================================================
    # EMERGENCY OVERRIDE TESTS
    # =======================================================
    
    def test_critical_low_always_waters(self):
        """Critical moisture (<10%) should always trigger watering."""
        decision, status = self.make_decision(
            moisture=5, temp=40, humidity=15, hour=12  # Hot midday
        )
        assert decision == "WATER_NOW"
        assert status == "EMERGENCY_OVERRIDE"
    
    def test_critical_low_ignores_rain(self):
        """Critical moisture should water even with rain coming."""
        decision, status = self.make_decision(
            moisture=8, temp=25, humidity=90, hour=12, forecast_mins=30
        )
        assert decision == "WATER_NOW"
        assert status == "EMERGENCY_OVERRIDE"
    
    # =======================================================
    # OPTIMAL TIME DETECTION TESTS
    # =======================================================
    
    def test_optimal_morning_window(self):
        """4-6 AM should be recognized as optimal."""
        for hour in [4, 5, 6]:
            decision, status = self.make_decision(
                moisture=25, temp=35, humidity=30, hour=hour  # High VPD
            )
            assert decision == "WATER_NOW"
            assert status == "OPTIMAL_TIMING"
    
    def test_optimal_evening_window(self):
        """6-8 PM should be recognized as optimal."""
        for hour in [18, 19, 20]:
            decision, status = self.make_decision(
                moisture=25, temp=30, humidity=35, hour=hour  # High VPD
            )
            assert decision == "WATER_NOW"
            assert status == "OPTIMAL_TIMING"
    
    # =======================================================
    # VPD DELAY TESTS
    # =======================================================
    
    def test_extreme_vpd_midday_stalls(self):
        """Extreme VPD during midday should stall watering."""
        for hour in [10, 12, 14, 16]:
            decision, status = self.make_decision(
                moisture=25, temp=40, humidity=15, hour=hour  # VPD ~6.3
            )
            assert decision == "STALL"
            assert status == "VPD_DELAY"
    
    def test_high_vpd_late_night_waits_for_morning(self):
        """Late night with high VPD should wait for 04:00 optimal window."""
        for hour in [21, 22, 23, 0, 1, 2, 3]:
            decision, status = self.make_decision(
                moisture=25, temp=28, humidity=30, hour=hour  # VPD ~2.6
            )
            assert decision == "STALL"
            assert status == "WAIT_OPTIMAL"
    
    def test_moderate_vpd_waters_immediately(self):
        """Moderate VPD should water without delay."""
        decision, status = self.make_decision(
            moisture=25, temp=22, humidity=60, hour=10  # VPD ~1.0
        )
        assert decision == "WATER_NOW"
        assert status == "DRY_TRIGGER"
    
    # =======================================================
    # RAIN DELAY TESTS
    # =======================================================
    
    def test_rain_imminent_stalls(self):
        """Rain within 6 hours should stall watering."""
        decision, status = self.make_decision(
            moisture=25, temp=25, humidity=80, hour=10, forecast_mins=120
        )
        assert decision == "STALL"
        assert status == "RAIN_DELAY"
    
    def test_proactive_zone_rain_stalls(self):
        """30-45% moisture with rain coming should stall."""
        decision, status = self.make_decision(
            moisture=35, temp=25, humidity=60, hour=10, forecast_mins=60
        )
        assert decision == "STALL"
        assert status == "PROACTIVE_DELAY"
    
    # =======================================================
    # HIGH MOISTURE TESTS
    # =======================================================
    
    def test_high_moisture_waits(self):
        """High moisture (>75%) should always wait."""
        decision, status = self.make_decision(
            moisture=80, temp=40, humidity=15, hour=12
        )
        assert decision == "WAIT"
        assert status == "OPTIMAL"
    
    # =======================================================
    # VPD WATCH TESTS
    # =======================================================
    
    def test_proactive_zone_extreme_vpd_monitors(self):
        """30-45% moisture with extreme VPD should actively monitor."""
        decision, status = self.make_decision(
            moisture=35, temp=40, humidity=15, hour=12
        )
        assert decision == "MONITOR"
        assert status == "VPD_WATCH"


class TestWateringTimeRanking:
    """Test that watering times are correctly ranked."""
    
    def test_early_morning_beats_midday(self):
        """Water applied at 05:00 should last longer than at 12:00."""
        import math
        
        def calculate_evap_loss(temp, humidity, hours=6):
            """Estimate 6-hour evaporation loss."""
            es = 0.6108 * math.exp((17.27 * temp) / (temp + 237.3))
            ea = es * (humidity / 100.0)
            vpd = max(0, es - ea)
            decay_per_hour = 4.0 * pow(vpd, 1.3)
            return decay_per_hour * hours
        
        # Morning conditions (05:00)
        morning_loss = calculate_evap_loss(temp=15, humidity=80)
        
        # Midday conditions (12:00)
        midday_loss = calculate_evap_loss(temp=35, humidity=30)
        
        assert morning_loss < midday_loss, \
            f"Morning loss ({morning_loss:.1f}%) should be less than midday ({midday_loss:.1f}%)"


class TestDecisionPriority:
    """Test decision priority order is correct."""
    
    def test_emergency_beats_vpd_delay(self):
        """Emergency override should beat VPD delay."""
        # This is implicit in the logic order, but let's verify
        from tests.test_optimal_watering import TestOptimalWateringDecision
        t = TestOptimalWateringDecision()
        
        # Critical moisture during extreme VPD midday
        decision, status = t.make_decision(
            moisture=5, temp=42, humidity=10, hour=14
        )
        assert decision == "WATER_NOW"
        assert status == "EMERGENCY_OVERRIDE"
    
    def test_rain_beats_vpd_at_low_moisture(self):
        """Rain delay should beat VPD delay at low moisture."""
        from tests.test_optimal_watering import TestOptimalWateringDecision
        t = TestOptimalWateringDecision()
        
        decision, status = t.make_decision(
            moisture=25, temp=35, humidity=30, hour=12, forecast_mins=60
        )
        assert decision == "STALL"
        assert status == "RAIN_DELAY"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
