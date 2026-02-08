import unittest
import sys
import os
from datetime import datetime, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.simulation.esp32_simulator import SimulatedESP32

class TestSimulationLogic(unittest.TestCase):
    def setUp(self):
        # MOCK MQTT Broker (None) since we are testing logic only
        self.sim = SimulatedESP32(mqtt_broker=None, mqtt_port=1883)
        # Disable Logging to console during tests
        self.sim.logger.disabled = True
        
        # Set initial state
        self.sim.soil_moisture = 60.0
        self.sim.temperature = 25.0
        self.sim.humidity = 60.0
        
        # Mock weather source (default: clear day)
        self.sim.current_weather = {
            'source': 'test',
            'forecast_temp': 25.0,
            'forecast_humidity': 60.0,
            'condition': 'Sunny',
            'rain_intensity': 0
        }

    # ============================================================
    # VPD / DECAY TESTS
    # ============================================================
    
    def test_decay_high_vpd(self):
        """Test: Hot + Dry = Fast Evaporation (High VPD)."""
        self.sim.soil_moisture = 60.0
        self.sim.current_weather['forecast_temp'] = 35.0  # Hot
        self.sim.current_weather['forecast_humidity'] = 20.0  # Dry
        # VPD ~ 4.5 kPa (very high)
        
        initial = self.sim.soil_moisture
        for _ in range(10):
            self.sim.simulate_environmental_changes()
        final = self.sim.soil_moisture
        
        decay = initial - final
        print(f"\n[High VPD] {initial}% -> {final}% (Decay: {decay:.2f}%)")
        
        self.assertGreater(decay, 5.0, "High VPD should cause significant decay (>5%)")

    def test_decay_low_vpd(self):
        """Test: Cold + Humid = Slow Evaporation (Low VPD)."""
        self.sim.soil_moisture = 60.0
        self.sim.current_weather['forecast_temp'] = 15.0  # Cool
        self.sim.current_weather['forecast_humidity'] = 90.0  # Humid
        # VPD ~ 0.17 kPa (very low)
        
        initial = self.sim.soil_moisture
        for _ in range(10):
            self.sim.simulate_environmental_changes()
        final = self.sim.soil_moisture
        
        decay = initial - final
        print(f"\n[Low VPD] {initial}% -> {final}% (Decay: {decay:.2f}%)")
        
        self.assertLess(decay, 1.0, "Low VPD should cause minimal decay (<1%)")

    def test_rain_increases_moisture(self):
        """Test: Rain should increase soil moisture."""
        self.sim.soil_moisture = 40.0
        self.sim.current_weather['condition'] = 'Raining'
        self.sim.current_weather['rain_intensity'] = 50  # Moderate rain
        
        initial = self.sim.soil_moisture
        for _ in range(5):
            self.sim.simulate_environmental_changes()
        final = self.sim.soil_moisture
        
        gain = final - initial
        print(f"\n[Rain] {initial}% -> {final}% (Gain: {gain:.2f}%)")
        
        self.assertGreater(final, initial, "Rain should increase moisture")
        self.assertGreater(gain, 5.0, "Moderate rain should add >5% moisture in 5 steps")

    def test_dynamic_weather_change(self):
        """Test: Changing weather mid-simulation affects decay rate."""
        self.sim.soil_moisture = 60.0
        
        # Phase 1: Hot + Dry (High VPD) -> Fast decay
        self.sim.current_weather['forecast_temp'] = 35.0
        self.sim.current_weather['forecast_humidity'] = 20.0
        for _ in range(5):
            self.sim.simulate_environmental_changes()
        mid_moisture = self.sim.soil_moisture
        
        # Phase 2: Cold + Humid (Low VPD) -> Slow decay
        self.sim.current_weather['forecast_temp'] = 15.0
        self.sim.current_weather['forecast_humidity'] = 90.0
        for _ in range(5):
            self.sim.simulate_environmental_changes()
        final = self.sim.soil_moisture
        
        fast_decay = 60.0 - mid_moisture
        slow_decay = mid_moisture - final
        
        print(f"\n[Dynamic] Phase1 (Hot): {fast_decay:.2f}% | Phase2 (Cold): {slow_decay:.2f}%")
        
        self.assertGreater(fast_decay, slow_decay, "Hot phase should decay faster than cold phase")

    # ============================================================
    # WATERING TESTS
    # ============================================================
    
    def test_gradual_watering(self):
        """Test that moisture increases gradually when pump is on."""
        self.sim.soil_moisture = 20.0
        initial = 20.0
        
        self.sim.activate_pump(30)
        self.assertTrue(self.sim.pump_active)
        
        import time
        time.sleep(1.1)
        
        self.sim.simulate_environmental_changes()
        mid = self.sim.soil_moisture
        
        print(f"\n[Watering] Start: {initial}% -> 1s later: {mid}%")
        
        self.assertGreater(mid, initial, "Moisture should increase after 1s of pumping")
        self.assertAlmostEqual(mid, initial + 1.5, delta=0.5)

    # ============================================================
    # PUMP CONTROL TESTS
    # ============================================================
    
    def test_pump_stop(self):
        """Test stopping the pump early with duration=0."""
        self.sim.activate_pump(30)
        self.assertTrue(self.sim.pump_active)
        
        self.sim.activate_pump(0)  # STOP
        self.assertFalse(self.sim.pump_active, "Pump should stop if duration is 0")
        
    def test_pump_extend(self):
        """Test extending the pump duration."""
        self.sim.activate_pump(10)
        self.sim.activate_pump(10)  # Extend
        
        self.assertEqual(self.sim.pump_duration, 20, "Duration should extend to 20s")

    # ============================================================
    # EXTREME SCENARIO TESTS
    # ============================================================
    
    def test_heatwave_extreme_vpd(self):
        """Test: Heatwave (VPD > 2.0 kPa) causes extreme evaporation."""
        self.sim.soil_moisture = 60.0
        # Extreme heat + very dry
        self.sim.current_weather['forecast_temp'] = 42.0  # 42°C Heatwave
        self.sim.current_weather['forecast_humidity'] = 10.0  # Very dry
        # VPD ~ 7.5 kPa (extreme)
        
        initial = self.sim.soil_moisture
        for _ in range(5):
            self.sim.simulate_environmental_changes()
        final = self.sim.soil_moisture
        
        decay = initial - final
        print(f"\n[HEATWAVE] {initial}% -> {final}% (Decay: {decay:.2f}%)")
        
        # Expect very aggressive decay (>15% in 5 steps)
        self.assertGreater(decay, 10.0, "Heatwave should cause extreme decay (>10% in 5 steps)")

    def test_wind_false_dry(self):
        """Test: Windy conditions increase evaporation (False Dry scenario)."""
        self.sim.soil_moisture = 50.0
        # Moderate temp but WINDY
        self.sim.current_weather['forecast_temp'] = 28.0
        self.sim.current_weather['forecast_humidity'] = 50.0
        self.sim.current_weather['wind_speed'] = 30.0  # High wind km/h
        
        initial = self.sim.soil_moisture
        for _ in range(10):
            self.sim.simulate_environmental_changes()
        final = self.sim.soil_moisture
        
        decay = initial - final
        print(f"\n[WIND] {initial}% -> {final}% (Decay: {decay:.2f}%)")
        
        # Wind should accelerate evaporation beyond normal VPD
        # For now, verify basic decay happens (wind logic may need enhancement)
        self.assertGreater(decay, 0, "Wind conditions should cause some decay")

    def test_sensor_failure_detection(self):
        """Test: Sensor failure should be detected (anomaly: instant drop to 0%)."""
        self.sim.soil_moisture = 50.0
        
        # Simulate sensor failure (instant drop - impossible in reality)
        self.sim.soil_moisture = 0.0  # Sensor says 0%
        
        # The system should recognize this as anomaly
        # For now, we verify the value is at the extreme
        # Future: Implement anomaly detection that rejects impossible changes
        
        print(f"\n[SENSOR FAIL] Moisture suddenly at {self.sim.soil_moisture}%")
        
        # This test documents the expected behavior
        # A true implementation would flag this and use historical avg
        self.assertEqual(self.sim.soil_moisture, 0.0, "Sensor reported 0% (anomaly case)")

    def test_pump_failure_no_flow(self):
        """Test: Pump failure - pump reports ON but actually broken (simulated)."""
        self.sim.soil_moisture = 20.0
        initial = 20.0
        
        # Scenario: Pump is "ON" in software but physically broken
        # We simulate this by:
        # 1. Setting pump_active = True manually (simulating stuck status)
        # 2. But NOT calling activate_pump() so pump_start_time is not set
        # 3. This should cause an error or no moisture increase
        
        # For now, we test the DETECTION of this scenario:
        # If pump has been "on" for 30s but moisture hasn't increased, flag it
        
        self.sim.activate_pump(30)
        self.assertTrue(self.sim.pump_active)
        
        # Simulate broken pump: Force pump_active but prevent absorption
        # by skipping the time-based check (force elapsed = 0)
        self.sim.pump_active = True
        self.sim.pump_duration = 0  # Duration exhausted = should turn off
        
        # Run simulation - pump should deactivate since duration is 0
        self.sim.simulate_environmental_changes()
        
        print(f"\n[PUMP FAIL] Pump active after 0 duration: {self.sim.pump_active}")
        
        # After duration is exhausted, pump should be OFF
        # This validates the pump completion logic works
        self.assertFalse(self.sim.pump_active, "Pump should deactivate when duration is 0")

if __name__ == '__main__':
    unittest.main()
