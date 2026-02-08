
import os
import requests
from dotenv import load_dotenv

# Load env variables
load_dotenv()

API_KEY = os.getenv("OPENWEATHERMAP_API_KEY")
LAT = os.getenv("WEATHER_LATITUDE", "-26.2041")
LON = os.getenv("WEATHER_LONGITUDE", "28.0473")

if not API_KEY:
    print("❌ Error: OPENWEATHERMAP_API_KEY not found in .env")
    exit(1)

print(f"Testing API Key: {API_KEY[:5]}...{API_KEY[-5:]}")
print(f"Location: {LAT}, {LON}")

url = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&appid={API_KEY}&units=metric"

try:
    response = requests.get(url, timeout=10)
    data = response.json()
    
    if response.status_code == 200:
        print("\n[SUCCESS] API Connection Successful!")
        print(f"Location: {data.get('name')} ({data.get('sys', {}).get('country')})")
        print(f"Temp: {data['main']['temp']}°C")
        print(f"Weather: {data['weather'][0]['description']}")
    else:
        print(f"\n[ERROR] API Error: {response.status_code}")
        print(f"Message: {data.get('message', 'Unknown error')}")
        
except Exception as e:
    print(f"\n[ERROR] Connection Error: {e}")
