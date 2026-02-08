"""
P-WOS Weather API Module
Fetches real weather data from OpenWeatherMap API.
Falls back to simulation if API is unavailable.
"""
import os
import sys
import requests
from datetime import datetime, timezone

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
    
    def __init__(self):
        self.mode = WEATHER_API_MODE
        self.api_key = OPENWEATHERMAP_API_KEY
        self.lat = WEATHER_LATITUDE
        self.lon = WEATHER_LONGITUDE
        self._cache = None
        self._cache_time = None
        self._cache_duration = 600  # 10 minutes
    
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
        # Check cache
        now = datetime.now(timezone.utc)
        if self._cache and self._cache_time:
            age = (now - self._cache_time).total_seconds()
            if age < self._cache_duration:
                return self._cache
        
        try:
            params = {
                "lat": self.lat,
                "lon": self.lon,
                "appid": self.api_key,
                "units": "metric"
            }
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            result = self._parse_forecast(data)
            self._cache = result
            self._cache_time = now
            return result
            
        except Exception as e:
            print(f"⚠️ Weather API Error: {e}")
            # Fallback to simulation on error
            return self._simulate_weather()
    
    def _parse_forecast(self, data: dict) -> dict:
        """Parse OpenWeatherMap response to find rain forecast."""
        rain_minutes = 0
        next_temp = None
        next_humidity = None
        wind_speed_kmh = 0
        precip_prob = 0
        
        # Get first forecast item (closest to now)
        if data.get("list"):
            first_item = data["list"][0]
            
            # Wind speed (convert m/s to km/h)
            if "wind" in first_item:
                wind_speed_kmh = first_item["wind"].get("speed", 0) * 3.6
                
            # Pop (Probability of Precipitation) - 0 to 1
            precip_prob = int(first_item.get("pop", 0) * 100)
        
        for forecast in data.get("list", []):
            dt = datetime.fromtimestamp(forecast["dt"], tz=timezone.utc)
            
            # Get first temperature/humidity
            if next_temp is None:
                next_temp = forecast["main"]["temp"]
                next_humidity = forecast["main"]["humidity"]
            
            # Check for rain
            weather_main = forecast["weather"][0]["main"].lower()
            if weather_main in ["rain", "drizzle", "thunderstorm"]:
                now = datetime.now(timezone.utc)
                diff_minutes = int((dt - now).total_seconds() / 60)
                if diff_minutes > 0:
                    rain_minutes = diff_minutes
                    break
                elif diff_minutes > -180: # If it rained recently (last 3 hours)
                     rain_minutes = 0 # Currently raining or just finished
        
        return {
            "rain_forecast_minutes": rain_minutes,
            "forecast_temp": next_temp or 25.0,
            "forecast_humidity": next_humidity or 60.0,
            "wind_speed_kmh": round(wind_speed_kmh, 1),
            "precipitation_chance": precip_prob,
            "source": "openweathermap",
            "timestamp": datetime.now().isoformat()
        }
    
    def _simulate_weather(self) -> dict:
        """Simulate weather data (development mode)."""
        import random
        
        hour = datetime.now().hour
        # Higher chance of rain in afternoon
        rain_prob = 0.3 if 12 <= hour <= 18 else 0.1
        
        if random.random() < rain_prob:
            rain_minutes = random.randint(60, 720)  # 1-12 hours
            precip_chance = random.randint(40, 90)
        else:
            rain_minutes = 0
            precip_chance = random.randint(0, 20)
        
        return {
            "rain_forecast_minutes": rain_minutes,
            "forecast_temp": 22.0 + random.uniform(-5, 10),
            "forecast_humidity": 60.0 + random.uniform(-20, 30),
            "wind_speed_kmh": round(random.uniform(5, 30), 1),
            "precipitation_chance": precip_chance,
            "source": "simulation",
            "timestamp": datetime.now().isoformat()
        }


# Singleton instance
weather_api = WeatherAPI()


def get_rain_forecast_minutes() -> int:
    """Convenience function to get minutes until rain."""
    forecast = weather_api.get_forecast()
    return forecast["rain_forecast_minutes"]


if __name__ == "__main__":
    # Test the API
    print("Testing Weather API...")
    print(f"Mode: {WEATHER_API_MODE}")
    
    forecast = weather_api.get_forecast()
    print(f"Forecast: {forecast}")
    
    if forecast["rain_forecast_minutes"] > 0:
        hours = forecast["rain_forecast_minutes"] / 60
        print(f"🌧️ Rain expected in {hours:.1f} hours")
    else:
        print("☀️ No rain predicted")
