import os
import requests

API_KEY = "VWR3HTFVSDMA83SY8NE2CGNNF"
DATA_DIR = "data"

def download_weather(location, filename):
    url = f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{location}/last15days"
    params = {
        "unitGroup": "metric",
        "include": "hours",
        "key": API_KEY,
        "contentType": "csv"
    }
    
    filepath = os.path.join(DATA_DIR, filename)
    print(f"Downloading weather data for {location} to {filepath}...")
    
    try:
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(response.text)
        print(f"Successfully downloaded {filepath}")
    except Exception as e:
        print(f"Failed to download weather data for {location}: {e}")

if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    # Download Harare (Mashonaland)
    download_weather("Harare, Zimbabwe", "Harare, Zimbabwe last15days.csv")
    # Download Mutare (Manicaland / Eastern Highlands)
    download_weather("Mutare, Zimbabwe", "Mutare, Zimbabwe last15days.csv")
