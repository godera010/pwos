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
        
        # Weather state
        self.condition = "Sunny"  # Sunny, Cloudy, Raining
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
        if self.condition == "Sunny":
            if roll < 0.1: self.condition = "Cloudy"
        elif self.condition == "Cloudy":
            if roll < 0.1: self.condition = "Sunny"
            elif roll < 0.1 + rain_prob: self.condition = "Raining"
        elif self.condition == "Raining":
            if roll < 0.2: self.condition = "Cloudy"
            
        # Update parameters based on state
        if self.condition == "Sunny":
            self.rain_intensity = 0.0
            self.cloud_cover = random.uniform(0, 20)
        elif self.condition == "Cloudy":
            self.rain_intensity = 0.0
            self.cloud_cover = random.uniform(40, 90)
        elif self.condition == "Raining":
            self.rain_intensity = random.uniform(20, 100)
            self.cloud_cover = 100.0
            
        return {
            'timestamp': datetime.now().isoformat(),
            'condition': self.condition,
            'rain_intensity': round(self.rain_intensity, 1),
            'cloud_cover': round(self.cloud_cover, 1),
            'forecast_minutes': self._generate_forecast()  # Minutes until rain
        }
    
    def _generate_forecast(self):
        """Generate rain forecast (minutes until next rain)"""
        if self.condition == "Raining":
            return 0  # It's raining now
            
        # Simulate forecast logic
        # In a real system, this would come from OpenWeatherMap API
        # Here, we simulate "clouds gathering"
        if self.condition == "Cloudy":
            # 50% chance rain is coming soon (1-4 hours)
            if random.random() < 0.5:
                return random.randint(60, 240)
            else:
                return 0 # No rain expected
                
        # Sunny
        # Low chance of rain soon (10%)
        if random.random() < 0.1:
            return random.randint(180, 720) # 3-12 hours away
            
        return 0 # No rain expected
        
    def run(self):
        """Main simulation loop"""
        print(f"[START] Starting Weather Simulator...")
        print(f"[INFO] Connecting to {self.broker}:{self.port}")
        
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
            
            while True:
                data = self.generate_weather()
                
                # Publish weather update
                payload = json.dumps(data)
                self.client.publish("pwos/weather/current", payload, qos=1)
                
                print(f"[VS] Weather: {data['condition']} (Rain: {data['rain_intensity']}%) | Rain in: {data['forecast_minutes']}m")
                
                time.sleep(self.update_interval)
                
        except KeyboardInterrupt:
            print("\n[STOP] Stopping weather simulation...")
        except Exception as e:
            print(f"[ERROR] Error: {e}")
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
    print(f"[INFO] Weather update interval: {interval}s")
    sim.run()
