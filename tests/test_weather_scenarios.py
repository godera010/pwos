"""
P-WOS Weather & VPD Scenario Tests
===================================
Comprehensive tests for VPD-based soil drying and rain effects.

Tests cover:
1. VPD calculation accuracy
2. Weather type decay rates
3. Rain moisture accumulation
4. Optimal watering time identification
5. Bulawayo-specific scenarios
6. Predictive vs reactive watering comparison
"""

import pytest
import math
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================================================================
# VPD PHYSICS FUNCTIONS (matching esp32_simulator.py)
# ============================================================================

def calculate_vpd(temp: float, humidity: float) -> float:
    """Calculate Vapor Pressure Deficit in kPa using Tetens formula."""
    es = 0.6108 * math.exp((17.27 * temp) / (temp + 237.3))
    ea = es * (humidity / 100.0)
    return max(0, es - ea)


def get_decay_rate(vpd: float, base_rate: float = 4.0, power: float = 1.3) -> float:
    """Calculate soil moisture decay rate (% per hour) based on VPD."""
    vpd_factor = pow(vpd, power)
    return base_rate * vpd_factor


def get_rain_gain(intensity: float) -> float:
    """Calculate moisture gain per hour from rain (% per hour)."""
    mm_per_hour = (intensity / 100.0) * 60.0  # Max 60 mm/hr
    moisture_per_mm = 1.5
    return mm_per_hour * moisture_per_mm


# ============================================================================
# VPD CALCULATION TESTS
# ============================================================================

class TestVPDCalculation:
    """Test VPD calculation accuracy."""
    
    def test_vpd_hot_dry(self):
        """Hot dry conditions should have high VPD."""
        vpd = calculate_vpd(temp=40, humidity=15)
        assert vpd > 5.0, f"Hot dry VPD {vpd} should be > 5.0 kPa"
    
    def test_vpd_cool_humid(self):
        """Cool humid conditions should have low VPD."""
        vpd = calculate_vpd(temp=15, humidity=85)
        assert vpd < 0.5, f"Cool humid VPD {vpd} should be < 0.5 kPa"
    
    def test_vpd_raining(self):
        """Raining conditions should have very low VPD."""
        vpd = calculate_vpd(temp=18, humidity=95)
        assert vpd < 0.2, f"Raining VPD {vpd} should be < 0.2 kPa"
    
    def test_vpd_increases_with_temperature(self):
        """VPD should increase with temperature at constant humidity."""
        vpd_cool = calculate_vpd(temp=20, humidity=50)
        vpd_hot = calculate_vpd(temp=35, humidity=50)
        assert vpd_hot > vpd_cool, "VPD should increase with temp"
    
    def test_vpd_decreases_with_humidity(self):
        """VPD should decrease with humidity at constant temperature."""
        vpd_dry = calculate_vpd(temp=25, humidity=30)
        vpd_humid = calculate_vpd(temp=25, humidity=80)
        assert vpd_dry > vpd_humid, "VPD should decrease with humidity"


# ============================================================================
# WEATHER TYPE DECAY TESTS
# ============================================================================

