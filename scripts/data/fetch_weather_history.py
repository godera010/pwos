import os
import sys
import json
import requests
import time
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Configuration
API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
LAT = float(os.getenv("WEATHER_LATITUDE", "-26.2041"))
LON = float(os.getenv("WEATHER_LONGITUDE", "28.0473"))
OUTPUT_FILE = "data/raw_weather_history.json"
DAYS_TO_FETCH = 5 

def fetch_forecast_as_data():
    """Fetch 5-day forecast and save as 'history' for training"""
    url = "https://api.openweathermap.org/data/2.5/forecast"
    params = {
        "lat": LAT,
        "lon": LON,
        "appid": API_KEY,
        "units": "metric"
    }
    
    print("\nFetching 5-Day / 3-Hour Forecast...")
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Transform forecast list into our "history" format
        # Each item in "list" is a 3-hour forecast
        output_data = []
        if "list" in data:
            for item in data["list"]:
                 # Structure matches what simulation needs
                 # We need: dt, temp, humidity, clouds, rain volume (if any)
                 
                 # Basic fields
                 record = {
                     "dt": item["dt"],
                     "temp": item["main"]["temp"],
                     "humidity": item["main"]["humidity"],
                     "clouds": item["clouds"]["all"],
                     "weather": item["weather"]
                 }
                 
                 # Rain
                 if "rain" in item:
                     record["rain_1h"] = item["rain"].get("3h", 0) / 3 # Approximation
                 
                 output_data.append(record)
                 
        # Save
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, "w") as f:
            json.dump(output_data, f, indent=2)
            
        print(f"\n! Success! Saved {len(output_data)} forecast points to {OUTPUT_FILE}")
        print("   We can now use this to generate synthetic training data.")
        
    except Exception as e:
        print(f"X Failed to fetch forecast: {e}")

def fetch_weather_history():
    print(f"P-WOS Weather History Fetcher")
    print(f"--------------------------------")
    print(f"Location: {LAT}, {LON}")
    print(f"API Key:  {API_KEY[:4]}...{API_KEY[-4:] if API_KEY else 'None'}")
    
    if not API_KEY:
        print("X Error: OPENWEATHERMAP_API_KEY not found in environment.")
        return

    history_data = []
    
    # OpenWeatherMap One Call 3.0 API (Time Machine)
    # https://api.openweathermap.org/data/3.0/onecall/timemachine
    base_url = "https://api.openweathermap.org/data/3.0/onecall/timemachine"
    
    # API usually updates somewhat real-time, but 'history' is safer for past days)
    now = datetime.now(timezone.utc)
    
    print(f"\nAttempting to fetch last {DAYS_TO_FETCH} days via One Call 3.0...")
    
    # ... logic for One Call ...
    # If 401, switch to Standard Forecast
    
    try:
        # Test one call first
        test_dt = int(now.timestamp())
        params = {"lat": LAT, "lon": LON, "dt": test_dt, "appid": API_KEY}
        resp = requests.get(base_url, params=params, timeout=5)
        
        if resp.status_code == 401:
             print("! One Call 3.0 not available (401). Falling back to 5-Day Forecast.")
             print("   Note: This only gives FUTURE forecast data, but we will use it")
             print("   to generate a synthetic dataset effectively.")
             fetch_forecast_as_data()
             return
             
    except Exception as e:
        print(f"Error checking One Call availability: {e}")
        pass

        
    # If we are here, One Call might work, proceed with history loop...
    # Iterate backwards from yesterday
    total_calls = 0
    
    for i in range(DAYS_TO_FETCH):
        day_offset = i + 1
        target_date = now - timedelta(days=day_offset)
        print(f"   Processing {target_date.strftime('%Y-%m-%d')}...")
        
        for hour in range(0, 24, 3): # 0, 3, 6, 9, 12, 15, 18, 21
            dt = target_date.replace(hour=hour, minute=0, second=0, microsecond=0)
            timestamp = int(dt.timestamp())
            
            params = {
                "lat": LAT,
                "lon": LON,
                "dt": timestamp,
                "appid": API_KEY,
                "units": "metric"
            }
            
            try:
                response = requests.get(base_url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                # Extract relevant part
                if "data" in data and len(data["data"]) > 0:
                     point = data["data"][0]
                     history_data.append(point)
                     total_calls += 1
                
                # Polite delay
                time.sleep(0.2)
                
            except Exception as e:
                print(f"      ! Failed to fetch {dt}: {e}")
    
    # Save
    if history_data:
        os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
        with open(OUTPUT_FILE, "w") as f:
            json.dump(history_data, f, indent=2)
        print(f"\n! Success! Saved {len(history_data)} data points to {OUTPUT_FILE}")
        print(f"   Total API calls: {total_calls}")
    else:
        print("\nX No data collected.")

if __name__ == "__main__":
    fetch_weather_history()
