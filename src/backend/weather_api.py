"""
P-WOS Weather API Module
Fetches real weather data from OpenWeatherMap API.
Falls back to simulation if API is unavailable.
"""
import logging
import os
import sys
import requests
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from log_config import setup_logger
logger = setup_logger("WeatherAPI", "weather_api.log", "app")

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import (
    WEATHER_API_MODE,
    OPENWEATHERMAP_API_KEY,
    WEATHER_LATITUDE,
    WEATHER_LONGITUDE
)


class WeatherAPI:
    """Fetches weather forecasts from OpenWeatherMap or simulation."""
    
    BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"
    CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
    
    def __init__(self):
        self.mode = WEATHER_API_MODE
        self.api_key = OPENWEATHERMAP_API_KEY
        self.lat = WEATHER_LATITUDE
        self.lon = WEATHER_LONGITUDE
        self._cache = None
        self._cache_time = None
        self._cache_duration = 600  # 10 minutes
        self._api_was_down = False  # Track recovery state
        self._last_error_log = None  # Track when we last logged an API error
        
        # MQTT for Simulation
        self._latest_sim_weather = None
        self._setup_mqtt_listener()

    def _setup_mqtt_listener(self):
        """Listen to Simulator for offline weather data."""
        try:
            import paho.mqtt.client as mqtt
            import json
            import threading

            def on_message(client, userdata, msg):
                try:
                    payload = json.loads(msg.payload.decode())
                    self._latest_sim_weather = payload
                except:
                    pass

            import random
            client_id = f"WeatherAPI_Listener_{random.randint(1000, 9999)}"
            self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id)
            self.mqtt_client.on_message = on_message
            self.mqtt_client.connect("localhost", 1883, 60)
            self.mqtt_client.subscribe("pwos/weather/current")
            self.mqtt_client.loop_start()
        except Exception as e:
            logger.warning(f"Weather Simulator Connection Failed: {e}")

    def get_forecast(self) -> dict:
        """
        Get weather forecast.
        Returns dict with rain_forecast_minutes, temperature, humidity.
        """
        if self.mode == "openweathermap":
            return self._fetch_openweathermap()
        else:
            return self._simulate_weather()
    
    def _fetch_openweathermap(self) -> dict:
        """Fetch real weather data from OpenWeatherMap API."""
        # Check cache (fresh)
        now = datetime.now(timezone.utc)
        if self._cache and self._cache_time:
            age = (now - self._cache_time).total_seconds()
            # Standard 10 min cache for success, 60 seconds cooldown for failures
            valid_duration = self._cache_duration if self._cache.get("source") == "openweathermap" else 60
            if age < valid_duration:
                return self._cache
        
        try:
            params = {
                "lat": self.lat,
                "lon": self.lon,
                "appid": self.api_key,
                "units": "metric"
            }
            # Shorten timeout from 10s to 5s to prevent massive thread locks
            # 1. Fetch Current Weather for precise "NOW" metrics
            curr_response = requests.get(self.CURRENT_URL, params=params, timeout=5)
            curr_response.raise_for_status()
            curr_data = curr_response.json()

            # 2. Fetch Forecast for rain prediction
            forecast_response = requests.get(self.BASE_URL, params=params, timeout=5)
            forecast_response.raise_for_status()
            forecast_data = forecast_response.json()
            
            # If we just recovered, log the good news!
            if getattr(self, '_api_was_down', False):
                logger.info("✅ OpenWeatherMap API Connection Restored!")
                self._api_was_down = False
                
            result = self._parse_combined_data(curr_data, forecast_data)
            self._cache = result
            self._cache_time = now
            return result
            
        except Exception as e:
            # P2: Re-log every 5 minutes while API is down (not just the first failure)
            now = datetime.now(timezone.utc)
            should_log = (
                not self._api_was_down or
                self._last_error_log is None or
                (now - self._last_error_log).total_seconds() > 300
            )
            if should_log:
                logger.warning(f"OpenWeatherMap API Error: {e}")
                logger.info("Using simulator weather data as fallback")
                self._last_error_log = now
            self._api_was_down = True
            
            # Fallback to simulator and cache it so we don't spam the broken API 
            result = self._simulate_weather()
            self._cache = result
            self._cache_time = now
            return result
            
    def _parse_combined_data(self, curr_data: dict, forecast_data: dict) -> dict:
        """Parse Current and Forecast data into unified format."""
        # 1. Parse Current Data (Most Accurate for NOW)
        current_temp = curr_data.get("main", {}).get("temp", 25.0)
        current_hum = curr_data.get("main", {}).get("humidity", 60.0)
        wind_speed_kmh = curr_data.get("wind", {}).get("speed", 0) * 3.6
        condition = curr_data.get("weather", [{}])[0].get("main", "Clear")
        cloud_cover = curr_data.get("clouds", {}).get("all", 0.0)

        # 2. Parse Forecast for future rain
        rain_minutes = 0
        precip_prob = 0
        rain_intensity = 0.0
        
        if forecast_data.get("list"):
            first_forecast = forecast_data["list"][0]
            precip_prob = int(first_forecast.get("pop", 0) * 100)
            
            if "rain" in first_forecast:
                rain_mm = first_forecast["rain"].get("3h", 0)
                rain_intensity = min(100, rain_mm * 20)

            # Search for first rain event in timeline
            for forecast in forecast_data.get("list", []):
                dt = datetime.fromtimestamp(forecast["dt"], tz=timezone.utc)
                weather_main = forecast["weather"][0]["main"].lower()
                if weather_main in ["rain", "drizzle", "thunderstorm"]:
                    now = datetime.now(timezone.utc)
                    diff_minutes = int((dt - now).total_seconds() / 60)
                    if diff_minutes > 0:
                        rain_minutes = diff_minutes
                        break
        
        return {
            "forecast_minutes": rain_minutes,
            "forecast_temp": current_temp,
            "forecast_humidity": current_hum,
            "wind_speed": round(wind_speed_kmh, 1),
            "precipitation_chance": precip_prob,
            "rain_intensity": round(rain_intensity, 1),
            "cloud_cover": round(cloud_cover, 1),
            "condition": condition,
            "source": "openweathermap",
            "timestamp": datetime.now().isoformat()
        }
    
    def _simulate_weather(self) -> dict:
        """Get weather from Simulator (MQTT) in unified format."""
        if self._latest_sim_weather:
            # Handle both weather_simulator.py (temperature) and live_weather_dashboard.py fallback (forecast_temp)
            temp = self._latest_sim_weather.get('forecast_temp') or self._latest_sim_weather.get('temperature', 25.0)
            hum = self._latest_sim_weather.get('forecast_humidity') or self._latest_sim_weather.get('humidity', 60.0)
            
            return {
                "forecast_minutes": self._latest_sim_weather.get('forecast_minutes', 0),
                "forecast_temp": temp,
                "forecast_humidity": hum,
                "wind_speed": self._latest_sim_weather.get('wind_speed', 0.0),
                "precipitation_chance": self._latest_sim_weather.get('precipitation_chance', 0),
                "rain_intensity": self._latest_sim_weather.get('rain_intensity', 0.0),
                "cloud_cover": self._latest_sim_weather.get('cloud_cover', 0.0),
                "condition": self._latest_sim_weather.get('condition', 'unknown'),
                "source": self._latest_sim_weather.get('source', 'simulation'),
                "timestamp": datetime.now().isoformat()
            }
        
        # Safe Fallback if Simulator is not running
        return {
            "forecast_minutes": 0,
            "forecast_temp": 25.0,
            "forecast_humidity": 60.0,
            "wind_speed": 0.0,
            "precipitation_chance": 0,
            "rain_intensity": 0.0,
            "cloud_cover": 0.0,
            "condition": "unknown",
            "source": "fallback",
            "timestamp": datetime.now().isoformat()
        }


# Singleton instance
weather_api = WeatherAPI()


def get_rain_forecast_minutes() -> int:
    """Convenience function to get minutes until rain."""
    forecast = weather_api.get_forecast()
    return forecast["forecast_minutes"]


if __name__ == "__main__":
    # Test the API
    print("Testing Weather API...")
    print(f"Mode: {WEATHER_API_MODE}")
    
    forecast = weather_api.get_forecast()
    print(f"Forecast: {forecast}")
    
    if forecast["forecast_minutes"] > 0:
        hours = forecast["forecast_minutes"] / 60
        print(f"[WEATHER] Rain expected in {hours:.1f} hours")
    else:
        print("[WEATHER] No rain predicted")

