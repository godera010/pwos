
import sys
import os
import sqlite3
import random
from datetime import datetime, timedelta
import paho.mqtt.client as mqtt # Mocking this

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.simulation.esp32_simulator import SimulatedESP32

# Mock MQTT Client to avoid networking during generation
class MockMQTTClient:
    def __init__(self, *args):
        self.on_connect = None
        self.on_message = None
        pass
    def connect(self, *args): pass
    def loop_start(self): pass
    def loop_stop(self): pass
    def disconnect(self): pass
    def publish(self, topic, payload, qos=0): 
        class Result:
            rc = 0
        return Result()
    def subscribe(self, *args): pass

# Start Patching
import src.simulation.esp32_simulator

# 1. Mock MQTT
src.simulation.esp32_simulator.mqtt.Client = MockMQTTClient
# 2. Mock Sleep
src.simulation.esp32_simulator.time.sleep = lambda x: None

# 3. Custom ESP32 for Generation
class GeneratorESP32(SimulatedESP32):
    def calculate_vpd(self, T, RH):
        # Tetens formula
        es = 0.6108 * src.simulation.esp32_simulator.math.exp((17.27 * T) / (T + 237.3))
        ea = es * (RH / 100.0)
        return max(0, es - ea)

    def simulate_environmental_changes(self):
        # Fully Re-implemented for 1-minute steps
        
        # 1. Physics (Temp/Humid) - Keep it roughly constant or evolving?
        # The parent logic for Temp/Humid is based on sim_hour.
        # We manually update sim_hour in the main loop of DataGenerator.
        # So we can effectively reuse the math from parent if we just copy it 
        # OR we can believe the parent's math for T/H is fine if sim_hour is correct.
        
        # Let's simple-model T/H based on self.sim_hour which is updated externally
        import math
        import random
        
        # Solar/Temp
        time_factor = ((self.sim_hour - 14) / 12.0) * math.pi
        base_temp = 25.0
        temp_cycle = math.cos(time_factor) * 5.0 
        
        weather_cooling = 0
        if self.current_weather.get('condition') == 'Raining':
            weather_cooling = 4.0
        elif self.current_weather.get('condition') == 'Cloudy':
            weather_cooling = 1.5
            
        self.temperature = base_temp + temp_cycle - weather_cooling
        self.temperature += random.uniform(-0.1, 0.1) # Less jitter

        # Humidity
        base_humidity = 60.0
        humid_cycle = -(self.temperature - 20) * 2.5
        
        weather_humid_boost = 0
        if self.current_weather.get('condition') == 'Raining':
            weather_humid_boost = 30.0
        elif self.current_weather.get('condition') == 'Cloudy':
            weather_humid_boost = 10.0
            
        self.humidity = base_humidity + humid_cycle + weather_humid_boost
        self.humidity = max(20, min(100, self.humidity))

        # 2. Moisture Decay (VPD Driver)
        vpd = self.calculate_vpd(self.temperature, self.humidity)
        
        decay_factor = 2.0 
        
        if self.current_weather.get('condition') == 'Raining':
            intensity = self.current_weather.get('rain_intensity', 0)
            gain = (intensity / 100.0) * 10.0 
            # Scale gain for 1 minute?
            # Original code: gain per "step" (30 mins).
            # So per minute = gain / 30?
            self.soil_moisture += (gain / 30.0)
            self.moisture_decay_rate = 0
        else:
            self.moisture_decay_rate = vpd * decay_factor
            # Scale decay for 1 minute
            # Original: subtraction was per 30 mins (implicitly)
            # Rate is "per hour" sort of.
            # Let's say Rate=5. In 1 hour, drops 5%.
            # So per minute, drops 5/60.
            self.soil_moisture -= (self.moisture_decay_rate / 60.0)

        self.soil_moisture = max(0, min(100, self.soil_moisture))
        
        return "00:00"

