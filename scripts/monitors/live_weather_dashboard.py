
import os
import sys
import time
import datetime
from os import system, name

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.backend.weather_api import weather_api

def clear_screen():
    # for windows
    if name == 'nt':
        _ = system('cls')
    # for mac and linux(here, os.name is 'posix')
    else:
        _ = system('clear')


import json
import paho.mqtt.client as mqtt

# Setup Logging
import logging
import os

# Get project root (2 levels up from scripts/monitors/live_weather_dashboard.py)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, '..', '..'))
log_dir = os.path.join(project_root, "logs", "app")
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, "weather_dashboard.log")),
        # No StreamHandler here to avoid messing up the dashboard TUI
    ]
)
logger = logging.getLogger("WeatherDash")

def print_dashboard():
    # Setup MQTT
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "WeatherCLI_Publisher")
    try:
        client.connect("localhost", 1883, 60)
        client.loop_start()
        logger.info("Connected to MQTT Broker")
    except:
        logger.warning("MQTT Broker not found (Simulation will use default weather)")
        print("[WARN] MQTT Broker not found (Simulation will use default weather)")

    while True:
        try:
            # Fetch Data
            forecast = weather_api.get_forecast()
            
            # Publish to MQTT for ESP32 Simulator
            try:
                payload = json.dumps(forecast)
                client.publish("pwos/weather/current", payload, retain=True)
            except Exception as e:
                pass # Silent fail on publish if broker issues

            # Format Data
            temp = forecast.get('forecast_temp', 0)
            humidity = forecast.get('forecast_humidity', 0)
            rain_minutes = forecast.get('forecast_minutes', 0)
            wind = forecast.get('wind_speed', 0)
            prob = forecast.get('precipitation_chance', 0)
            source = forecast.get('source', 'unknown')
            condition = forecast.get('condition', 'Unknown')
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            
            # Icon Logic (ASCII)
            weather_icon = "☀️"
            if prob > 50 or rain_minutes > 0:
                weather_icon = "🌧️"
            elif prob > 20:
                weather_icon = "☁️"
                
            # Clear & Print
            clear_screen()
            print("==================================================")
            print(f"   P-WOS LIVE WEATHER STATION  ({source.upper()})")
            print("==================================================")
            print(f"   Time: {timestamp}")
            print("--------------------------------------------------")
            print(f"   {weather_icon}  Condition:    {condition.upper()}")
            print(f"   🌡️  Temperature:  {temp:.1f} °C")
            print(f"   💧  Humidity:     {humidity:.1f} %")
            print(f"   🌬️  Wind Speed:   {wind:.1f} km/h")
            print("--------------------------------------------------")
            print("   RAIN FORECAST:")
            if rain_minutes > 0:
                hours = rain_minutes / 60
                print(f"   ⚠️  Rain starting in: {rain_minutes} min ({hours:.1f} hrs)")
            else:
                print(f"   ✅  No rain predicted for next 24h")
            
            print(f"   ☔  Precip Probability: {prob}%")
            print("   📡  Broadcast:    Sent to ESP32 Simulator")
            
            # Log key stats
            logger.info(f"Weather Update: {temp}C, {humidity}%, Rain Forecast: {rain_minutes}m")
            print("==================================================")
            print("   Press Ctrl+C to exit. Updating in 60s...")
            
            # Count down
            for i in range(60, 0, -1):
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("Dashboard stopped")
            print("\nExiting...")
            client.loop_stop()
            sys.exit(0)
        except Exception as e:
            logger.error(f"Error: {e}")
            print(f"\nError: {e}")
            time.sleep(10)

if __name__ == "__main__":
    logger.info("Initializing Weather Monitor...")
    print("Initializing Weather Monitor...")
    print_dashboard()
