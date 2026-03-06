"""
Weather Simulator for P-WOS
Generates realistic weather patterns to influence the ESP32 simulation
"""

import paho.mqtt.client as mqtt
import json
import time
import random
import math
from datetime import datetime

class WeatherSimulator:
    def __init__(self, mqtt_broker="localhost", mqtt_port=1883):
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "WeatherSimulator")
        self.broker = mqtt_broker
        self.port = mqtt_port
        
        # Setup Logging
        import logging
        import os
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
        log_dir = os.path.join(project_root, "logs", "sim")
        os.makedirs(log_dir, exist_ok=True)
        
        self.logger = logging.getLogger("WeatherSim")
        if not self.logger.handlers:
            self.logger.setLevel(logging.INFO)
            fmt = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            fh = logging.FileHandler(os.path.join(log_dir, "weather_simulator.log"), encoding='utf-8')
            fh.setFormatter(fmt)
            ch = logging.StreamHandler()
            ch.setFormatter(fmt)
            self.logger.addHandler(fh)
            self.logger.addHandler(ch)
        
        # Weather state
        self.condition = "Clear"  # Clear, Clouds, Rain (matches OpenWeatherMap)
        self.rain_intensity = 0.0  # 0-100%
        self.cloud_cover = 0.0     # 0-100%
        self.wind_speed = 5.0      # km/h
        
        # Simulation parameters
        self.update_interval = 60  # seconds
        
    def generate_weather(self):
        """Generate realistic weather changes"""
        # Randomly change weather state occasionally
        roll = random.random()
        
        current_hour = datetime.now().hour
        
        # Higher chance of rain in afternoon/evening
        rain_prob = 0.1
        if 14 <= current_hour <= 19:
            rain_prob = 0.2
            
        # State transitions
        if self.condition == "Clear":
            if roll < 0.1: self.condition = "Clouds"
        elif self.condition == "Clouds":
            if roll < 0.1: self.condition = "Clear"
            elif roll < 0.1 + rain_prob: self.condition = "Rain"
        elif self.condition == "Rain":
            if roll < 0.2: self.condition = "Clouds"
            
        # Update parameters based on state
        if self.condition == "Clear":
            self.rain_intensity = 0.0
            self.cloud_cover = random.uniform(0, 20)
            # Drift with mean 0 to avoid sticking at max
            self.wind_speed = max(0, self.wind_speed + random.uniform(-2, 2))
            self.wind_speed = min(self.wind_speed, 30)
        elif self.condition == "Clouds":
            self.rain_intensity = 0.0
            self.cloud_cover = random.uniform(40, 90)
            self.wind_speed = max(0, self.wind_speed + random.uniform(-3, 3))
            self.wind_speed = min(self.wind_speed, 40)
        elif self.condition == "Rain":
            self.rain_intensity = random.uniform(20, 100)
            self.cloud_cover = 100.0
            self.wind_speed = max(0, self.wind_speed + random.uniform(-4, 4))
            self.wind_speed = min(self.wind_speed, 60)

        # Derive precipitation_chance from state
        if self.condition == "Rain":
            precipitation_chance = random.randint(80, 100)
        elif self.condition == "Clouds":
            precipitation_chance = random.randint(20, 60)
        else:
            precipitation_chance = random.randint(0, 10)
            
        # Simulate temperature based on condition
        if self.condition == "Clear":
            sim_temp = random.uniform(25, 35)
            sim_humidity = random.uniform(30, 55)
        elif self.condition == "Clouds":
            sim_temp = random.uniform(18, 28)
            sim_humidity = random.uniform(55, 80)
        elif self.condition == "Rain":
            sim_temp = random.uniform(14, 22)
            sim_humidity = random.uniform(80, 98)
        else:
            sim_temp = 25.0
            sim_humidity = 60.0

        return {
            'timestamp': datetime.now().isoformat(),
            'condition': self.condition,
            'temperature': round(sim_temp, 1),
            'humidity': round(sim_humidity, 1),
            'rain_intensity': round(self.rain_intensity, 1),
            'cloud_cover': round(self.cloud_cover, 1),
            'wind_speed': round(self.wind_speed, 1),
            'precipitation_chance': precipitation_chance,
            'forecast_minutes': self._generate_forecast()
        }
    
    def _generate_forecast(self):
        """Generate rain forecast (minutes until next rain)"""
        if self.condition == "Rain":
            return 0  # It's raining now
            
        # Simulate forecast logic
        # In a real system, this would come from OpenWeatherMap API
        # Here, we simulate "clouds gathering"
        if self.condition == "Clouds":
            # 50% chance rain is coming soon (1-4 hours)
            if random.random() < 0.5:
                return random.randint(60, 240)
            else:
                return 0 # No rain expected
                
        # Clear
        # Low chance of rain soon (10%)
        if random.random() < 0.1:
            return random.randint(180, 720) # 3-12 hours away
            
        return 0 # No rain expected
        
    def run(self):
        """Main simulation loop"""
        self.logger.info("Starting Weather Simulator...")
        self.logger.info(f"Connecting to {self.broker}:{self.port}")
        
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            
            while True:
                data = self.generate_weather()
                
                # Publish weather update
                payload = json.dumps(data)
                self.client.publish("pwos/weather/current", payload, qos=1)
                
                self.logger.info(f"Weather: {data['condition']} | Rain: {data['rain_intensity']}% | Wind: {data['wind_speed']}km/h | Chance: {data['precipitation_chance']}% | ETA: {data['forecast_minutes']}m")
                
                time.sleep(self.update_interval)
                
        except KeyboardInterrupt:
            self.logger.info("Stopping weather simulation...")
        except Exception as e:
            self.logger.error(f"Error: {e}")
        finally:
            self.client.loop_stop()
            self.client.disconnect()

if __name__ == "__main__":
    import sys
    
    interval = 60
    if len(sys.argv) > 1:
        try:
            interval = int(sys.argv[1])
        except ValueError:
            pass

    sim = WeatherSimulator()
    sim.update_interval = interval
    sim.logger.info(f"Weather update interval: {interval}s")
    sim.run()