class DataGenerator:
    def __init__(self):
        # 3 levels up: src/simulation -> src -> pwos
        self.db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'data', 'pwos_simulation.db')
        print(f"[INFO] DB Path: {self.db_path}")
        
        # Initialize Simulator
        self.esp32 = GeneratorESP32("mock_broker")
        self.esp32.moisture_decay_rate = 30.0 # Match the code default
        
        # Simulation Parameters
        self.start_date = datetime.now() - timedelta(days=90) # 3 months ago
        self.current_time = self.start_date
        self.interval = 15 # minutes per step
        
        # Weather State
        self.weather_state = "Sunny"
        self.rain_duration = 0
        self.time_since_rain = 0
        
    def setup_database(self):
        """Reset database for fresh data"""
        # if os.path.exists(self.db_path):
        #    try:
        #        os.remove(self.db_path)
        #    except:
        #        pass
            
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute("DROP TABLE IF EXISTS sensor_readings")
        c.execute("DROP TABLE IF EXISTS watering_events")

        
        # Sensor Table
        c.execute('''CREATE TABLE IF NOT EXISTS sensor_readings
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      timestamp TEXT,
                      soil_moisture REAL,
                      temperature REAL,
                      humidity REAL,
                      device_id TEXT,
                      forecast_minutes INTEGER DEFAULT 0)''')
                      
        # Watering Table
        c.execute('''CREATE TABLE IF NOT EXISTS watering_events
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      timestamp TEXT,
                      duration_seconds INTEGER,
                      trigger_type TEXT,
                      moisture_before REAL,
                      moisture_after REAL)''')
        
        conn.commit()
        conn.close()
        print(f"[INFO] Database reset: {self.db_path}")

    def update_weather(self):
        """Simple weather logic"""
        # Randomly change weather
        roll = random.random()
        
        hour = self.current_time.hour
        month = self.current_time.month
        
        # Seasonality (Simple)
        rain_prob = 0.05
        if month in [4, 5, 10, 11]: # Rainy months
            rain_prob = 0.15
            
        # Diurnal (Afternoon rain)
        if 14 <= hour <= 18:
            rain_prob *= 2.0
            
        if self.weather_state == "Sunny":
            if roll < rain_prob:
                self.weather_state = "Raining"
                self.rain_duration = random.randint(1, 4) * (60/self.interval) # 1-4 hours
        
        elif self.weather_state == "Raining":
            self.rain_duration -= 1
            if self.rain_duration <= 0:
                self.weather_state = "Sunny"
                
        # Update simulator weather
        condition = "Raining" if self.weather_state == "Raining" else "Sunny"
        intensity = random.randint(20, 80) if self.weather_state == "Raining" else 0
        
        self.esp32.current_weather = {
            "condition": condition,
            "rain_intensity": intensity
        }
        
    def run(self):
        self.setup_database()
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        steps = int(90 * 24 * (60/self.interval)) # 90 days of steps
        print(f"[GEN] Generating {steps} steps ({self.interval} min interval)...")
        
        # Sync simulator hour
        self.esp32.sim_hour = self.start_date.hour + (self.start_date.minute / 60.0)
        
        for i in range(steps):
            # 1. Update Real Time
            self.current_time += timedelta(minutes=self.interval)
            
            # 2. Update Weather
            self.update_weather()
            
            # 3. Step Physics (SimulatedESP32 expects 1 call = 30 virtual mins usually, but we are hacking it)
            # The simulator logic adds 0.5 hours per call. 
            # We need to sync this. 
            # Actually, let's override the time logic in the loop 
            # and just iterate the physics.
            
            # Manual Time Sync for Simulator
            minute_fraction = self.current_time.minute / 60.0
            self.esp32.sim_hour = self.current_time.hour + minute_fraction
            
            # Call physics (ignoring its internal time step increment)
            # We need to call it multiple times if interval is large? 
            # Or assume physics is effectively instantaneous rate-based?
            # The simulator subtracts (decay / 60) per call. 
            # We are stepping 15 mins. So we should call it 15 times? 
            # Or just adjust the decay math. 
            # Let's call it 15 times for accuracy of logic
            
            for _ in range(self.interval):
                self.esp32.simulate_environmental_changes()
                # Correct the time which simulate_environmental_changes increments
                # We want to control time strictly
                self.esp32.sim_hour = self.current_time.hour + minute_fraction # Reset drift
            
            # 4. Check for Watering (Reactive Logic for Training Data)
            # We want the model to learn "When low, water happens".
            if self.esp32.soil_moisture < 35.0: # Threshold
                 # Water!
                 duration = 30
                 # Apply water
                 self.esp32.activate_pump(duration)
                 
                 # Record Event
                 cursor.execute("INSERT INTO watering_events (timestamp, duration_seconds, trigger_type, moisture_before, moisture_after) VALUES (?, ?, ?, ?, ?)",
                                (self.current_time.strftime("%Y-%m-%d %H:%M:%S"), duration, "THRESHOLD", self.esp32.soil_moisture - (duration*0.5), self.esp32.soil_moisture))
            
            # 5. Record Sensor Data
            # Generate Forecast (Simple: Rain coming in X mins?)
            forecast_minutes = 0
            if self.weather_state == "Sunny":
                 # Random chance failing prediction
                 if random.random() < 0.05:
                     forecast_minutes = random.randint(30, 180) 
            
            cursor.execute("INSERT INTO sensor_readings (timestamp, soil_moisture, temperature, humidity, device_id, forecast_minutes) VALUES (?, ?, ?, ?, ?, ?)",
                           (self.current_time.strftime("%Y-%m-%d %H:%M:%S"), 
                            round(self.esp32.soil_moisture, 2), 
                            round(self.esp32.temperature, 2), 
                            round(self.esp32.humidity, 2), 
                            "GEN_001",
                            forecast_minutes))
            
            if i % 1000 == 0:
                print(f"   Step {i}/{steps} | {self.current_time} | M:{self.esp32.soil_moisture:.1f}%")
                
        conn.commit()
        conn.close()
        print("[DONE] Data Generation Complete.")

if __name__ == "__main__":
    gen = DataGenerator()
    gen.run()
