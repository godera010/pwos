"""
Simulated ESP32 Device
Mimics real ESP32 behavior without hardware
"""

import paho.mqtt.client as mqtt
import json
import time
import random
import numpy as np
import math
from datetime import datetime

class SimulatedESP32:
    def __init__(self, mqtt_broker, mqtt_port=1883):
        self.broker = mqtt_broker
        self.port = mqtt_port
        
        # Setup Logging
        import logging
        import os
        
        # Get project root (2 levels up from src/simulation/esp32_simulator.py)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
        log_dir = os.path.join(project_root, "logs", "sim")
        os.makedirs(log_dir, exist_ok=True)
            
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(os.path.join(log_dir, "esp32_simulator.log")),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("ESP32_Sim")
        
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "SimulatedESP32")
        
        # Simulation state
        self.soil_moisture = 60.0  # Starting at 60%
        self.temperature = 25.0    # 25°C
        self.humidity = 65.0       # 65%
        self.pump_active = False
        self.pump_start_time = datetime.now()
        self.pump_duration = 0
        self.last_watering = datetime.now()
        self.current_vpd = 0.0
        
        # Realistic behavior parameters
        self.moisture_decay_rate = 30.0  # % per hour (Accelerated for Demo)
        self.temp_variation = 3.0       # Daily temperature swing
        self.humidity_variation = 10.0  # Daily humidity swing
        
    
        self.current_weather = {"condition": "Clear", "rain_intensity": 0}
        
        # Setup MQTT callbacks
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def calculate_vpd(self, T, RH):
        """Calculate Vapor Pressure Deficit in kPa"""
        # Tetens formula for Saturation Vapor Pressure (es)
        es = 0.6108 * math.exp((17.27 * T) / (T + 237.3))
        # Actual Vapor Pressure (ea)
        ea = es * (RH / 100.0)
        return max(0.0, es - ea)
    
    def on_connect(self, client, userdata, flags, rc, properties):
        self.logger.info(f"Connected to MQTT Broker: {self.broker}")
        # Subscribe to topics
        client.subscribe("pwos/control/pump")
        client.subscribe("pwos/weather/current")
        self.logger.info("Subscribed to pwos/control/pump & pwos/weather/current")
    
    def on_message(self, client, userdata, msg):
        """Handle incoming messages"""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            
            if topic == "pwos/control/pump":
                action = payload.get('action', 'OFF')
                duration = payload.get('duration', 30)
                
                if action == 'ON':
                    self.activate_pump(duration)
                elif action == 'OFF':
                    if self.pump_active:
                        self.logger.info("PUMP STOPPED (Manual OFF command)")
                        self.pump_active = False
            
            elif topic == "pwos/weather/current":
                self.current_weather = payload
                # Log only significant weather changes or rain
                if payload.get('condition') == 'Rain':
                     self.logger.info(f"RAIN EVENT: Intensity {payload['rain_intensity']}%")
                
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")
    
    def activate_pump(self, duration):
        """Simulate pump activation (Non-blocking)"""
        # Duration 0 = indefinite manual mode (keeps running until explicit OFF)
        if duration <= 0:
            duration = 999999  # ~11.5 days — effectively indefinite

        # START Command
        if not self.pump_active:
            self.logger.info(f"PUMP ACTIVATED for {duration} seconds")
            self.pump_active = True
            self.pump_start_time = datetime.now()
            self.pump_duration = duration
            self.last_watering = datetime.now()
        
        # EXTEND Command
        else:
            self.logger.info(f"Pump already active, extending by {duration}s")
            self.pump_duration += duration
    
    def simulate_environmental_changes(self):
        """Simulate environment with realistic physics."""
        
        # --- 1. Time & Weather Setup ---
        # Use actual weather if available
        if self.current_weather.get('source') != 'unknown':
            self.temperature = float(self.current_weather.get('forecast_temp', 25.0))
            self.humidity = float(self.current_weather.get('forecast_humidity', 60.0))
            # Add slight sensor jitter
            self.temperature += random.uniform(-0.1, 0.1)
            self.humidity += random.uniform(-0.5, 0.5)
            
            sim_time_str = datetime.now().strftime("%H:%M")
        else:
            # Fallback Demo Mode (Time Warp)
            if not hasattr(self, 'sim_hour'): self.sim_hour = 6.0
            self.sim_hour += 0.5
            if self.sim_hour >= 24.0: self.sim_hour = 0.0
            
            # Simple physics for demo mode
            time_factor = ((self.sim_hour - 14) / 12.0) * math.pi
            self.temperature = 25.0 + (math.cos(time_factor) * 5.0) + random.uniform(-0.2, 0.2)
            self.humidity = 60.0 - ((self.temperature - 20) * 2.5) + random.uniform(-0.5, 0.5)
            
            hour_int = int(self.sim_hour)
            minute_int = int((self.sim_hour - hour_int) * 60)
            sim_time_str = f"{hour_int:02d}:{minute_int:02d}"

        # --- 2. Watering Logic (Gradual) ---
        if self.pump_active:
            elapsed = (datetime.now() - self.pump_start_time).total_seconds()
            
            if elapsed < self.pump_duration:
                # Pump is RUNNING
                # Add moisture gradually: ~0.4% per second with diminishing returns
                # Total for 30s = ~10-12% increase (realistic percolation)
                base_absorption = 0.4 
                
                # Diminishing returns near saturation (>85%)
                if self.soil_moisture > 85.0:
                    efficiency = max(0.1, 1.0 - ((self.soil_moisture - 85.0) / 15.0))
                    absorption_rate = base_absorption * efficiency
                else:
                    absorption_rate = base_absorption
                
                self.soil_moisture += absorption_rate
                if self.soil_moisture > 100: self.soil_moisture = 100
                
                # Log occasional updates during pumping
                if int(elapsed) % 5 == 0 and int(elapsed) > 0:
                     self.logger.debug(f"Pump Running: Moisture at {self.soil_moisture:.1f}%")
            else:
                # Pump Finished
                self.pump_active = False
                self.logger.info("PUMP DEACTIVATED (Duration Complete)")

        # --- 3. Drying Logic (Realistic VPD-Based Physics) ---
        else:
            # Only dry if pump is NOT running
            
            # Calculate VPD (Vapor Pressure Deficit) - Driving force of evaporation
            # Tetens formula: es = saturation vapor pressure at temp T
            es = 0.6108 * math.exp((17.27 * self.temperature) / (self.temperature + 237.3))
            ea = es * (self.humidity / 100.0)  # Actual vapor pressure
            vpd = max(0.0, es - ea)  # VPD in kPa
            
            # Store VPD for logging
            self.current_vpd = vpd
            
            # =====================================================
            # RAIN EFFECT ON SOIL MOISTURE
            # =====================================================
            # Rain directly adds water to soil. The effect depends on:
            # 1. Rain intensity (mm/hour)
            # 2. Soil absorption capacity  
            # 3. Current moisture level (near saturation = runoff)
            #
            # Typical rain intensities:
            # - Light rain: 0.5-2.5 mm/hr
            # - Moderate rain: 2.5-7.5 mm/hr
            # - Heavy rain: 7.5-50 mm/hr
            # - Storm: 50+ mm/hr
            #
            # Soil moisture gain approximation:
            # 1mm of rain ≈ 1-2% moisture increase (depends on soil)
            # =====================================================
            
            is_raining = (self.current_weather.get('condition') == 'Rain')
            rain_intensity = float(self.current_weather.get('rain_intensity', 0.0))  # 0-100 scale
            
            if is_raining and rain_intensity > 0.0:
                # Convert 0-100 intensity scale to mm/hour
                # 0 = no rain, 25 = light, 50 = moderate, 75 = heavy, 100 = storm
                mm_per_hour = (rain_intensity / 100.0) * 60.0  # Max 60 mm/hr (heavy storm)
                
                # Soil absorption rate: ~1.5% moisture per mm of rain
                MOISTURE_PER_MM = 1.5
                
                # Time scaling: 5 second ticks, 720 ticks per hour
                TICKS_PER_HOUR = 720
                
                # Calculate moisture gain per tick
                moisture_gain_per_hour = mm_per_hour * MOISTURE_PER_MM
                moisture_gain_per_tick = moisture_gain_per_hour / TICKS_PER_HOUR
                
                # Reduce evaporation during rain (VPD effect minimized)
                # Rain cools air, increases humidity → VPD drops
                rain_vpd_reduction = 0.9  # 90% reduction in evaporation during rain
                
                # Soil saturation limit (field capacity ~85%, saturation ~100%)
                FIELD_CAPACITY = 85.0
                SATURATION_LIMIT = 98.0
                
                # Apply rain absorption with diminishing returns near saturation
                if self.soil_moisture < FIELD_CAPACITY:
                    # Below field capacity: soil absorbs water efficiently
                    self.soil_moisture += moisture_gain_per_tick
                elif self.soil_moisture < SATURATION_LIMIT:
                    # Above field capacity: slower absorption (some runoff)
                    absorption_efficiency = 1.0 - ((self.soil_moisture - FIELD_CAPACITY) / 
                                                    (SATURATION_LIMIT - FIELD_CAPACITY))
                    self.soil_moisture += moisture_gain_per_tick * absorption_efficiency * 0.5
                # else: At saturation, excess rain runs off (no gain)
                
                # Minimal drying during rain (reduced VPD effect)
                vpd_during_rain = vpd * (1 - rain_vpd_reduction)
                minimal_decay = 0.01 * vpd_during_rain  # Negligible decay
                self.soil_moisture -= minimal_decay
                
                # Debug logging
                if random.random() < 0.02:
                    self.logger.debug(
                        f"RAIN: intensity={rain_intensity}%, mm/hr={mm_per_hour:.1f}, "
                        f"gain={moisture_gain_per_tick:.4f}%/tick, moisture={self.soil_moisture:.1f}%"
                    )
            else:
                # =====================================================
                # REALISTIC VPD-BASED DRYING
                # =====================================================
                # 
                # Real-world soil drying rates (research-based):
                # - At VPD 1.0 kPa: ~3-5% moisture loss per hour
                # - At VPD 2.0 kPa: ~6-10% moisture loss per hour  
                # - At VPD 0.5 kPa: ~1-2% moisture loss per hour
                #
                # Formula: decay_per_hour = BASE_RATE * VPD^POWER
                # 
                # With 5s interval, 720 ticks per hour.
                # To get 4% loss per hour at VPD=1.0:
                #   decay_per_tick = 4% / 720 = 0.0056%
                #
                # =====================================================
                
                # Config: Decay rate at VPD=1.0 kPa (% per hour)
                DECAY_PERCENT_PER_HOUR_AT_VPD_1 = 4.0
                
                # Power factor: >1 = steeper response to VPD
                VPD_POWER = 1.3  # High VPD dries faster-than-linear
                
                # Time scaling (5 second intervals -> 720 ticks/hour)
                TICKS_PER_HOUR = 720
                
                # Calculate decay
                vpd_factor = pow(vpd, VPD_POWER)  # Amplify high VPD effect
                decay_per_hour = DECAY_PERCENT_PER_HOUR_AT_VPD_1 * vpd_factor
                step_decay = decay_per_hour / TICKS_PER_HOUR
                
                # Apply decay
                self.soil_moisture -= step_decay
                
                # Debug logging (occasionally)
                if random.random() < 0.01:  # 1% of ticks
                    self.logger.debug(
                        f"VPD Decay: VPD={vpd:.2f}kPa, factor={vpd_factor:.2f}, "
                        f"decay/hr={decay_per_hour:.2f}%, step={step_decay:.4f}%"
                    )

        # Clamp limits
        self.soil_moisture = max(0.0, min(100.0, self.soil_moisture))
        
        return sim_time_str
    
    def read_sensors(self):
        """Simulate sensor readings"""
        sim_time = self.simulate_environmental_changes()
        
        return {
            'device_id': 'SIM_ESP32_001',
            'timestamp': datetime.now().isoformat(),
            'soil_moisture': round(self.soil_moisture, 2),
            'temperature': round(self.temperature, 2),
            'humidity': round(self.humidity, 2),
            'pump_active': self.pump_active,
            'vpc_demo_time': sim_time
        }
    
    def publish_sensor_data(self):
        """Publish sensor data to MQTT"""
        data = self.read_sensors()
        payload = json.dumps(data)
        
        result = self.client.publish("pwos/sensor/data", payload, qos=1)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            cond = self.current_weather.get('condition', 'Unknown')
            # Calculate VPD for display
            vpd = self.calculate_vpd(data['temperature'], data['humidity'])
            sim_time = data.get('vpc_demo_time', '00:00')
            
            self.logger.info(f"[{sim_time}] {cond} | VPD:{vpd:.2f}kPa | T:{data['temperature']}C H:{data['humidity']}% | M:{data['soil_moisture']}%")
            print(f"[{sim_time}] {cond} | VPD:{vpd:.2f}kPa | T:{data['temperature']}C H:{data['humidity']}% | M:{data['soil_moisture']}%")
        else:
            self.logger.error("Failed to publish data")
        
        return data
    
    def run(self, interval=60):
        """Main loop - simulates ESP32 operation"""
        self.logger.info("Starting Simulated ESP32...")
        self.logger.info(f"Publishing sensor data every {interval} seconds")
        print("\n[START] Starting Simulated ESP32...")
        print(f"[INFO] Publishing sensor data every {interval} seconds\n")
        
        # Connect to MQTT broker
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
        except Exception as e:
            self.logger.error(f"Failed to connect to MQTT broker: {e}")
            print(f"[ERROR] Failed to connect to MQTT broker: {e}")
            print("Make sure Mosquitto is running: mosquitto -v")
            return
        
        try:
            while True:
                self.publish_sensor_data()
                time.sleep(interval)
        except KeyboardInterrupt:
            self.logger.info("Stopping simulation...")
            print("\n[STOP] Stopping simulation...")
            self.client.loop_stop()
            self.client.disconnect()

if __name__ == "__main__":
    import sys
    
    # Configuration
    MQTT_BROKER = "localhost"  # Change to your broker address
    MQTT_PORT = 1883
    
    # Default interval 60s, or override with arg
    PUBLISH_INTERVAL = 60
    if len(sys.argv) > 1:
        try:
            PUBLISH_INTERVAL = int(sys.argv[1])
        except ValueError:
            print(f"[WARN] Invalid interval '{sys.argv[1]}', using default 60s")
    
    print("=" * 60)
    print("P-WOS Simulated ESP32 Device")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  MQTT Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  Publish Interval: {PUBLISH_INTERVAL}s")
    print(f"\nPress Ctrl+C to stop\n")
    print("=" * 60)
    
    # Create and run simulator
    esp32 = SimulatedESP32(MQTT_BROKER, MQTT_PORT)
    esp32.run(PUBLISH_INTERVAL)