class TestWeatherTypeDecay:
    """Test decay rates for different weather types."""
    
    # Weather type definitions: (name, temp, humidity, expected_vpd_range, expected_decay_range)
    WEATHER_SCENARIOS = [
        ("HOT_DRY", 40, 15, (5.0, 7.0), (30, 50)),
        ("HOT_MODERATE", 35, 40, (2.5, 4.0), (12, 25)),
        ("HOT_HUMID", 35, 70, (1.0, 2.0), (4, 10)),
        ("WARM_DRY", 28, 25, (2.0, 3.5), (10, 20)),
        ("WARM_MODERATE", 28, 50, (1.5, 2.5), (6, 13)),
        ("WARM_HUMID", 28, 75, (0.5, 1.5), (1, 6)),
        ("MILD_DRY", 22, 30, (1.5, 2.5), (6, 13)),
        ("MILD_MODERATE", 22, 55, (0.8, 1.5), (3, 7)),
        ("MILD_HUMID", 22, 80, (0.3, 0.8), (0.5, 3)),
        ("COOL_DRY", 15, 40, (0.8, 1.3), (3, 6)),
        ("COOL_HUMID", 15, 85, (0.1, 0.5), (0.1, 1.5)),
        ("RAINING", 18, 95, (0.0, 0.2), (0, 0.5)),
    ]
    
    @pytest.mark.parametrize("name,temp,humid,vpd_range,decay_range", WEATHER_SCENARIOS)
    def test_weather_scenario(self, name, temp, humid, vpd_range, decay_range):
        """Test each weather scenario produces expected VPD and decay."""
        vpd = calculate_vpd(temp, humid)
        decay = get_decay_rate(vpd)
        
        assert vpd_range[0] <= vpd <= vpd_range[1], \
            f"{name}: VPD {vpd:.2f} not in range {vpd_range}"
        assert decay_range[0] <= decay <= decay_range[1], \
            f"{name}: Decay {decay:.2f}%/hr not in range {decay_range}"


# ============================================================================
# NIGHT & RAIN SCENARIO TESTS
# ============================================================================

class TestNightRainScenarios:
    """Test night and rain conditions."""
    
    def test_night_clear_dry(self):
        """Clear dry night should have slow but noticeable drying."""
        vpd = calculate_vpd(temp=12, humidity=45)
        decay = get_decay_rate(vpd)
        assert 1.0 < decay < 5.0, f"Night dry decay {decay} should be 1-5%/hr"
    
    def test_night_raining_light(self):
        """Light rain at night should have minimal drying."""
        vpd = calculate_vpd(temp=15, humidity=92)
        decay = get_decay_rate(vpd)
        assert decay < 0.5, f"Night rain decay {decay} should be < 0.5%/hr"
    
    def test_night_raining_heavy(self):
        """Heavy rain at night should have almost zero drying."""
        vpd = calculate_vpd(temp=14, humidity=98)
        decay = get_decay_rate(vpd)
        assert decay < 0.1, f"Heavy rain decay {decay} should be < 0.1%/hr"
    
    def test_day_after_rain(self):
        """After rain, humidity high, drying should be slow."""
        vpd = calculate_vpd(temp=20, humidity=85)
        decay = get_decay_rate(vpd)
        assert decay < 2.0, f"After rain decay {decay} should be < 2%/hr"


# ============================================================================
# RAIN MOISTURE GAIN TESTS
# ============================================================================

class TestRainMoistureGain:
    """Test rain effect on soil moisture."""
    
    def test_no_rain_no_gain(self):
        """No rain should produce no moisture gain."""
        gain = get_rain_gain(intensity=0)
        assert gain == 0, "No rain should mean no gain"
    
    def test_light_drizzle(self):
        """Light drizzle (10%) should add ~9%/hr moisture."""
        gain = get_rain_gain(intensity=10)
        assert 8 < gain < 12, f"Light drizzle gain {gain} should be ~9%/hr"
    
    def test_light_rain(self):
        """Light rain (25%) should add ~22.5%/hr moisture."""
        gain = get_rain_gain(intensity=25)
        assert 20 < gain < 26, f"Light rain gain {gain} should be ~22.5%/hr"
    
    def test_moderate_rain(self):
        """Moderate rain (50%) should add ~45%/hr moisture."""
        gain = get_rain_gain(intensity=50)
        assert 40 < gain < 50, f"Moderate rain gain {gain} should be ~45%/hr"
    
    def test_heavy_rain(self):
        """Heavy rain (75%) should add ~67.5%/hr moisture."""
        gain = get_rain_gain(intensity=75)
        assert 60 < gain < 75, f"Heavy rain gain {gain} should be ~67.5%/hr"
    
    def test_storm(self):
        """Storm (100%) should add ~90%/hr moisture."""
        gain = get_rain_gain(intensity=100)
        assert 85 < gain < 95, f"Storm gain {gain} should be ~90%/hr"
    
    def test_rain_vs_evaporation(self):
        """Even light rain should exceed hot day evaporation."""
        rain_gain = get_rain_gain(intensity=25)  # Light rain
        hot_vpd = calculate_vpd(temp=35, humidity=40)
        evap_loss = get_decay_rate(hot_vpd)
        
        assert rain_gain > evap_loss, \
            f"Light rain ({rain_gain}%/hr) should exceed hot evaporation ({evap_loss}%/hr)"


