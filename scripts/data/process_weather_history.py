import json
import pandas as pd
import numpy as np
import os
import math
from datetime import datetime, timedelta

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INPUT_FILE = os.path.join(BASE_DIR, 'data', 'Bulawayo, Zimbabwe.txt')
OUTPUT_FILE = os.path.join(BASE_DIR, 'data', 'real_training_data.csv')

def calculate_vpd(T, RH):
    """Calculate Vapor Pressure Deficit in kPa"""
    if RH == 0: return 0
    # SVP = 0.61078 * exp((17.27 * T) / (T + 237.3))
    svp = 0.61078 * math.exp((17.27 * T) / (T + 237.3))
    avp = svp * (RH / 100.0)
    return max(0, svp - avp)

def process_history():
    print(f"Loading data from {INPUT_FILE}...")
    
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)
        
    records = []
    
    # Flatten structure
    print("Processing hourly records...")
    for day in data.get('days', []):
        for hour_data in day.get('hours', []):
            # Combine date and time
            dt_str = f"{day['datetime']} {hour_data['datetime']}"
            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            
            records.append({
                'datetime': dt,
                'temperature': (hour_data.get('temp', 0) - 32) * 5/9, # Convert F to C usually? API seems to have 'temp' in F based on values (60s-80s)
                # Note: The raw data example shows temp ~60-80. Bulawayo is warm but that looks like Fahrenheit.
                # Let's verify units. 'units' not explicitly in file snippet but values like 83.9F = 28C makes sense for Zimbabwe. 
                # If they were C, 83C is impossible. So they are Fahrenheit.
                
                'humidity': hour_data.get('humidity', 0),
                'precip': hour_data.get('precip', 0), # inches usually in US units
                'windspeed': hour_data.get('windspeed', 0) * 1.60934, # mph to kmh
                'precipprob': hour_data.get('precipprob', 0),
                'conditions': hour_data.get('conditions', '')
            })
            
    df = pd.DataFrame(records)
    print(f"Found {len(df)} hourly records.")
    
    # Sort by time
    df = df.sort_values('datetime').reset_index(drop=True)
    
    # --- SIMULATE SOIL MOISTURE ---
    # We lack real soil sensor data for this history, so we simulate it 
    # based on the weather physics to create a "Teacher" dataset.
    
    moisture = 50.0  # Start at 50%
    moisture_history = []
    
    print("Simulating soil physics...")
    for i, row in df.iterrows():
        # 1. Evaporation (drying)
        # Higher temp, lower humidity, high wind = faster drying
        vpd = calculate_vpd(row['temperature'], row['humidity'])
        
        # Base decay (Increased to force drying in short 15-day window)
        decay = 0.5 
        if row['temperature'] > 25: decay += 0.5
        if vpd > 1.0: decay += 0.5
        if row['windspeed'] > 10: decay += 0.3
        
        # Night time decay is slower
        if row['datetime'].hour < 6 or row['datetime'].hour > 18:
            decay *= 0.2
            
        moisture -= decay
        
        # 2. Rain (wetting)
        # precip in json is likely inches if temp is F. 1 inch rain is A LOT for soil.
        # Let's assume precip > 0 means moisture increases.
        if row['precip'] > 0:
            # Simple logic: 0.1 inch rain = +10% moisture (capped at 100)
            wetting = row['precip'] * 100 
            moisture += wetting
            
        # Clamp
        moisture = max(0, min(100, moisture))
        moisture_history.append(moisture)
    
    df['soil_moisture'] = moisture_history
    
    # --- GENERATE FEATURES ---
    print("Generating ML features...")
    df['hour'] = df['datetime'].dt.hour
    df['day_of_week'] = df['datetime'].dt.dayofweek
    df['is_daytime'] = df['hour'].apply(lambda x: 1 if 6 <= x <= 18 else 0)
    df['is_hot_hours'] = df['hour'].apply(lambda x: 1 if 10 <= x <= 16 else 0)
    
    # Rolling stats
    df['moisture_rolling_6'] = df['soil_moisture'].rolling(window=6, min_periods=1).mean()
    df['temp_rolling_6'] = df['temperature'].rolling(window=6, min_periods=1).mean()
    df['moisture_change_rate'] = df['soil_moisture'].diff().fillna(0)
    
    # Forecast minutes (Look ahead)
    # How many minutes until rain?
    # For training, we can peek ahead.
    rain_lookahead_steps = 24  # Look ahead 24 hours
    forecast_minutes_list = []
    
    for i in range(len(df)):
        minutes_until_rain = 0
        found_rain = False
        
        # Look ahead
        for j in range(1, rain_lookahead_steps + 1):
            if i + j < len(df):
                if df.iloc[i+j]['precip'] > 0 or df.iloc[i+j]['precipprob'] > 50:
                    minutes_until_rain = j * 60
                    found_rain = True
                    break
        
        forecast_minutes_list.append(minutes_until_rain)
        
    df['forecast_minutes'] = forecast_minutes_list
    
    # --- GENERATE LABELS ---
    # Target: "needs_watering_soon"
    # Logic: If moisture drops below 30% in next 4 hours AND no rain coming, we should have watered.
    
    labels = []
    for i in range(len(df)):
        needs_water = 0
        current_moisture = df.iloc[i]['soil_moisture']
        
        # If currently dry, obviously yes
        if current_moisture < 30:
            needs_water = 1
        
        # Or if it gets critically dry soon
        elif i + 4 < len(df):
            future_moisture = df.iloc[i+4]['soil_moisture']
            if future_moisture < 30:
                needs_water = 1
                
        # BUT if rain is coming, don't water
        if df.iloc[i]['forecast_minutes'] > 0 and df.iloc[i]['forecast_minutes'] < 180:
            needs_water = 0
            
        labels.append(needs_water)
        
    df['needs_watering_soon'] = labels
    
    # Select columns for final CSV
    final_cols = [
        'soil_moisture', 'temperature', 'humidity', 'forecast_minutes',
        'hour', 'day_of_week', 'is_daytime', 'is_hot_hours',
        'moisture_change_rate', 'moisture_rolling_6', 'temp_rolling_6',
        'needs_watering_soon'
    ]
    
    # Filter valid rows (drop NaNs from rolling)
    final_df = df[final_cols].dropna()
    
    print(f"Saving {len(final_df)} training samples to {OUTPUT_FILE}...")
    print(f"Class Distribution: {final_df['needs_watering_soon'].value_counts().to_dict()}")
    final_df.to_csv(OUTPUT_FILE, index=False)
    print("Done.")

if __name__ == "__main__":
    process_history()
