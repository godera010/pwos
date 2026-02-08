"""
P-WOS Simulated History Generator
---------------------------------
Generates 1 week of realistic sensor data instantly for ML training.
Includes:
- Day/Night temperature cycles
- Soil moisture decay (evaporation)
- Random rain events (moisture increase)
- Automatic watering events when moisture < 30%
"""

import sys
import os
import random
import numpy as np
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.backend.database import PWOSDatabase

def generate_history(days=90):
    print(f"[START] Generating {days} days of synthetic history...")
    db = PWOSDatabase()
    
    # Start date: 7 days ago
    end_date = datetime.now()
    current_time = end_date - timedelta(days=days)
    
    # Initial state
    moisture = 60.0
    
    records = []
    waterings = []
    
    # Simulation step (every 15 mins)
    step_minutes = 15
    steps = int((days * 24 * 60) / step_minutes)
    
    print(f"[INFO] Simulating {steps} time steps...")
    
    for i in range(steps):
        # Time progression
        current_time += timedelta(minutes=step_minutes)
        hour = current_time.hour
        
        # --- Temperature (Day/Night Cycle) ---
        # Peak at 2pm (14:00), low at 2am (02:00)
        base_temp = 25.0
        temp_swing = 5.0
        # Sin wave shifted so peak is at 14:00
        temp = base_temp + temp_swing * np.sin((hour - 8) * np.pi / 12)
        # Add random noise
        temp += random.uniform(-1.0, 1.0)
        
        # --- Humidity (Inverse of Temp) ---
        humidity = 80 - (temp - 20) * 2 + random.uniform(-5, 5)
        humidity = max(30, min(100, humidity))
        
        # --- Moisture Logic ---
        # 1. Evaporation (faster when hot)
        decay = 0.2
        if 10 <= hour <= 16:
            decay = 0.5
        moisture -= decay
        
        # 2. Rain Event (Random)
        is_raining = False
        forecast_minutes = 0
        
        # Simulate "Approaching Rain" (Forecast)
        # If rain is coming in < 4 hours, set forecast
        if random.random() < 0.05:
            forecast_minutes = random.randint(30, 240)
            
        # If forecast says rain is imminent, increase rain chance
        rain_chance = 0.01
        if 0 < forecast_minutes < 60:
            rain_chance = 0.8  # Very likely to rain if forecast says so
            
        if random.random() < rain_chance: 
            is_raining = True
            moisture += random.uniform(10, 20)
            forecast_minutes = 0 # It's raining now
        
        # 3. Automatic Watering (Simulated System)
        # Check if moisture is low (threshold 30%)
        if moisture < 30.0:
            # Trigger watering
            water_amount = 40.0
            moisture_before = moisture
            moisture += water_amount
            
            waterings.append({
                'timestamp': current_time.isoformat(),
                'duration': 30,
                'trigger': 'AUTO_SIM',
                'before': round(moisture_before, 2),
                'after': round(moisture, 2)
            })
            
        # Clamp moisture
        moisture = max(0, min(100, moisture))
        
        # Add record
        records.append({
            'timestamp': current_time.isoformat(), 
            'soil_moisture': round(moisture, 2),
            'temperature': round(temp, 2),
            'humidity': round(humidity, 2),
            'forecast_minutes': forecast_minutes,
            'device_id': 'SIM_HIST_001'
        })
        
    print(f"[INFO] Inserting {len(records)} sensor readings...")
    
    # Bulk insert for speed
    import sqlite3
    conn = sqlite3.connect(db.db_file)
    cursor = conn.cursor()
    
    # Add forecast column if not exists (quick hack for simulation)
    try:
        cursor.execute("ALTER TABLE sensor_readings ADD COLUMN forecast_minutes INTEGER DEFAULT 0")
    except:
        pass # Column likely exists

    cursor.executemany('''
        INSERT INTO sensor_readings 
        (timestamp, soil_moisture, temperature, humidity, device_id, forecast_minutes)
        VALUES (:timestamp, :soil_moisture, :temperature, :humidity, :device_id, :forecast_minutes)
    ''', records)
    
    print(f"[INFO] Inserting {len(waterings)} watering events...")
    for w in waterings:
        cursor.execute('''
            INSERT INTO watering_events 
            (timestamp, duration_seconds, trigger_type, moisture_before, moisture_after)
            VALUES (?, ?, ?, ?, ?)
        ''', (w['timestamp'], w['duration'], w['trigger'], w['before'], w['after']))
        
    conn.commit()
    conn.close()
    
    print(f"[SUCCESS] Database populated with 1 week of data!")

if __name__ == "__main__":
    days = 90
    if len(sys.argv) > 1:
        try:
            days = int(sys.argv[1])
        except ValueError:
            pass
    generate_history(days)