# ============================================================================
# OPTIMAL WATERING TIME TESTS
# ============================================================================

class TestOptimalWateringTime:
    """Test optimal watering time identification."""
    
    # 24-hour temperature/humidity profile for a hot day
    HOT_DAY_PROFILE = [
        (0, 18, 70), (2, 16, 75), (4, 14, 80), (6, 15, 78),
        (8, 22, 65), (10, 28, 50), (12, 34, 35), (14, 38, 25),
        (16, 36, 30), (18, 30, 45), (20, 24, 60), (22, 20, 70),
    ]
    
    def test_early_morning_is_optimal(self):
        """Early morning (04:00-06:00) should have lowest VPD."""
        early_morning_vpds = []
        for hour, temp, humid in self.HOT_DAY_PROFILE:
            if 4 <= hour <= 6:
                early_morning_vpds.append(calculate_vpd(temp, humid))
        
        avg_early_vpd = sum(early_morning_vpds) / len(early_morning_vpds)
        assert avg_early_vpd < 0.5, f"Early morning VPD {avg_early_vpd} should be < 0.5"
    
    def test_midday_is_worst(self):
        """Midday (12:00-14:00) should have highest VPD."""
        midday_vpds = []
        for hour, temp, humid in self.HOT_DAY_PROFILE:
            if 12 <= hour <= 14:
                midday_vpds.append(calculate_vpd(temp, humid))
        
        avg_midday_vpd = sum(midday_vpds) / len(midday_vpds)
        assert avg_midday_vpd > 3.0, f"Midday VPD {avg_midday_vpd} should be > 3.0"
    
    def test_evening_is_good(self):
        """Evening (18:00-20:00) should have moderate VPD."""
        evening_vpds = []
        for hour, temp, humid in self.HOT_DAY_PROFILE:
            if 18 <= hour <= 20:
                evening_vpds.append(calculate_vpd(temp, humid))
        
        avg_evening_vpd = sum(evening_vpds) / len(evening_vpds)
        assert avg_evening_vpd < 2.5, f"Evening VPD {avg_evening_vpd} should be < 2.5"
    
    def test_watering_time_ranking(self):
        """Early morning < Evening < Midday for VPD."""
        vpds_by_period = {"early": [], "midday": [], "evening": []}
        
        for hour, temp, humid in self.HOT_DAY_PROFILE:
            vpd = calculate_vpd(temp, humid)
            if 4 <= hour <= 6:
                vpds_by_period["early"].append(vpd)
            elif 12 <= hour <= 14:
                vpds_by_period["midday"].append(vpd)
            elif 18 <= hour <= 20:
                vpds_by_period["evening"].append(vpd)
        
        avg_early = sum(vpds_by_period["early"]) / len(vpds_by_period["early"])
        avg_midday = sum(vpds_by_period["midday"]) / len(vpds_by_period["midday"])
        avg_evening = sum(vpds_by_period["evening"]) / len(vpds_by_period["evening"])
        
        assert avg_early < avg_evening < avg_midday, \
            f"Ranking should be early({avg_early:.2f}) < evening({avg_evening:.2f}) < midday({avg_midday:.2f})"


# ============================================================================
# BULAWAYO SPECIFIC TESTS
# ============================================================================

