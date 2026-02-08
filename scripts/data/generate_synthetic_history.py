import json
import pandas as pd
import random
import os
from datetime import datetime
import math

# Configuration
INPUT_FILE = "data/raw_weather_history.json"
OUTPUT_FILE = "data/synthetic_training_data.csv"

# Physics Constants (Same as SimulationEnvironment)
SOIL_DRAINAGE_RATE = 0.5    # % moisture lost per hour (base)
EVAPORATION_FACTOR = 0.05   # Multiplier for temp to inc evaporation
RAIN_INTENSITY_FACTOR = 5.0 # % moisture gained per mm of rain (approx)

def generate_synthetic_data():
    print("=" * 60)
    print("SYNTHETIC HISTORY GENERATOR")
    print("=" * 60)
    
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found. Run fetch_weather_history.py first.")
        return

    with open(INPUT_FILE, "r") as f:
        weather_history = json.load(f)
        
    print(f"Loaded {len(weather_history)} weather points.")
    
    # Sort by time just in case
    weather_history.sort(key=lambda x: x['dt'])
    
    # Initialize Soil State (Start at "Average")
    current_moisture = 50.0 
    dataset = []
    
    print("\nSimulating Soil Response...")
    
    for i in range(len(weather_history)):
        data_point = weather_history[i]
        
        # 1. Get Weather Inputs
        dt = datetime.fromtimestamp(data_point['dt'])
        temp = data_point['temp']
        humidity = data_point['humidity']
        clouds = data_point.get('clouds', 0)
        rain_1h = data_point.get('rain_1h', 0)
        
        # 2. Physics Simulation Step (Time step = 3 hours per data point usually)
        # We need to ideally interpolate to 1 hour, but let's do coarse step for now
        # The history file has 3-hour steps.
        time_step_hours = 3.0
        
        # Calculate Moisture Loss (Evaporation + Drainage)
        # Hotter = More Evaporation
        evaporation = (temp * EVAPORATION_FACTOR * (100 - humidity)/100) * time_step_hours
        drainage = SOIL_DRAINAGE_RATE * time_step_hours
        total_loss = evaporation + drainage
        
        # Calculate Moisture Gain (Rain)
        # Rain volume -> Soil Moisture %
        total_gain = rain_1h * RAIN_INTENSITY_FACTOR # rain_1h is actually "rain volume in last 3h" for standard API? 
        # API says "3h": volume for last 3 hours. So we use it directly.
        
        # Update State
        moisture_before = current_moisture
        current_moisture = current_moisture - total_loss + total_gain
        
        # Clamp
        current_moisture = max(0.0, min(100.0, current_moisture))
        
        # 3. Derive "Forecast Minutes" (Simulated)
        # If it's raining NOW (rain_1h > 0), forecast = 0
        # If rain in next step? Peek ahead
        forecast_minutes = 0
        if rain_1h > 0.1:
            forecast_minutes = 0
        else:
            # Look ahead in list
            found_rain = False
            for j in range(i+1, min(i+5, len(weather_history))):
                future_point = weather_history[j]
                if future_point.get('rain_1h', 0) > 0.1:
                    # Found rain!
                    delta_hours = (future_point['dt'] - data_point['dt']) / 3600
                    forecast_minutes = int(delta_hours * 60)
                    found_rain = True
                    break
            
            if not found_rain:
                forecast_minutes = 0 # No rain soon
        
        # 4. Generate Label (Needs Watering?)
        # Simple Logic: If moisture < 30% -> YES
        needs_watering = 1 if current_moisture < 30.0 else 0
        
        # 5. Record Data Point
        # We want to format this exactly like the training data used by MLPredictor
        # Cols: ['soil_moisture', 'temperature', 'humidity', 'forecast_minutes', 'hour', 'day_of_week', 'is_daytime', 'is_hot_hours', ...]
        
        row = {
            'soil_moisture': round(moisture_before, 1), # Use state at START of interval
            'temperature': temp,
            'humidity': humidity,
            'forecast_minutes': forecast_minutes,
            'hour': dt.hour,
            'day_of_week': dt.weekday(),
            'is_daytime': 1 if 6 <= dt.hour <= 18 else 0,
            'is_hot_hours': 1 if 10 <= dt.hour <= 16 else 0,
            'moisture_change_rate': round(current_moisture - moisture_before, 2), # Change that happened
            'moisture_rolling_6': round(moisture_before, 1), # Simplified: assume steady state for history
            'temp_rolling_6': temp, # Simplified
            'needs_watering_soon': needs_watering
        }
        dataset.append(row)
        
    # Convert to DataFrame and Save
    df = pd.DataFrame(dataset)
    
    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    df.to_csv(OUTPUT_FILE, index=False)
    
    print(f"\n[DONE] Generated {len(df)} synthetic training samples.")
    print(f"       Saved to: {OUTPUT_FILE}")
    print(f"       Positive Labels (Needs Water): {df['needs_watering_soon'].sum()}")

if __name__ == "__main__":
    generate_synthetic_data()
