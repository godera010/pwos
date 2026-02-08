"""
Data Analysis Script
---------------------
Loads sensor data from SQLite into Pandas for analysis.
"""

import sys
import os
import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.backend.database import PWOSDatabase

def analyze_data():
    db = PWOSDatabase()
    print(f"[INFO] Connecting to database: {db.db_file}")
    
    conn = sqlite3.connect(db.db_file)
    query = "SELECT * FROM sensor_readings ORDER BY timestamp ASC"
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    # Convert timestamp to datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    print("\n" + "="*50)
    print("DATASET OVERVIEW")
    print("="*50)
    print(f"Total Records: {len(df)}")
    print(f"Date Range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print("\nSample Data:")
    print(df.head())
    
    print("\n" + "="*50)
    print("STATISTICS")
    print("="*50)
    print(df[['soil_moisture', 'temperature', 'humidity']].describe())
    
    print("\n" + "="*50)
    print("CORRELATION MATRIX")
    print("="*50)
    print(df[['soil_moisture', 'temperature', 'humidity']].corr())
    
    # Check watering events
    conn = sqlite3.connect(db.db_file)
    water_df = pd.read_sql_query("SELECT * FROM watering_events", conn)
    conn.close()
    
    print("\n" + "="*50)
    print("WATERING EVENTS")
    print("="*50)
    print(f"Total Events: {len(water_df)}")
    if not water_df.empty:
        print("\nLast 5 Events:")
        print(water_df.tail())
    else:
        print("No watering events recorded.")
        
    # Analyze dryness duration
    # Simple check: how often is moisture < 30%?
    low_moisture = df[df['soil_moisture'] < 30]
    print(f"\nCRITICAL MOISTURE LEVELS (<30%): {len(low_moisture)} occurrences")

if __name__ == "__main__":
    analyze_data()