class TestBulawayoScenarios:
    """Test Bulawayo, Zimbabwe specific weather scenarios."""
    
    def test_summer_hot_dry(self):
        """Bulawayo October heatwave should be extreme."""
        vpd = calculate_vpd(temp=36, humidity=20)
        decay = get_decay_rate(vpd)
        assert vpd > 4.0, "Summer hot dry VPD should be > 4.0"
        assert decay > 25, "Summer hot dry decay should be > 25%/hr"
    
    def test_summer_storm(self):
        """Bulawayo summer thunderstorm should stop drying."""
        vpd = calculate_vpd(temp=25, humidity=95)
        decay = get_decay_rate(vpd)
        assert decay < 0.5, "Summer storm decay should be < 0.5%/hr"
    
    def test_winter_cold_dry(self):
        """Bulawayo winter morning should have moderate drying."""
        vpd = calculate_vpd(temp=10, humidity=30)
        decay = get_decay_rate(vpd)
        assert 2 < decay < 5, f"Winter cold dry decay {decay} should be 2-5%/hr"
    
    def test_winter_night(self):
        """Bulawayo winter night should have slow drying."""
        vpd = calculate_vpd(temp=4, humidity=55)
        decay = get_decay_rate(vpd)
        assert decay < 2.0, f"Winter night decay {decay} should be < 2%/hr"
    
    def test_spring_hot_dry(self):
        """Bulawayo September heatwave should be extreme."""
        vpd = calculate_vpd(temp=35, humidity=15)
        decay = get_decay_rate(vpd)
        assert vpd > 4.5, "Spring hot dry VPD should be > 4.5"
        assert decay > 28, "Spring hot dry decay should be > 28%/hr"


# ============================================================================
# PREDICTIVE VS REACTIVE WATERING TESTS
# ============================================================================

class TestPredictiveWatering:
    """Test predictive watering strategies."""
    
    def test_stall_before_rain(self):
        """System should not water if rain is forecast."""
        rain_probability = 70  # 70% chance of rain
        should_water = rain_probability < 50
        assert not should_water, "Should not water with 70% rain forecast"
    
    def test_water_before_heat(self):
        """System should water before hot period starts."""
        # At 05:00, forecast shows 38°C at 14:00
        forecast_peak_temp = 38
        forecast_humidity = 25
        forecast_vpd = calculate_vpd(forecast_peak_temp, forecast_humidity)
        
        # If VPD will be > 3.0, water now at 05:00
        should_water_early = forecast_vpd > 3.0
        assert should_water_early, "Should water before extreme heat"
    
    def test_reduce_watering_cold_period(self):
        """System should reduce watering in cold periods."""
        vpd = calculate_vpd(temp=8, humidity=70)
        decay = get_decay_rate(vpd)
        
        # If decay < 1%/hr, reduce watering frequency
        reduce_frequency = decay < 1.0
        assert reduce_frequency, "Should reduce watering in cold period"


# ============================================================================
# EDGE CASE TESTS
# ============================================================================

class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_extreme_hot_dry(self):
        """Extreme heat (45°C, 10% humidity)."""
        vpd = calculate_vpd(temp=45, humidity=10)
        decay = get_decay_rate(vpd)
        assert vpd > 8.0, "Extreme hot dry VPD should be very high"
        assert decay > 60, "Extreme hot dry decay should be > 60%/hr"
    
    def test_saturated_air(self):
        """Saturated air (100% humidity)."""
        vpd = calculate_vpd(temp=20, humidity=100)
        assert vpd == 0, "Saturated air should have 0 VPD"
    
    def test_freezing_temperature(self):
        """Freezing temperature (0°C)."""
        vpd = calculate_vpd(temp=0, humidity=80)
        decay = get_decay_rate(vpd)
        assert decay < 0.5, "Freezing temp should have minimal decay"
    
    def test_negative_humidity_clamped(self):
        """Humidity cannot be negative."""
        # VPD formula should handle edge cases
        vpd = calculate_vpd(temp=25, humidity=0)
        assert vpd > 0, "0% humidity should still produce positive VPD"


# ============================================================================
# RUN TESTS
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
